#!/usr/bin/env python3
"""
Comprehensive Instagram Testing Suite
Test all aspects of the Instagram integration
"""

import requests
import json
import time
import webbrowser
from urllib.parse import urlparse, parse_qs

def test_instagram_comprehensive():
    """Comprehensive Instagram testing"""
    
    print("🧪 COMPREHENSIVE INSTAGRAM TEST SUITE")
    print("=" * 60)
    
    # Test 1: Backend Health Check
    print("\n1. 🔍 BACKEND HEALTH CHECK")
    print("-" * 30)
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/debug/instagram/status")
        data = response.json()
        
        if data.get('success'):
            print("✅ Backend is healthy")
            print(f"   App ID: {data['details']['app_id']}")
            print(f"   Scopes: {', '.join(data['details']['scopes'])}")
        else:
            print("❌ Backend health check failed")
            return
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return
    
    # Test 2: OAuth URL Generation
    print("\n2. 🔗 OAUTH URL GENERATION")
    print("-" * 30)
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print("✅ OAuth URL generated successfully")
            print(f"   State: {state}")
            print(f"   URL Length: {len(auth_url)} characters")
            
            # Validate URL components
            parsed = urlparse(auth_url)
            if 'facebook.com' in parsed.netloc and 'client_id' in parsed.query:
                print("✅ URL structure is valid")
            else:
                print("❌ URL structure is invalid")
                return
        else:
            print("❌ OAuth URL generation failed")
            return
    except Exception as e:
        print(f"❌ OAuth URL generation error: {e}")
        return
    
    # Test 3: Invalid Code Handling
    print("\n3. 🚫 INVALID CODE HANDLING")
    print("-" * 30)
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": "invalid_code_test"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            data = response.json()
            if "Invalid verification code format" in data.get('detail', ''):
                print("✅ Invalid code handling works correctly")
            else:
                print(f"⚠️  Unexpected error for invalid code: {data}")
        else:
            print(f"❌ Expected 400 status, got {response.status_code}")
    except Exception as e:
        print(f"❌ Invalid code test error: {e}")
    
    # Test 4: Used Code Handling
    print("\n4. 🔄 USED CODE HANDLING")
    print("-" * 30)
    try:
        # Use a code that was already used
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": "AQBxOCD4vxJQTvyWD_Qt3j58YJLoclV3aAI19YVO8vITQxo0Lp7p5LggLCbIFtFpizrqjwjbNJbzV1tYTltvEQxJpqIhA9L-21_qRcpa6l0Q_w7Ge93agprF5XQsoqSSjB8RD81snKnbeYMEqCAkAmPxCpVSCNbqCdy7PF-OTXasaiphRF6LYXQ99de1eDqpHaL8PJ3AK7KZXeie52YJ-LgYBQ_hF1lBSkEv7e9glsd-l68qFg_wRusPiRCQD7hw49g1dsk6Mha_iciVrPu8IoOtUj-zel31WHodiTapADJ6S9tWoN4VGjopCwBnAGXFn2MIIP2i2W6bXCWlzdL9d67jsLvc1q9jBgu0Df0o9hMJfrpgDm2DHxNmh1L554G4lSE"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            data = response.json()
            if "authorization code has been used" in data.get('detail', ''):
                print("✅ Used code handling works correctly")
            else:
                print(f"⚠️  Unexpected error for used code: {data}")
        else:
            print(f"❌ Expected 400 status, got {response.status_code}")
    except Exception as e:
        print(f"❌ Used code test error: {e}")
    
    # Test 5: Frontend Integration
    print("\n5. 🌐 FRONTEND INTEGRATION")
    print("-" * 30)
    try:
        response = requests.get("https://cast-five.vercel.app")
        if response.status_code == 200:
            print("✅ Frontend is accessible")
        else:
            print(f"❌ Frontend returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend test error: {e}")
    
    # Test 6: OAuth Flow Instructions
    print("\n6. 🎯 OAUTH FLOW TEST")
    print("-" * 30)
    print("To test the complete OAuth flow:")
    print(f"1. Open: {auth_url}")
    print("2. Complete Facebook OAuth (login, grant permissions, select page)")
    print("3. You'll be redirected to: https://cast-five.vercel.app/auth/instagram/callback?code=...")
    print("4. Check browser console for any errors")
    print("5. Look for specific error messages in the UI")
    
    # Test 7: Requirements Check
    print("\n7. 📋 REQUIREMENTS CHECK")
    print("-" * 30)
    print("Before testing, ensure you have:")
    print("✅ Facebook account with admin access to a Page")
    print("✅ Instagram Business or Creator account")
    print("✅ Instagram account connected to the Facebook Page")
    print("✅ Proper permissions granted during OAuth")
    
    print("\n🎉 COMPREHENSIVE TEST COMPLETED!")
    print("=" * 60)

if __name__ == "__main__":
    test_instagram_comprehensive()
