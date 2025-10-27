#!/usr/bin/env python3
"""
Test the specific OAuth code from the callback
"""

import requests
import json

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

# The code from your callback URL
code = "AQCz0VN0oo6hm5__uv6VwCby9H4E_d6sOA6fWNGW6rVLdQli7W2XwBLXDmlEi9Erj9bDhOyelPNU4tFl9twHQ8p5YF-m58xhH29hwcNtsg4Ad4vtGWh2kOPeOdzC_D9qEG0ht_v0vMJlHA7BFvJZpwyLhE8fg38Lp5iTAzmoC2GyZXgK9-xX5RJbsSPmzT08m1TtEPCV3Rvt3O233Kq3A41kRam6lrV5A24KGYoDQUsL92xlaZ31I0HrHJRtiSJdLjgFe6HEOmyZ4cVOKe0hbQTJZgxmlARYMoJF6c9AKOLDNX1Iq0r0JbhYzGNpXprY1m8a5jwsxlfO6RbXNJ5bQKaf-WjxMOOwzuRetDh0JSJbOZ2GlvapHE88I-aWZ720o9A"

print("="*80)
print("TESTING SPECIFIC OAUTH CODE FROM CALLBACK")
print("="*80)

print(f"Code: {code[:20]}...")

# Test login with this specific code
print("\n1. Testing login with OAuth code...")
login_data = {"code": code}

try:
    response = requests.post(
        f"{BACKEND_URL}/api/instagram/graph/login",
        json=login_data,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        login_result = response.json()
        if login_result.get('success'):
            print("\n✅ LOGIN SUCCESSFUL!")
            
            # Display session info
            session_info = login_result.get('session_info', {})
            auth_info = login_result.get('auth_info', {})
            
            print(f"\n📊 SESSION INFO:")
            print(f"  User ID: {session_info.get('user_id')}")
            print(f"  Username: {session_info.get('username')}")
            print(f"  Page ID: {session_info.get('page_id')}")
            print(f"  Has Access Token: {session_info.get('has_access_token')}")
            print(f"  Account Type: {session_info.get('account_type')}")
            print(f"  Followers: {session_info.get('followers')}")
            
            print(f"\n🔐 AUTH INFO:")
            print(f"  Instagram User ID: {auth_info.get('instagram_user_id')}")
            print(f"  Page ID: {auth_info.get('page_id')}")
            print(f"  Token Length: {auth_info.get('page_access_token_length')}")
            print(f"  Session Stored: {auth_info.get('session_stored')}")
            print(f"  Active Sessions: {auth_info.get('total_active_sessions')}")
            
            # Test session storage
            print("\n2. Verifying session storage...")
            response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
            if response.status_code == 200:
                sessions = response.json()
                print(f"✅ Sessions endpoint accessible")
                print(f"Active sessions: {len(sessions.get('sessions', []))}")
                
                if sessions.get('sessions'):
                    print("Active sessions:")
                    for session in sessions['sessions']:
                        print(f"  - User: {session.get('username', 'Unknown')} (ID: {session.get('user_id', 'Unknown')})")
            
            print("\n" + "="*60)
            print("✅ COMPLETE FLOW TEST SUCCESSFUL!")
            print("="*60)
            print("The Instagram Graph API login and session storage is working correctly.")
            print("You can now use the UI to upload content.")
            
        else:
            print(f"❌ Login failed: {login_result.get('error', 'Unknown error')}")
    else:
        print(f"❌ Login request failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
