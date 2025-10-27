#!/usr/bin/env python3
"""
Test login with a fresh token that has access to the connected page
"""

import requests
import json

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

def test_complete_flow():
    """Test the complete login flow"""
    print("="*60)
    print("Testing Instagram Graph API Login Flow")
    print("="*60)
    
    # Use your new token
    user_token = "EAAKMJfu1clsBP9Cm2Yy0lft7VGk9fggb0DLjkBBtdix0NxExZA4I4NMa9YjfK6yDdz3Hk78ryHrY1FXvf33pVTXUaoJAgb3jw7TloJLUpnaSB6aqKNGtesV61ip0XqNHrxKIbif1ajRq9zy7WjbS82yZBfUnaTcs0BXJwngfKpWK6s9FJbXvUB4SLvPbEuNAkbXkgZCoyhkRukHqZCJIdcmUiNpVjGiBXgZDZD"
    
    # Step 1: Get Pages
    print("\n1. Testing get_user_pages...")
    try:
        response = requests.get(
            "https://graph.facebook.com/v21.0/me/accounts",
            params={
                "access_token": user_token,
                "fields": "id,name,access_token,instagram_business_account"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            pages = data.get('data', [])
            print(f"✅ Found {len(pages)} pages")
            
            for page in pages:
                print(f"  - {page.get('name')} (ID: {page.get('id')})")
                if page.get('instagram_business_account'):
                    ig_account = page['instagram_business_account']
                    print(f"    ✅ Has Instagram: {ig_account.get('id')}")
                else:
                    print(f"    ❌ No Instagram connected")
            
            # Find page with Instagram
            page_with_instagram = None
            for page in pages:
                if page.get('instagram_business_account'):
                    page_with_instagram = page
                    break
            
            if page_with_instagram:
                print("\n2. Testing Instagram account access...")
                page_token = page_with_instagram.get('access_token')
                ig_id = page_with_instagram['instagram_business_account']['id']
                
                # Get Instagram user info
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
                    print("✅ Instagram account accessible!")
                    print(f"  Username: {ig_info.get('username')}")
                    print(f"  Followers: {ig_info.get('followers_count')}")
                    print(f"  Media: {ig_info.get('media_count')}")
                    
                    print("\n✅ All tests passed! Login should work now.")
                    return True
                else:
                    print(f"❌ Failed to get Instagram info: {response2.text}")
            else:
                print("❌ No page with Instagram found")
        else:
            print(f"❌ Failed to get pages: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    return False

if __name__ == "__main__":
    test_complete_flow()
