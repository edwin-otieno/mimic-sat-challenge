# Egress Quota Optimization Guide

## Current Issue
You've exceeded the 5GB egress quota, which is preventing migrations from working.

## Immediate Actions to Reduce Egress

### 1. Check Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **Settings** → **Usage**
- Look at the **Bandwidth** section to see what's consuming egress

### 2. Common Egress Sources

#### Database Queries
- **Large SELECT queries** without LIMIT clauses
- **Fetching all records** instead of paginated results
- **Unnecessary data** in SELECT statements

#### File Storage
- **Large file downloads** from Supabase Storage
- **Image/video files** being served through your app

#### API Responses
- **Large JSON responses** from your API endpoints
- **Unfiltered data** being sent to frontend

### 3. Quick Fixes

#### Database Query Optimization
```sql
-- Instead of:
SELECT * FROM profiles;

-- Use:
SELECT id, email, role FROM profiles LIMIT 100;
```

#### Check Your Application
Look for:
- Large data fetching in components
- Unnecessary API calls
- Large file uploads/downloads
- Debug queries that fetch too much data

### 4. Immediate Steps

1. **Check the Debug Component**: The DebugEnum component we added might be making large queries
2. **Review Recent Activity**: Check what data your app has been fetching recently
3. **Optimize Queries**: Add LIMIT clauses to large queries
4. **Check Storage**: Look for large files in Supabase Storage

### 5. Wait for Quota Reset
- Egress quotas typically reset monthly
- Check when your quota resets in the Supabase dashboard

## After Reducing Egress

Once you're below the quota:
1. Try the migration again: `npx supabase db push --include-all`
2. Or use the Supabase dashboard SQL editor to add the teacher role
3. Re-enable the teacher role in the UI
