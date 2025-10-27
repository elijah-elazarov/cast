#!/usr/bin/env python3
"""
Test with a fresh OAuth code to see the complete flow
"""

import requests
import json
import webbrowser
import time

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

def test_fresh_login():
    print("="*80)
    print("FRESH LOGIN TEST")
    print("="*80)
    
    # Get fresh auth URL
    print("1. Getting fresh auth URL...")
    response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        auth_url = data.get('data', {}).get('auth_url')
        print(f"✅ Fresh auth URL: {auth_url}")
        
        print("\n2. Opening browser for fresh login...")
        print("Complete the login and copy the redirect URL")
        
        # Open browser
        webbrowser.open(auth_url)
        
        print("\n3. After completing login, paste the redirect URL here:")
        redirect_url = input("Redirect URL: ").strip()
        
        if redirect_url and 'code=' in redirect_url:
            # Extract code
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(redirect_url)
            params = urlparse.parse_qs(parsed.query)
            code = params.get('code', [None])[0]
            
            if code:
                print(f"\n4. Testing login with fresh code: {code[:20]}...")
                
                login_data = {"code": code}
                response = requests.post(
                    f"{BACKEND_URL}/api/instagram/graph/login",
                    json=login_data,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        print("✅ LOGIN SUCCESSFUL!")
                        print(f"Session Info: {result.get('session_info')}")
                        print(f"Auth Info: {result.get('auth_info')}")
                        
                        # Check sessions
                        print("\n5. Checking stored sessions...")
                        response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
                        sessions = response.json()
                        print(f"Sessions: {sessions}")
                        
                        return True
                    else:
                        print(f"❌ Login failed: {result.get('error')}")
                else:
                    print(f"❌ Request failed: {response.text}")
            else:
                print("❌ Could not extract code from URL")
        else:
            print("❌ Invalid redirect URL")
    else:
        print(f"❌ Failed to get auth URL: {response.text}")
    
    return False

if __name__ == "__main__":
    test_fresh_login()
