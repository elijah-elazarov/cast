#!/usr/bin/env python3
"""
Simple OAuth test to get authorization code
"""

import requests
import json

def simple_oauth_test():
    """Simple OAuth test to get authorization code"""
    
    print("🔑 SIMPLE OAUTH CODE TEST")
    print("=" * 40)
    
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
            print(f"\n🔗 OAUTH URL:")
            print(f"   {auth_url}")
        else:
            print("❌ Failed to get OAuth URL")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Instructions
    print("\n2. 📋 INSTRUCTIONS:")
    print("   a) Click the URL above to open OAuth flow")
    print("   b) Complete Facebook login and permissions")
    print("   c) Select your Facebook Page (if prompted)")
    print("   d) You'll be redirected to: https://cast-five.vercel.app/auth/instagram/callback?code=...")
    print("   e) Copy the 'code' parameter from the URL")
    print("   f) Test it with: python3 test_code.py YOUR_CODE_HERE")
    
    # Requirements
    print("\n3. ✅ REQUIREMENTS:")
    print("   □ Facebook account with admin access to a Page")
    print("   □ Instagram Business or Creator account")
    print("   □ Instagram account connected to Facebook Page")
    print("   □ All permissions granted during OAuth")
    
    # Common issues
    print("\n4. 🚨 COMMON ISSUES:")
    print("   - No Facebook Pages → Create at https://www.facebook.com/pages/create")
    print("   - Instagram not connected → Connect at Facebook Page Settings > Instagram")
    print("   - Wrong account type → Convert to Business/Creator in Instagram")
    print("   - Permission denied → Grant all requested permissions")
    
    print("\n🎯 READY FOR TESTING!")
    print("=" * 40)

if __name__ == "__main__":
    simple_oauth_test()
