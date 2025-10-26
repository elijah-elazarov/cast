#!/usr/bin/env python3
"""
Automatic Instagram OAuth Test
"""

import requests
import json
import sys

def auto_instagram_test():
    """Automatic Instagram OAuth test"""
    
    print("🎯 AUTOMATIC INSTAGRAM OAUTH TEST")
    print("=" * 50)
    
    # Get OAuth URL
    print("\n1. 🔗 Getting OAuth URL...")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print("✅ OAuth URL generated successfully")
            print(f"   State: {state}")
            print(f"\n🔗 TEST URL:")
            print(f"   {auth_url}")
        else:
            print("❌ Failed to get OAuth URL")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Check if code provided as argument
    if len(sys.argv) > 1:
        code = sys.argv[1]
        print(f"\n2. 🧪 Testing with provided code: {code[:20]}...")
        
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
                else:
                    print("❌ Error in response")
                    if 'detail' in data:
                        print(f"   Error: {data['detail']}")
            except:
                print(f"   Response Text: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing code: {e}")
    else:
        print("\n2. 📋 MANUAL TESTING:")
        print("   a) Click the URL above to complete OAuth flow")
        print("   b) Copy the authorization code from callback URL")
        print("   c) Run: python3 auto_instagram_test.py YOUR_CODE_HERE")
        print("   d) Or test directly in browser and check for errors")
    
    print("\n3. ✅ REQUIREMENTS:")
    print("   □ Facebook account with admin access to a Page")
    print("   □ Instagram Business or Creator account")
    print("   □ Instagram account connected to Facebook Page")
    print("   □ All permissions granted during OAuth")
    
    print("\n4. 🚨 COMMON ISSUES:")
    print("   - No Facebook Pages → Create at https://www.facebook.com/pages/create")
    print("   - Instagram not connected → Connect at Facebook Page Settings > Instagram")
    print("   - Wrong account type → Convert to Business/Creator in Instagram")
    print("   - Permission denied → Grant all requested permissions")
    
    print("\n🎉 READY FOR TESTING!")
    print("=" * 50)

if __name__ == "__main__":
    auto_instagram_test()
