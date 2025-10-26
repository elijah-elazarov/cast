#!/usr/bin/env python3
"""
Automatic OAuth test - simulates the flow
"""

import requests
import json
import time

def auto_oauth_test():
    """Automatic OAuth test"""
    
    print("🤖 AUTOMATIC OAUTH TEST")
    print("=" * 40)
    
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
    
    # Step 2: Test with a dummy code first
    print("\n2. 🧪 Testing with dummy code...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": "dummy_test_code"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Response Text: {response.text}")
    except Exception as e:
        print(f"❌ Error testing dummy code: {e}")
    
    # Step 3: Test with empty code
    print("\n3. 🧪 Testing with empty code...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": ""},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Response Text: {response.text}")
    except Exception as e:
        print(f"❌ Error testing empty code: {e}")
    
    # Step 4: Test with missing code
    print("\n4. 🧪 Testing with missing code...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Response Text: {response.text}")
    except Exception as e:
        print(f"❌ Error testing missing code: {e}")
    
    # Step 5: Test with a real-looking but invalid code
    print("\n5. 🧪 Testing with invalid code format...")
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": "AQBxOCD4vxJQTvyWD_Qt3j58YJLoclV3aAI19YVO8vITQxo0Lp7p5LggLCbIFtFpizrqjwjbNJbzV1tYTltvEQxJpqIhA9L-21_qRcpa6l0Q_w7Ge93agprF5XQsoqSSjB8RD81snKnbeYMEqCAkAmPxCpVSCNbqCdy7PF-OTXasaiphRF6LYXQ99de1eDqpHaL8PJ3AK7KZXeie52YJ-LgYBQ_hF1lBSkEv7e9glsd-l68qFg_wRusPiRCQD7hw49g1dsk6Mha_iciVrPu8IoOtUj-zel31WHodiTapADJ6S9tWoN4VGjopCwBnAGXFn2MIIP2i2W6bXCWlzdL9d67jsLvc1q9jBgu0Df0o9hMJfrpgDm2DHxNmh1L554G4lSE"},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Response Text: {response.text}")
    except Exception as e:
        print(f"❌ Error testing invalid code: {e}")
    
    print("\n6. 📋 MANUAL TEST:")
    print("   To test with a real code:")
    print("   a) Complete OAuth flow with the URL above")
    print("   b) Copy the authorization code from callback URL")
    print("   c) Run: python3 test_code.py YOUR_CODE_HERE")
    
    print("\n🎉 AUTOMATIC TEST COMPLETED!")
    print("=" * 40)

if __name__ == "__main__":
    auto_oauth_test()
