import { supabaseAdmin } from '@/integrations/supabase/admin-client';

/**
 * Deletes student accounts that are more than 6 months old
 * This function should be called by a scheduled task
 */
export const cleanupOldStudentAccounts = async () => {
  try {
    // Calculate the date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // First, get all student profiles that are older than 6 months
    const { data: oldProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('role', 'student')
      .lt('created_at', sixMonthsAgo.toISOString());

    if (profileError) {
      console.error('Error fetching old profiles:', profileError);
      return;
    }

    if (!oldProfiles || oldProfiles.length === 0) {
      console.log('No old student accounts found');
      return;
    }

    console.log(`Found ${oldProfiles.length} old student accounts to delete`);

    // Delete each old student account and ALL associated data (test_results -> module_results, essay_grades; test_states; profile; auth)
    for (const profile of oldProfiles) {
      try {
        // Double-check that this is a student account (safety check)
        if (profile.role !== 'student') {
          console.warn(`Skipping deletion of non-student account: ${profile.email} (role: ${profile.role})`);
          continue;
        }

        const userId = profile.id;

        // 1) Delete test_results for this user first (CASCADE deletes module_results and essay_grades for those results)
        const { error: testResultsDeleteError } = await supabaseAdmin
          .from('test_results')
          .delete()
          .eq('user_id', userId);

        if (testResultsDeleteError) {
          console.error(`Error deleting test_results for user ${profile.email}:`, testResultsDeleteError);
          continue;
        }

        // 2) Delete test_states for this user
        const { error: testStatesDeleteError } = await supabaseAdmin
          .from('test_states')
          .delete()
          .eq('user_id', userId);

        if (testStatesDeleteError) {
          console.error(`Error deleting test_states for user ${profile.email}:`, testStatesDeleteError);
          continue;
        }

        // 3) Delete from profiles table
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileDeleteError) {
          console.error(`Error deleting profile for user ${profile.email}:`, profileDeleteError);
          continue;
        }

        // 4) Finally delete the auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

        if (authDeleteError) {
          console.error(`Error deleting auth user ${profile.email}:`, authDeleteError);
          continue;
        }

        console.log(`Successfully deleted old student account: ${profile.email}`);
      } catch (error) {
        console.error(`Error processing deletion for user ${profile.email}:`, error);
      }
    }

    console.log('Finished cleaning up old student accounts');
  } catch (error) {
    console.error('Error in cleanupOldStudentAccounts:', error);
  }
}; 