#!/usr/bin/env python3
"""
Test Instagram App ID configuration
"""

import requests
import os

def test_instagram_app_id():
    """Test if the Instagram App ID is valid and properly configured"""
    
    # Get credentials from environment
    app_id = os.getenv('FACEBOOK_APP_ID', '854378847115712')
    app_secret = os.getenv('FACEBOOK_APP_SECRET', '69f5da9419e450d1787645c81e567443')
    
    print(f"Testing Instagram App ID: {app_id}")
    print(f"Testing Instagram App Secret: {app_secret[:10]}...")
    
    # Test 1: Check if we can generate an auth URL
    print("\n1. Testing OAuth URL generation...")
    
    redirect_uri = "https://cast-five.vercel.app/auth/instagram/callback"
    scopes = ["instagram_business_basic", "instagram_business_content_publish"]
    
    auth_url = (
        f"https://www.instagram.com/oauth/authorize?"
        f"client_id={app_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={','.join(scopes)}&"
        f"response_type=code"
    )
    
    print(f"Generated auth URL: {auth_url}")
    
    # Test 2: Try to make a simple API call to validate the app
    print("\n2. Testing app validation...")
    
    try:
        # Try to get app info (this might not work with Instagram App ID)
        url = f"https://graph.facebook.com/v21.0/{app_id}"
        params = {"access_token": f"{app_id}|{app_secret}"}
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Graph API response status: {response.status_code}")
        print(f"Graph API response: {response.text}")
        
        if response.status_code == 200:
            print("✅ App ID is valid for Graph API")
        else:
            print("❌ App ID validation failed")
            
    except Exception as e:
        print(f"❌ Error testing app ID: {str(e)}")
    
    # Test 3: Check Instagram-specific endpoints
    print("\n3. Testing Instagram API endpoints...")
    
    try:
        # Try Instagram API endpoint
        url = "https://api.instagram.com/oauth/access_token"
        data = {
            "client_id": app_id,
            "client_secret": app_secret,
            "grant_type": "client_credentials"
        }
        
        response = requests.post(url, data=data, timeout=10)
        print(f"Instagram API response status: {response.status_code}")
        print(f"Instagram API response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error testing Instagram API: {str(e)}")

if __name__ == "__main__":
    test_instagram_app_id()
