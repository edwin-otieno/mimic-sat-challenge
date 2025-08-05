# Test States Cleanup Function

This function automatically cleans up old test states from the database to prevent storage bloat and maintain performance.

## Purpose

- Removes test states that are older than 7 days
- Runs daily at midnight UTC via cron job
- Helps maintain database performance and reduce storage costs

## How it works

1. Calculates a date 7 days in the past
2. Deletes all test states with `updated_at` timestamp older than 7 days
3. Returns a summary of deleted records

## Schedule

- **Frequency**: Daily
- **Time**: 00:00 UTC (midnight)
- **Timezone**: UTC

## Database Impact

- Uses the `updated_at` column to determine age
- Requires an index on `updated_at` for optimal performance
- Only affects test states, not user accounts or other data

## Monitoring

The function logs:
- Number of records deleted
- Cutoff date used
- Any errors encountered

## Manual Execution

You can manually trigger this cleanup by calling the function endpoint:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-old-test-states
``` 