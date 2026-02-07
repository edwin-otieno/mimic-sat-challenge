import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate the date 6 months ago
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Get all student profiles that are older than 6 months
    const { data: oldProfiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('role', 'student')
      .lt('created_at', sixMonthsAgo.toISOString())

    if (profileError) {
      throw profileError
    }

    if (!oldProfiles || oldProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No old student accounts found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deletedAccounts = []
    const errors = []

    // Delete each old student account and ALL associated data (test_results -> module_results, essay_grades; test_states; profile; auth)
    for (const profile of oldProfiles) {
      try {
        // Double-check that this is a student account (safety check)
        if (profile.role !== 'student') {
          errors.push(`Skipping deletion of non-student account: ${profile.email} (role: ${profile.role})`)
          continue
        }

        const userId = profile.id

        // 1) Delete test_results for this user first (CASCADE deletes module_results and essay_grades for those results)
        const { error: testResultsDeleteError } = await supabaseClient
          .from('test_results')
          .delete()
          .eq('user_id', userId)

        if (testResultsDeleteError) {
          errors.push(`Error deleting test_results for user ${profile.email}: ${testResultsDeleteError.message}`)
          continue
        }

        // 2) Delete test_states for this user
        const { error: testStatesDeleteError } = await supabaseClient
          .from('test_states')
          .delete()
          .eq('user_id', userId)

        if (testStatesDeleteError) {
          errors.push(`Error deleting test_states for user ${profile.email}: ${testStatesDeleteError.message}`)
          continue
        }

        // 3) Delete from profiles table
        const { error: profileDeleteError } = await supabaseClient
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (profileDeleteError) {
          errors.push(`Error deleting profile for user ${profile.email}: ${profileDeleteError.message}`)
          continue
        }

        // 4) Finally delete the auth user
        const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(
          userId
        )

        if (authDeleteError) {
          errors.push(`Error deleting auth user ${profile.email}: ${authDeleteError.message}`)
          continue
        }

        deletedAccounts.push(profile.email)
      } catch (error) {
        errors.push(`Error processing deletion for user ${profile.email}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Cleanup completed',
        deletedAccounts,
        errors,
        totalDeleted: deletedAccounts.length,
        totalErrors: errors.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 