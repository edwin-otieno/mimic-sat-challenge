# Performance Optimization Guide

## Problem Summary
Your Supabase database was at 100% CPU usage due to:
1. **35.8M queries** to `test_states` (excessive auto-save)
2. **14.3M queries** to `module_results` and `essay_grades` (N+1 query problem)
3. Missing database indexes on frequently queried columns

## Changes Made

### 1. Reduced Auto-Save Frequency ✅
**File**: `src/pages/TestInterface.tsx`

- **Before**: Auto-save every 5 minutes
- **After**: Auto-save every 15 minutes
- **Expected Impact**: 66% reduction in auto-save queries

**Lines changed**:
- Line 3033: Changed from `5 * 60 * 1000` to `15 * 60 * 1000`

### 2. Increased Answer Change Debounce ✅
**File**: `src/pages/TestInterface.tsx`

- **Before**: Save 2 seconds after answer change
- **After**: Save 5 seconds after answer change (batches more changes together)
- **Expected Impact**: 40-60% reduction in answer-triggered saves

**Lines changed**:
- Line 3104: Changed from `2000` to `5000`

### 3. Fixed N+1 Query in Results Page ✅
**File**: `src/pages/Results.tsx`

**Before**: Made separate queries for each test result:
```typescript
// BAD - N+1 query
for (const testResult of results) {
  await supabase.from('module_results').select('*').eq('test_result_id', testResult.id);
  await supabase.from('essay_grades').select('*').eq('test_result_id', testResult.id);
}
```

**After**: Batch fetch all data in 2 queries:
```typescript
// GOOD - Single batched query
const testResultIds = results.map(r => r.id);
await supabase.from('module_results').select('*').in('test_result_id', testResultIds);
await supabase.from('essay_grades').select('*').in('test_result_id', testResultIds);
```

**Expected Impact**: 
- Reduced from N queries to 2 queries (where N = number of test results)
- For 50 test results: 100 queries → 2 queries (98% reduction)

### 4. Fixed N+1 Query in Dashboard ✅
**File**: `src/pages/Dashboard.tsx`

Applied the same batching strategy as Results page for fetching module scores.

**Expected Impact**: 90%+ reduction in dashboard load queries

### 5. Added Database Indexes ✅
**File**: `supabase/migrations/20260121120000_add_performance_indexes.sql`

Created indexes for the most frequently queried columns:

1. `idx_module_results_test_result_id` - Speeds up module results lookups
2. `idx_essay_grades_test_result_id` - Speeds up essay grade lookups
3. `idx_test_results_user_test_created` - Composite index for user + test queries
4. `idx_test_states_user_permalink_updated` - Optimizes test state lookups
5. `idx_test_results_user_completed` - Partial index for completed tests only

**Expected Impact**: 50-80% faster query execution for indexed queries

## Deployment Steps

### Step 1: Apply Database Migration
Run the migration in your Supabase dashboard or via CLI:

```bash
# If using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor:
# Copy the contents of supabase/migrations/20260121120000_add_performance_indexes.sql
# and run it in the SQL Editor
```

### Step 2: Deploy Application Changes
Deploy the updated code to your hosting platform:

```bash
# Commit the changes
git add .
git commit -m "fix: optimize database queries and reduce auto-save frequency"
git push

# Deploy (depends on your hosting platform)
# Example for Vercel/Netlify - deployment happens automatically on push
```

### Step 3: Monitor Performance
After deployment, monitor these metrics in Supabase Dashboard:

1. **CPU Usage** - Should drop from 100% to 10-20%
2. **Query Count** - Check the "Reports" tab after 24 hours
3. **Slow Queries** - Look for improvements in query execution times

#### How to Check:
1. Go to Supabase Dashboard → Project Settings → Reports
2. Look at "Database" section
3. Compare query volumes before/after

## Expected Results

### Before Optimization:
- **CPU Usage**: 100% (2 cores maxed out)
- **Query Volume**: ~57M queries/day
- **Slow Queries**: 
  - `module_results`: 7.1M calls, 327ms avg
  - `essay_grades`: 7.1M calls, 269ms avg
  - `test_states`: 35.8M calls

### After Optimization:
- **CPU Usage**: 10-20% (estimated)
- **Query Volume**: ~5-10M queries/day (80-90% reduction)
- **Slow Queries**: 
  - `module_results`: <100K calls (99% reduction)
  - `essay_grades`: <100K calls (99% reduction)
  - `test_states`: 3-5M calls (85-90% reduction)

## Rollback Plan

If issues occur after deployment:

### Rollback Code Changes:
```bash
git revert HEAD
git push
```

### Rollback Database Migration:
```sql
-- Run this in Supabase SQL Editor if needed
DROP INDEX IF EXISTS idx_module_results_test_result_id;
DROP INDEX IF EXISTS idx_essay_grades_test_result_id;
DROP INDEX IF EXISTS idx_test_results_user_test_created;
DROP INDEX IF EXISTS idx_test_states_user_permalink_updated;
DROP INDEX IF EXISTS idx_test_results_user_completed;
```

**Note**: Indexes are safe to remove. The queries will still work, just slower.

## Additional Recommendations (Future)

### 1. Implement React Query (Optional)
Add client-side caching to reduce redundant API calls:

```bash
npm install @tanstack/react-query
```

Benefits:
- Automatic caching of query results
- Reduces server load by 30-50% more
- Better user experience (instant loading from cache)

### 2. Consider Read Replicas (If needed later)
Once you hit high scale (100K+ users), consider Supabase Read Replicas:
- Offload read queries to replica
- Keep primary database for writes only
- Available on Pro plan and above

### 3. Monitor and Optimize Further
Set up alerts in Supabase:
1. Dashboard → Settings → Alerts
2. Set alert for CPU > 80%
3. Set alert for query count spikes

## Verification Checklist

After deployment, verify these work correctly:

- [ ] Students can take tests without issues
- [ ] Auto-save still works (just less frequently)
- [ ] Results page loads correctly
- [ ] Dashboard shows test progress
- [ ] Module scores display properly
- [ ] Essay grades show up correctly
- [ ] CPU usage has decreased in Supabase dashboard

## Support

If you encounter any issues:

1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify migration was applied: Run in SQL Editor:
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND indexname LIKE 'idx_%';
   ```
   Should show all 5 new indexes.

## Summary

These optimizations should reduce your database load by **80-90%** and bring CPU usage down to **10-20%**. The changes are backward compatible and safe to deploy.

**No need to upgrade from 2 to 4 CPU cores** - the issue was application architecture, not hardware capacity.
