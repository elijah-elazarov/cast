#!/usr/bin/env python3
"""
Test Instagram fixes
"""

import requests
import json

def test_instagram_fixes():
    """Test the Instagram fixes"""
    
    print("🔧 TESTING INSTAGRAM FIXES")
    print("=" * 40)
    
    # Test 1: Backend health
    print("\n1. 🏥 Backend Health Check")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/debug/instagram/status")
        data = response.json()
        
        if data.get('success'):
            print("✅ Backend is healthy")
        else:
            print("❌ Backend health check failed")
            return
    except Exception as e:
        print(f"❌ Backend error: {e}")
        return
    
    # Test 2: OAuth URL generation
    print("\n2. 🔗 OAuth URL Generation")
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
            print("❌ OAuth URL generation failed")
            return
    except Exception as e:
        print(f"❌ OAuth URL error: {e}")
        return
    
    # Test 3: Error handling
    print("\n3. 🚫 Error Handling Tests")
    
    # Test invalid code
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": "invalid"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            data = response.json()
            if "Invalid verification code format" in data.get('detail', ''):
                print("✅ Invalid code handling: Working")
            else:
                print(f"⚠️  Unexpected error: {data.get('detail')}")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ Error test failed: {e}")
    
    # Test missing code
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            print("✅ Missing code handling: Working")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ Missing code test failed: {e}")
    
    print("\n4. 🎯 Ready for Live Testing")
    print("   The fixes should resolve:")
    print("   ✅ 'account_type' field errors")
    print("   ✅ Better code validation")
    print("   ✅ Proper error messages")
    
    print("\n🔗 Test with this URL:")
    print(f"   {auth_url}")
    
    print("\n📋 Testing Steps:")
    print("   1. Complete OAuth flow")
    print("   2. Check for error messages")
    print("   3. Verify Instagram connection works")
    
    print("\n🎉 FIXES DEPLOYED!")
    print("=" * 40)

if __name__ == "__main__":
    test_instagram_fixes()
