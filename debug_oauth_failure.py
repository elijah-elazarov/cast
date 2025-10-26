#!/usr/bin/env python3
"""
Debug OAuth flow failure after sign-in
"""

import requests
import json

def debug_oauth_failure():
    """Debug OAuth flow failure after sign-in"""
    
    print("🔍 DEBUGGING OAUTH FLOW FAILURE")
    print("=" * 50)
    
    # Test 1: Get fresh OAuth URL
    print("\n1. 🔗 Getting fresh OAuth URL...")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print("✅ OAuth URL generated successfully")
            print(f"   State: {state}")
            print(f"\n🔗 Test URL:")
            print(f"   {auth_url}")
        else:
            print("❌ Failed to get OAuth URL")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test 2: Check common failure points
    print("\n2. 🚨 COMMON FAILURE POINTS:")
    print("   a) Facebook Pages not found")
    print("   b) Instagram not connected to Page")
    print("   c) Wrong Instagram account type")
    print("   d) Permission denied")
    print("   e) Code format issues")
    
    # Test 3: Test with a dummy code to see error
    print("\n3. 🧪 Testing error handling...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": "dummy_code_for_testing"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Error Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Response Text: {response.text}")
    except Exception as e:
        print(f"❌ Error testing: {e}")
    
    # Test 4: Check if you have a fresh code to test
    print("\n4. 🎯 FRESH CODE TEST:")
    print("   If you completed OAuth and got a fresh authorization code,")
    print("   let's test it to see the exact error:")
    
    # Test 5: Instructions for debugging
    print("\n5. 📋 DEBUGGING STEPS:")
    print("   a) Complete OAuth flow with the URL above")
    print("   b) Check browser console for errors")
    print("   c) Look for specific error messages")
    print("   d) Note if you see Facebook Pages selection")
    print("   e) Check if Instagram account is properly connected")
    
    print("\n6. 🔍 SPECIFIC THINGS TO CHECK:")
    print("   - Do you have a Facebook Page?")
    print("   - Is your Instagram account Business/Creator type?")
    print("   - Is Instagram connected to your Facebook Page?")
    print("   - Are you admin of the Facebook Page?")
    print("   - Did you grant all requested permissions?")
    
    print("\n7. 🚨 QUICK FIXES:")
    print("   - Create Facebook Page: https://www.facebook.com/pages/create")
    print("   - Convert Instagram: Instagram Settings > Account > Switch to Professional")
    print("   - Connect Instagram: Facebook Page Settings > Instagram")
    print("   - Ensure admin access: You must be Page admin")
    
    print("\n8. 📞 NEXT STEPS:")
    print("   After completing OAuth, report:")
    print("   - What error message you see")
    print("   - What appears in browser console")
    print("   - Whether you see Facebook Pages selection")
    print("   - Any permission dialogs")
    
    print("\n🎯 READY FOR DEBUGGING!")
    print("=" * 50)

if __name__ == "__main__":
    debug_oauth_failure()
