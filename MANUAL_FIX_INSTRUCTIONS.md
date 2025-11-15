# Manual Fix for Teacher Role Issue

## Problem
The `teacher` role is not available in the `user_role` enum in the remote Supabase database, causing the error:
```
invalid input value for enum user_role: "teacher"
```

## Solution Options

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/hdnaqkziirehubztmueh
2. Navigate to **SQL Editor**
3. Run this SQL command:
```sql
ALTER TYPE user_role ADD VALUE 'teacher';
```
4. Click **Run** to execute the command

### Option 2: Direct Database Connection
If you have direct database access, connect to your PostgreSQL database and run:
```sql
ALTER TYPE user_role ADD VALUE 'teacher';
```

### Option 3: Supabase CLI (Alternative)
Try running this command from your project directory:
```bash
npx supabase db push --include-all
```

## Verification
After applying the fix:
1. Go to the Admin Panel in your application
2. Try to assign a user the "Teacher" role
3. The assignment should now work without errors

## Current Status
- ✅ Application code is ready for teacher role
- ✅ Error handling is in place
- ❌ Database enum needs to be updated
- ⏳ Teacher role is temporarily disabled in UI

## Files Modified
- `src/components/admin/UserManagement.tsx` - Added error handling and disabled teacher option
- `src/pages/AdminPanel.tsx` - Added debug component
- `src/components/admin/DebugEnum.tsx` - Added debug functionality
- Multiple migration files created (but not applied to remote DB)

## Next Steps
1. Apply the database fix using one of the options above
2. Re-enable the teacher role in the UI by removing the `disabled` attribute
3. Test the teacher role assignment functionality
