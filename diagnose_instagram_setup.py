#!/usr/bin/env python3
"""
Diagnose Instagram Business account setup
"""

import requests
import json

print("="*80)
print("INSTAGRAM BUSINESS ACCOUNT DIAGNOSIS")
print("="*80)

print("\n🔍 ISSUES IDENTIFIED:")
print("="*50)

print("ISSUE 1: OAuth Code Expired")
print("❌ Error: 'This authorization code has expired'")
print("✅ Solution: Use fresh OAuth codes immediately")
print("✅ Fix Applied: Added grant_type parameter")

print("\nISSUE 2: Instagram Not Connected to Facebook Page")
print("❌ Error: 'No Instagram Business account found'")
print("❌ Error: 'Tried accessing nonexisting field (instagram_business_account)'")
print("✅ Solution: Connect Instagram Business account to Facebook Page")

print("\n" + "="*60)
print("STEP-BY-STEP FIX:")
print("="*60)

print("STEP 1: Verify Instagram Account Type")
print("1. Go to Instagram app on your phone")
print("2. Go to Settings → Account → Account type")
print("3. Make sure it says 'Business' or 'Creator'")
print("4. If it says 'Personal', switch to Business")

print("\nSTEP 2: Connect Instagram to Facebook Page")
print("1. Go to your Facebook Page: https://www.facebook.com/pages/manage/")
print("2. Find your page: 'Elazarov'")
print("3. Go to Page Settings → Instagram")
print("4. Click 'Connect Account'")
print("5. Enter your Instagram credentials")
print("6. Grant all permissions")

print("\nSTEP 3: Verify Connection")
print("1. Go to Facebook Page Settings → Instagram")
print("2. You should see your Instagram account connected")
print("3. Make sure it shows 'Business Account'")

print("\nSTEP 4: Test with Fresh OAuth Code")
print("1. Get a fresh auth URL")
print("2. Complete login immediately")
print("3. Don't delay - codes expire in 10 minutes")

print("\n" + "="*60)
print("ALTERNATIVE: Use Graph API Explorer Token")
print("="*60)

print("Since your Graph API Explorer token works:")
print("1. Go to https://developers.facebook.com/tools/explorer/")
print("2. Select your app: 717044718072411")
print("3. Generate fresh token with all permissions")
print("4. Use that token directly in your app")

print("\n" + "="*60)
print("QUICK TEST:")
print("="*60)

print("Let's test if your Instagram is properly connected:")
print("1. Run: python3 test_instagram_connection.py")
print("2. This will check the connection status")
print("3. Show exactly what's missing")

print("\n" + "="*60)
print("EXPECTED RESULT AFTER FIX:")
print("="*60)

print("✅ OAuth codes will exchange successfully")
print("✅ Instagram Business account will be found")
print("✅ Session will be stored")
print("✅ You'll see success on callback page")
print("✅ Ready for posting Reels and Stories")
