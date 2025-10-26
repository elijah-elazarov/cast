#!/usr/bin/env python3
"""
Debug Instagram OAuth Flow
Test the complete flow with detailed error reporting
"""

import requests
import json

def test_instagram_flow():
    """Test the complete Instagram OAuth flow"""
    
    print("🔍 INSTAGRAM OAUTH FLOW DEBUG")
    print("=" * 50)
    
    # Step 1: Get fresh OAuth URL
    print("\n1. Getting fresh OAuth URL...")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print(f"✅ OAuth URL generated")
            print(f"   State: {state}")
            print(f"   URL: {auth_url}")
        else:
            print(f"❌ Failed to get OAuth URL: {data}")
            return
    except Exception as e:
        print(f"❌ Error getting OAuth URL: {e}")
        return
    
    print(f"\n2. Please complete OAuth flow with this URL:")
    print(f"   {auth_url}")
    print(f"\n3. After completion, you'll get a new code. Enter it below:")
    
    # Get new code from user
    new_code = input("   Enter the new authorization code: ").strip()
    
    if not new_code:
        print("❌ No authorization code provided")
        return
    
    # Step 4: Test token exchange with detailed error reporting
    print(f"\n4. Testing token exchange with detailed error reporting...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": new_code},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response Status: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        try:
            data = response.json()
            print(f"   Response JSON: {json.dumps(data, indent=2)}")
        except:
            print(f"   Response Text: {response.text}")
        
        if response.status_code == 200 and data.get('success'):
            print("✅ Token exchange successful!")
            print(f"   User ID: {data['data'].get('user_id')}")
            print(f"   Username: {data['data'].get('username')}")
        else:
            print(f"❌ Token exchange failed")
            if 'detail' in data:
                print(f"   Error: {data['detail']}")
            
    except Exception as e:
        print(f"❌ Error during token exchange: {e}")
    
    print(f"\n🎉 Debug test completed!")

if __name__ == "__main__":
    test_instagram_flow()
