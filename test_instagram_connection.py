#!/usr/bin/env python3
"""
Test Instagram Business account connection
"""

import requests
import json

# Your working Graph API Explorer token
TOKEN = "EAAKMJfu1clsBP9Cm2Yy0lft7VGk9fggb0DLjkBBtdix0NxExZA4I4NMa9YjfK6yDdz3Hk78ryHrY1FXvf33pVTXUaoJAgb3jw7TloJLUpnaSB6aqKNGtesV61ip0XqNHrxKIbif1ajRq9zy7WjbS82yZBfUnaTcs0BXJwngfKpWK6s9FJbXvUB4SLvPbEuNAkbXkgZCoyhkRukHqZCJIdcmUiNpVjGiBXgZDZD"

print("="*60)
print("TESTING INSTAGRAM CONNECTION")
print("="*60)

try:
    # Test 1: Get pages
    print("1. Testing Facebook Pages access...")
    response = requests.get(
        "https://graph.facebook.com/v21.0/me/accounts",
        params={
            "access_token": TOKEN,
            "fields": "id,name,access_token,instagram_business_account"
        },
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        pages = data.get('data', [])
        print(f"✅ Found {len(pages)} pages")
        
        for page in pages:
            print(f"\n📄 Page: {page.get('name')} (ID: {page.get('id')})")
            
            if page.get('instagram_business_account'):
                ig_account = page['instagram_business_account']
                print(f"✅ Instagram Connected: {ig_account.get('id')}")
                
                # Test Instagram access
                page_token = page.get('access_token')
                ig_id = ig_account['id']
                
                response2 = requests.get(
                    f"https://graph.facebook.com/v21.0/{ig_id}",
                    params={
                        "access_token": page_token,
                        "fields": "id,username,followers_count,media_count,account_type"
                    },
                    timeout=30
                )
                
                if response2.status_code == 200:
                    ig_info = response2.json()
                    print(f"✅ Instagram Details:")
                    print(f"   Username: {ig_info.get('username')}")
                    print(f"   Account Type: {ig_info.get('account_type', 'Unknown')}")
                    print(f"   Followers: {ig_info.get('followers_count')}")
                    print(f"   Media: {ig_info.get('media_count')}")
                    
                    if ig_info.get('account_type') in ['BUSINESS', 'CREATOR']:
                        print("✅ Account type is correct!")
                    else:
                        print("❌ Account type issue - should be BUSINESS or CREATOR")
                else:
                    print(f"❌ Instagram access failed: {response2.text}")
            else:
                print("❌ No Instagram connected to this page")
                print("   This is the problem!")
                print("   Solution: Connect Instagram Business account to Facebook Page")
    else:
        print(f"❌ Pages access failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*60)
print("DIAGNOSIS COMPLETE")
print("="*60)
