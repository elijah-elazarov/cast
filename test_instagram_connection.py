#!/usr/bin/env python3
"""
Test Instagram Business Account Connection
This script tests if the Instagram account is properly connected to a Facebook Page
"""

import requests
import json

# Your long-lived token from the logs
LONG_LIVED_TOKEN = "EAAKMJfu1clsBPzkYZCx6hi06CAR2WCEOqdeue8ETzH40D6MnYNHSOpEZAMKsorPoRlSDRIPXKuNESZCUwpNOJ1rNYRFttDxBxDRyWWEq1WhXTxZA0QczwKY4ZAqe8GNispVkvZAhCKunt9iAl1e4LzEP0PSop2Uht7NCIAO9VQrkU047ZCwRKiraYswmW5o"

def test_user_info():
    """Test getting basic user info"""
    print("=" * 60)
    print("TEST 1: Getting User Info")
    print("=" * 60)
    
    url = f"https://graph.facebook.com/v21.0/me"
    params = {
        'fields': 'id,name',
        'access_token': LONG_LIVED_TOKEN
    }
    
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ User info retrieved successfully")
        return True
    else:
        print("❌ Failed to get user info")
        return False

def test_pages():
    """Test getting Facebook Pages"""
    print("\n" + "=" * 60)
    print("TEST 2: Getting Facebook Pages")
    print("=" * 60)
    
    url = f"https://graph.facebook.com/v21.0/me/accounts"
    params = {
        'access_token': LONG_LIVED_TOKEN
    }
    
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        pages = data.get('data', [])
        print(f"✅ Found {len(pages)} Facebook Pages")
        
        for page in pages:
            print(f"   - Page: {page.get('name')} (ID: {page.get('id')})")
            # Check if this page has Instagram connected
            test_page_instagram(page.get('id'), page.get('access_token'))
        
        return len(pages) > 0
    else:
        print("❌ Failed to get Facebook Pages")
        return False

def test_page_instagram(page_id, page_token):
    """Test if a specific page has Instagram connected"""
    print(f"\n   Testing Instagram connection for Page {page_id}...")
    
    url = f"https://graph.facebook.com/v21.0/{page_id}"
    params = {
        'fields': 'instagram_business_account',
        'access_token': page_token
    }
    
    response = requests.get(url, params=params)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        instagram_account = data.get('instagram_business_account')
        if instagram_account:
            print(f"   ✅ Instagram Business Account found: {instagram_account.get('id')}")
            return instagram_account.get('id')
        else:
            print(f"   ❌ No Instagram Business Account connected to this page")
    else:
        print(f"   ❌ Error: {response.json()}")
    
    return None

def test_instagram_account(instagram_id):
    """Test Instagram account details"""
    print(f"\n" + "=" * 60)
    print(f"TEST 3: Testing Instagram Account {instagram_id}")
    print("=" * 60)
    
    url = f"https://graph.facebook.com/v21.0/{instagram_id}"
    params = {
        'fields': 'id,username,name,account_type',
        'access_token': LONG_LIVED_TOKEN
    }
    
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Instagram account details retrieved successfully")
        return True
    else:
        print("❌ Failed to get Instagram account details")
        return False

def main():
    print("Instagram Business Account Connection Test")
    print("=" * 60)
    print(f"Using token: {LONG_LIVED_TOKEN[:20]}...")
    
    # Test 1: Basic user info
    if not test_user_info():
        print("\n❌ Cannot proceed - user authentication failed")
        return
    
    # Test 2: Facebook Pages
    if not test_pages():
        print("\n❌ No Facebook Pages found - this is the problem!")
        print("SOLUTION: Create a Facebook Page and connect your Instagram account to it")
        return
    
    print("\n✅ All tests completed!")
    print("\nIf you see Instagram Business Account IDs above, your setup is correct.")
    print("If not, you need to:")
    print("1. Make sure your Instagram account is Business/Creator type")
    print("2. Connect your Instagram account to a Facebook Page")
    print("3. Ensure your Facebook App has the required permissions approved")

if __name__ == "__main__":
    main()