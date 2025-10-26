#!/usr/bin/env python3
"""
Get OAuth authorization code for testing
"""

import requests
import json
import webbrowser
import time

def get_oauth_code():
    """Get a fresh OAuth authorization code"""
    
    print("🔑 GETTING OAUTH AUTHORIZATION CODE")
    print("=" * 50)
    
    # Step 1: Get OAuth URL
    print("\n1. 🔗 Getting OAuth URL...")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print("✅ OAuth URL generated successfully")
            print(f"   State: {state}")
            print(f"\n🔗 OAuth URL:")
            print(f"   {auth_url}")
        else:
            print("❌ Failed to get OAuth URL")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Step 2: Open browser
    print("\n2. 🌐 Opening browser for OAuth...")
    try:
        webbrowser.open(auth_url)
        print("✅ Browser opened with OAuth URL")
    except Exception as e:
        print(f"⚠️  Could not open browser automatically: {e}")
        print(f"   Please manually open: {auth_url}")
    
    # Step 3: Instructions
    print("\n3. 📋 OAUTH FLOW INSTRUCTIONS:")
    print("   a) Complete Facebook login and permissions")
    print("   b) Select your Facebook Page (if prompted)")
    print("   c) You'll be redirected to: https://cast-five.vercel.app/auth/instagram/callback?code=...")
    print("   d) Copy the 'code' parameter from the URL")
    print("   e) Paste it below to test")
    
    # Step 4: Wait for user input
    print("\n4. ⏳ WAITING FOR OAUTH COMPLETION...")
    print("   Complete the OAuth flow and then paste the authorization code below")
    
    while True:
        code = input("\n   Enter the authorization code (or 'quit' to exit): ").strip()
        
        if code.lower() == 'quit':
            print("   Exiting...")
            break
            
        if not code:
            print("   Please enter a valid authorization code")
            continue
            
        # Test the code
        print(f"\n5. 🧪 Testing code: {code[:20]}...")
        try:
            response = requests.post(
                "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
                json={"code": code},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Response Status: {response.status_code}")
            
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)}")
                
                if data.get('success'):
                    print("✅ SUCCESS! Instagram connection working!")
                    print(f"   User: {data['data'].get('username', 'Unknown')}")
                    print(f"   Followers: {data['data'].get('followers_count', 0)}")
                    print(f"   Account Type: {data['data'].get('account_type', 'Unknown')}")
                    break
                else:
                    print("❌ Error in response")
                    if 'detail' in data:
                        print(f"   Error: {data['detail']}")
                    print("\n   Try again with a fresh code or check the requirements:")
                    print("   - Facebook account with admin access to a Page")
                    print("   - Instagram Business or Creator account")
                    print("   - Instagram account connected to Facebook Page")
                    print("   - All permissions granted during OAuth")
            except:
                print(f"   Response Text: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing code: {e}")
        
        print("\n   Enter another code or 'quit' to exit")
    
    print("\n🎉 TEST COMPLETED!")
    print("=" * 50)

if __name__ == "__main__":
    get_oauth_code()
