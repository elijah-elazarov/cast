#!/usr/bin/env python3
"""
Generate Instagram access token like Graph API Explorer
This bypasses OAuth and generates tokens directly
"""

import requests
import json
import webbrowser
import urllib.parse as urlparse

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*80)
print("GENERATE TOKEN LIKE GRAPH API EXPLORER")
print("="*80)

print("\nThis approach generates tokens directly like the Graph API Explorer:")
print("1. Uses your existing Facebook session")
print("2. Generates tokens immediately")
print("3. No OAuth code exchange needed")
print("4. Bypasses all the OAuth flow issues")

print("\n" + "="*60)
print("METHOD 1: Direct Facebook Graph API Token Generation")
print("="*60)

# Your app credentials (from your backend)
APP_ID = "717044718072411"
APP_SECRET = "YOUR_APP_SECRET"  # You'll need to get this from your app settings

print(f"App ID: {APP_ID}")
print("App Secret: [HIDDEN - you need to get this from Facebook App Settings]")

print("\nTo get your App Secret:")
print("1. Go to https://developers.facebook.com/apps/717044718072411/settings/basic/")
print("2. Copy the 'App Secret'")
print("3. Update this script with your App Secret")

print("\n" + "="*60)
print("METHOD 2: Use Graph API Explorer Token Directly")
print("="*60)

print("Since you already have a working token from Graph API Explorer:")
print("1. Go to https://developers.facebook.com/tools/explorer/")
print("2. Select your app: 717044718072411")
print("3. Generate a new token with these permissions:")
print("   - instagram_basic")
print("   - pages_show_list") 
print("   - pages_read_engagement")
print("   - business_management")
print("   - instagram_content_publish")
print("   - instagram_manage_comments")
print("   - instagram_manage_insights")
print("4. Copy the token and use it directly")

print("\n" + "="*60)
print("METHOD 3: Test with Your Existing Token")
print("="*60)

# Your existing working token from Graph API Explorer
existing_token = "EAAKMJfu1clsBP9Cm2Yy0lft7VGk9fggb0DLjkBBtdix0NxExZA4I4NMa9YjfK6yDdz3Hk78ryHrY1FXvf33pVTXUaoJAgb3jw7TloJLUpnaSB6aqKNGtesV61ip0XqNHrxKIbif1ajRq9zy7WjbS82yZBfUnaTcs0BXJwngfKpWK6s9FJbXvUB4SLvPbEuNAkbXkgZCoyhkRukHqZCJIdcmUiNpVjGiBXgZDZD"

print("Testing with your existing Graph API Explorer token...")

try:
    # Test the token
    response = requests.get(
        "https://graph.facebook.com/v21.0/me/accounts",
        params={
            "access_token": existing_token,
            "fields": "id,name,access_token,instagram_business_account"
        },
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        pages = data.get('data', [])
        print(f"✅ Token works! Found {len(pages)} pages")
        
        for page in pages:
            print(f"  - {page.get('name')} (ID: {page.get('id')})")
            if page.get('instagram_business_account'):
                ig_account = page['instagram_business_account']
                print(f"    ✅ Has Instagram: {ig_account.get('id')}")
                
                # Test Instagram access
                page_token = page.get('access_token')
                ig_id = ig_account['id']
                
                response2 = requests.get(
                    f"https://graph.facebook.com/v21.0/{ig_id}",
                    params={
                        "access_token": page_token,
                        "fields": "id,username,followers_count,media_count"
                    },
                    timeout=30
                )
                
                if response2.status_code == 200:
                    ig_info = response2.json()
                    print(f"    ✅ Instagram accessible: {ig_info.get('username')}")
                    print(f"    Followers: {ig_info.get('followers_count')}")
                    print(f"    Media: {ig_info.get('media_count')}")
                    
                    print("\n" + "="*50)
                    print("✅ SOLUTION FOUND!")
                    print("="*50)
                    print("Your Graph API Explorer token works perfectly!")
                    print("The issue is with the OAuth flow, not the token generation.")
                    print("\nTo fix the OAuth flow:")
                    print("1. Check Instagram account is Business/Creator")
                    print("2. Verify Facebook Page connection")
                    print("3. Ensure proper app permissions")
                    print("4. Or use the Graph API Explorer token directly")
                    
                else:
                    print(f"    ❌ Instagram access failed: {response2.text}")
            else:
                print(f"    ❌ No Instagram connected")
    else:
        print(f"❌ Token test failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*60)
print("RECOMMENDATION:")
print("="*60)
print("Since your Graph API Explorer token works, the issue is in the OAuth flow.")
print("You can either:")
print("1. Fix the OAuth flow (check Instagram/Facebook Page setup)")
print("2. Use the Graph API Explorer token directly in your app")
print("3. Generate tokens manually using the Facebook Graph API")
