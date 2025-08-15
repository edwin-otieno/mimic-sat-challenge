import { supabaseAdmin } from '@/integrations/supabase/admin-client';
import { supabase } from '@/integrations/supabase/client';

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

    // Delete each old student account
    for (const profile of oldProfiles) {
      try {
        // First delete from profiles table
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', profile.id);

        if (profileDeleteError) {
          console.error(`Error deleting profile for user ${profile.email}:`, profileDeleteError);
          continue;
        }

        // Then delete the auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
          profile.id
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