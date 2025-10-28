#!/usr/bin/env python3
"""
Debug Facebook Pages and Instagram Connection
This script will show you what Facebook Pages you have and help identify the connection issue
"""

import requests
import json

# Your long-lived token from the logs
LONG_LIVED_TOKEN = "EAAKMJfu1clsBPzkYZCx6hi06CAR2WCEOqdeue8ETzH40D6MnYNHSOpEZAMKsorPoRlSDRIPXKuNESZCUwpNOJ1rNYRFttDxBxDRyWWEq1WhXTxZA0QczwKY4ZAqe8GNispVkvZAhCKunt9iAl1e4LzEP0PSop2Uht7NCIAO9VQrkU047ZCwRKiraYswmW5o"

def get_facebook_pages():
    """Get all Facebook Pages for the user"""
    print("=" * 60)
    print("GETTING FACEBOOK PAGES")
    print("=" * 60)
    
    url = f"https://graph.facebook.com/v21.0/me/accounts"
    params = {
        'fields': 'id,name,access_token,category',
        'access_token': LONG_LIVED_TOKEN
    }
    
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        pages = data.get('data', [])
        print(f"✅ Found {len(pages)} Facebook Pages:")
        
        for i, page in enumerate(pages, 1):
            print(f"\n{i}. Page: {page.get('name')}")
            print(f"   ID: {page.get('id')}")
            print(f"   Category: {page.get('category', 'Unknown')}")
            print(f"   Access Token: {page.get('access_token', 'None')[:20]}...")
            
            # Check if this page has Instagram connected
            check_instagram_connection(page)
        
        return pages
    else:
        print(f"❌ Error: {response.json()}")
        return []

def check_instagram_connection(page):
    """Check if a specific page has Instagram connected"""
    page_id = page.get('id')
    page_token = page.get('access_token')
    
    if not page_token:
        print(f"   ❌ No access token for page {page_id}")
        return None
    
    print(f"   🔍 Checking Instagram connection...")
    
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
            print(f"   ✅ Instagram Business Account connected!")
            print(f"      Instagram ID: {instagram_account.get('id')}")
            return instagram_account.get('id')
        else:
            print(f"   ❌ No Instagram Business Account connected to this page")
            print(f"   💡 SOLUTION: Go to Facebook.com → Pages → {page.get('name')} → Settings → Instagram → Connect Account")
    else:
        error_data = response.json()
        print(f"   ❌ Error checking Instagram: {error_data}")
    
    return None

def test_instagram_account(instagram_id):
    """Test Instagram account details"""
    print(f"\n" + "=" * 60)
    print(f"TESTING INSTAGRAM ACCOUNT {instagram_id}")
    print("=" * 60)
    
    url = f"https://graph.facebook.com/v21.0/{instagram_id}"
    params = {
        'fields': 'id,username,name,account_type',
        'access_token': LONG_LIVED_TOKEN
    }
    
    response = requests.get(url, params=params)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Instagram Account Details:")
        print(f"   ID: {data.get('id')}")
        print(f"   Username: {data.get('username')}")
        print(f"   Name: {data.get('name')}")
        print(f"   Account Type: {data.get('account_type')}")
        return True
    else:
        print(f"❌ Error: {response.json()}")
        return False

def main():
    print("Facebook Pages and Instagram Connection Debug")
    print("=" * 60)
    print(f"Using token: {LONG_LIVED_TOKEN[:20]}...")
    
    # Get Facebook Pages
    pages = get_facebook_pages()
    
    if not pages:
        print("\n❌ No Facebook Pages found!")
        print("SOLUTION: Create a Facebook Page first, then connect your Instagram account to it.")
        return
    
    # Check for Instagram connections
    instagram_accounts = []
    for page in pages:
        instagram_id = check_instagram_connection(page)
        if instagram_id:
            instagram_accounts.append(instagram_id)
    
    if instagram_accounts:
        print(f"\n✅ Found {len(instagram_accounts)} Instagram Business Account(s) connected!")
        for instagram_id in instagram_accounts:
            test_instagram_account(instagram_id)
    else:
        print("\n❌ No Instagram Business Accounts found connected to any Facebook Pages!")
        print("\nSOLUTION STEPS:")
        print("1. Make sure your Instagram account is Business/Creator type (not Personal)")
        print("2. Go to Facebook.com → Pages → Select a Page → Settings → Instagram")
        print("3. Click 'Connect Account' and connect your Instagram Business account")
        print("4. Try the authentication again")

if __name__ == "__main__":
    main()
