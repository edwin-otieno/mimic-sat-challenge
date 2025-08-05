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

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    console.log(`Cleaning up test states older than: ${sevenDaysAgo.toISOString()}`)

    // Delete test states older than 7 days
    const { data: deletedStates, error: deleteError } = await supabaseClient
      .from('test_states')
      .delete()
      .lt('updated_at', sevenDaysAgo.toISOString())
      .select('id, user_id, test_permalink, updated_at')

    if (deleteError) {
      console.error('Error deleting old test states:', deleteError)
      throw deleteError
    }

    const deletedCount = deletedStates?.length || 0

    console.log(`Successfully deleted ${deletedCount} old test states`)

    return new Response(
      JSON.stringify({
        message: 'Test states cleanup completed',
        deletedCount,
        cutoffDate: sevenDaysAgo.toISOString(),
        deletedStates: deletedStates || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in cleanupOldTestStates:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 