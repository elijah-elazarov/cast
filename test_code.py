#!/usr/bin/env python3
"""
Test authorization code
"""

import requests
import json
import sys

def test_code():
    """Test authorization code"""
    
    if len(sys.argv) != 2:
        print("Usage: python3 test_code.py YOUR_AUTHORIZATION_CODE")
        return
    
    code = sys.argv[1]
    
    print("🧪 TESTING AUTHORIZATION CODE")
    print("=" * 40)
    print(f"Code: {code[:20]}...")
    
    try:
        response = requests.post(
            "https://backrooms-e8nm.onrender.com/api/instagram/graph/login",
            json={"code": code},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response Status: {response.status_code}")
        
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('success'):
                print("✅ SUCCESS! Instagram connection working!")
                print(f"   User: {data['data'].get('username', 'Unknown')}")
                print(f"   Followers: {data['data'].get('followers_count', 0)}")
                print(f"   Account Type: {data['data'].get('account_type', 'Unknown')}")
            else:
                print("❌ Error in response")
                if 'detail' in data:
                    print(f"   Error: {data['detail']}")
        except:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing code: {e}")

if __name__ == "__main__":
    test_code()
