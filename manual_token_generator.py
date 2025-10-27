#!/usr/bin/env python3
"""
Manual token generator like Graph API Explorer
"""

import requests
import json

print("="*60)
print("MANUAL TOKEN GENERATOR")
print("="*60)

# Your app credentials
APP_ID = "717044718072411"
REDIRECT_URI = "https://cast-five.vercel.app/auth/instagram/callback"

print("To generate a token manually like Graph API Explorer:")
print("\n1. Go to: https://developers.facebook.com/tools/explorer/")
print("2. Select your app: 717044718072411")
print("3. Add these permissions:")
print("   - instagram_basic")
print("   - pages_show_list")
print("   - pages_read_engagement") 
print("   - business_management")
print("   - instagram_content_publish")
print("   - instagram_manage_comments")
print("   - instagram_manage_insights")
print("4. Click 'Generate Access Token'")
print("5. Copy the token")

print("\n" + "="*60)
print("ALTERNATIVE: Direct API Token Generation")
print("="*60)

print("You can also generate tokens directly via API:")
print("1. Get your App Secret from Facebook App Settings")
print("2. Use the Facebook Graph API to generate tokens")
print("3. This bypasses the OAuth flow entirely")

print("\n" + "="*60)
print("QUICK FIX FOR YOUR APP")
print("="*60)

print("Since your Graph API Explorer token works, you can:")
print("1. Use it directly in your backend")
print("2. Store it as a 'master token'")
print("3. Use it to generate page tokens for users")
print("4. Bypass the OAuth flow for testing")

print("\nThis would solve the 'code has been used' issue immediately!")
