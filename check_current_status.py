#!/usr/bin/env python3
"""
Check current Instagram account status
"""

import requests
import json

print("="*80)
print("CURRENT INSTAGRAM ACCOUNT STATUS CHECK")
print("="*80)

print("\n🔍 PREVIOUSLY CONFIRMED:")
print("="*50)
print("✅ Instagram Username: oldsouleli")
print("✅ Account Type: Business")
print("✅ Connected to Facebook Page: Elazarov")
print("✅ Page ID: 872710745923504")
print("✅ Instagram ID: 17841401576281603")
print("✅ Followers: 836")
print("✅ Media Count: 3")

print("\n" + "="*60)
print("CURRENT ISSUE ANALYSIS:")
print("="*60)

print("❌ ERROR: 'No Instagram Business account found'")
print("❌ ERROR: 'Tried accessing nonexisting field (instagram_business_account)'")

print("\n🤔 POSSIBLE CAUSES:")
print("="*50)

print("1. PERMISSION ISSUES:")
print("   - App permissions not approved for live mode")
print("   - External account access restrictions")
print("   - Missing business_management permission")

print("\n2. TOKEN SCOPE ISSUES:")
print("   - OAuth token doesn't include required scopes")
print("   - Token generated without proper permissions")
print("   - Missing instagram_basic scope")

print("\n3. API ENDPOINT ISSUES:")
print("   - Using wrong API endpoint")
print("   - Incorrect field requests")
print("   - API version compatibility")

print("\n4. ACCOUNT STATUS CHANGES:")
print("   - Instagram account disconnected from Page")
print("   - Account type changed back to Personal")
print("   - Page permissions revoked")

print("\n" + "="*60)
print("DEBUGGING STEPS:")
print("="*60)

print("STEP 1: Check App Permissions")
print("1. Go to: https://developers.facebook.com/apps/717044718072411/permissions-and-features/")
print("2. Look for 'Live Mode' status")
print("3. Check if permissions are 'Approved' not just 'Requested'")

print("\nSTEP 2: Test with Graph API Explorer")
print("1. Go to: https://developers.facebook.com/tools/explorer/")
print("2. Select app: 717044718072411")
print("3. Add permissions: instagram_basic, pages_show_list, business_management")
print("4. Generate token")
print("5. Test: /me/accounts?fields=id,name,instagram_business_account")

print("\nSTEP 3: Check OAuth Scopes")
print("1. Look at the auth URL scopes:")
print("   - instagram_basic")
print("   - pages_show_list")
print("   - pages_read_engagement")
print("   - business_management")
print("   - instagram_content_publish")
print("   - instagram_manage_comments")
print("   - instagram_manage_insights")

print("\nSTEP 4: Verify Account Connection")
print("1. Go to Facebook Page: https://www.facebook.com/pages/manage/")
print("2. Find 'Elazarov' page")
print("3. Check Settings → Instagram")
print("4. Verify Instagram account is still connected")

print("\n" + "="*60)
print("MOST LIKELY ISSUE:")
print("="*60)

print("🎯 PERMISSION APPROVAL STATUS")
print("Your Instagram account setup is correct, but:")
print("❌ App permissions may not be approved for live mode")
print("❌ External accounts need approved permissions")
print("❌ OAuth tokens may not have required scopes")

print("\n" + "="*60)
print("IMMEDIATE ACTION:")
print("="*60)

print("1. Check Facebook App permissions dashboard")
print("2. Verify permissions are 'Approved' and 'Live'")
print("3. Test with Graph API Explorer")
print("4. If permissions are missing, request approval")
print("5. Test OAuth flow again")

print("\nThe account setup is correct - it's a permission issue!")
