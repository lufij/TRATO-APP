-- =====================================================
-- CLEANUP ORPHANED USERS - TRATO
-- =====================================================
-- This script helps clean up users who exist in auth.users but not in public.users
-- Use this if you have users stuck in the "User authenticated but profile not found" state

-- =====================================================
-- STEP 1: IDENTIFY ORPHANED USERS
-- =====================================================

-- Show orphaned users (authenticated but no profile)
SELECT 
  'ORPHANED USERS FOUND' as status,
  au.id,
  au.email,
  au.created_at as auth_created_at,
  CASE 
    WHEN pu.id IS NULL THEN '❌ MISSING PROFILE'
    ELSE '✅ HAS PROFILE'
  END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL  -- Only confirmed users
ORDER BY au.created_at DESC;

-- Count orphaned users
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(pu.id) as users_with_profiles,
  (COUNT(*) - COUNT(pu.id)) as orphaned_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL;

-- =====================================================
-- STEP 2: CLEANUP OPTIONS
-- =====================================================

-- OPTION A: Delete orphaned auth users (DESTRUCTIVE - use with caution)
-- Uncomment the following lines ONLY if you want to delete orphaned users completely
/*
DELETE FROM auth.users 
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE au.email_confirmed_at IS NOT NULL 
    AND pu.id IS NULL
    AND au.created_at < NOW() - INTERVAL '1 hour'  -- Only delete users older than 1 hour
);
*/

-- OPTION B: Show emails of orphaned users for manual recovery
SELECT 
  'EMAILS FOR MANUAL RECOVERY' as info,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL 
  AND pu.id IS NULL
ORDER BY au.created_at DESC;

-- =====================================================
-- STEP 3: PREVENTION - ENSURE TRIGGERS ARE WORKING
-- =====================================================

-- Check if we have proper triggers for user creation
SELECT 
  'TRIGGER STATUS' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('users', 'sellers', 'drivers');

-- =====================================================
-- STEP 4: MANUAL PROFILE CREATION (if needed)
-- =====================================================

-- If you want to manually create a profile for a specific orphaned user,
-- replace the UUID and email below with the actual values:
/*
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',  -- Replace with actual user ID
  'user@example.com',                      -- Replace with actual email
  'Usuario Recuperado',                    -- Default name
  'comprador',                            -- Default role
  NOW(),
  NOW()
);
*/

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Verify cleanup results
SELECT 
  'CLEANUP VERIFICATION' as status,
  COUNT(*) as total_confirmed_auth_users,
  COUNT(pu.id) as users_with_complete_profiles,
  (COUNT(*) - COUNT(pu.id)) as remaining_orphaned_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL;

-- Show any remaining issues
SELECT 
  'REMAINING ISSUES' as status,
  au.email,
  au.created_at,
  'Missing profile in public.users table' as issue
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL 
  AND pu.id IS NULL;

-- =====================================================
-- STEP 6: RECOMMENDATIONS
-- =====================================================

SELECT '📋 RECOMMENDATIONS:' as recommendations;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE au.email_confirmed_at IS NOT NULL AND pu.id IS NULL
    ) = 0 
    THEN '✅ No orphaned users found. Everything looks good!'
    WHEN (
      SELECT COUNT(*) 
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE au.email_confirmed_at IS NOT NULL AND pu.id IS NULL
    ) <= 5 
    THEN '⚠️ Few orphaned users found. Use ProfileRecovery component to let them complete their profiles.'
    ELSE '🚨 Many orphaned users found. Consider running cleanup or investigating the registration process.'
  END as recommendation;

SELECT '1. Users can use the ProfileRecovery screen to complete their profiles' as step_1;
SELECT '2. Or you can manually delete orphaned auth users using the cleanup option above' as step_2;
SELECT '3. Make sure your registration flow is working properly to prevent future orphans' as step_3;

-- =====================================================
-- FINAL STATUS
-- =====================================================

SELECT '✅ ORPHANED USERS CLEANUP ANALYSIS COMPLETE' as final_status;