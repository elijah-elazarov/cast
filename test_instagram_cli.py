#!/usr/bin/env python3
"""
CLI Instagram OAuth Test
Test the Instagram connection flow via command line
"""

import requests
import json
import webbrowser
from urllib.parse import urlparse, parse_qs

def test_instagram_oauth():
    """Test Instagram OAuth flow via CLI"""
    
    print("🧪 INSTAGRAM OAUTH CLI TEST")
    print("=" * 50)
    
    # Step 1: Get OAuth URL
    print("\n1. Getting OAuth URL...")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print(f"✅ OAuth URL generated successfully")
            print(f"   State: {state}")
            print(f"   URL: {auth_url}")
        else:
            print(f"❌ Failed to get OAuth URL: {data}")
            return
    except Exception as e:
        print(f"❌ Error getting OAuth URL: {e}")
        return
    
    # Step 2: Open browser for OAuth
    print(f"\n2. Opening browser for OAuth...")
    print(f"   Please complete the OAuth flow in your browser")
    print(f"   After authorization, you'll be redirected to:")
    print(f"   https://cast-five.vercel.app/auth/instagram/callback?code=...")
    print(f"   Copy the 'code' parameter from the URL")
    
    try:
        webbrowser.open(auth_url)
        print("✅ Browser opened")
    except Exception as e:
        print(f"⚠️  Could not open browser automatically: {e}")
        print(f"   Please manually open: {auth_url}")
    
    # Step 3: Get authorization code from user
    print(f"\n3. Please complete the OAuth flow and enter the authorization code:")
    auth_code = input("   Enter the 'code' parameter from the callback URL: ").strip()
    
    if not auth_code:
        print("❌ No authorization code provided")
        return
    
    # Step 4: Test token exchange
    print(f"\n4. Testing token exchange...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": auth_code},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        
        if data.get('success'):
            print("✅ Token exchange successful!")
            print(f"   User ID: {data['data'].get('user_id')}")
            print(f"   Username: {data['data'].get('username')}")
            print(f"   Followers: {data['data'].get('followers_count')}")
            print(f"   Media Count: {data['data'].get('media_count')}")
            print(f"   Account Type: {data['data'].get('account_type')}")
        else:
            print(f"❌ Token exchange failed: {data}")
            
    except Exception as e:
        print(f"❌ Error during token exchange: {e}")
    
    print(f"\n🎉 Test completed!")

if __name__ == "__main__":
    test_instagram_oauth()
