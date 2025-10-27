#!/usr/bin/env python3
"""
Test the OAuth fix with a fresh code
"""

import requests
import json
import webbrowser
import urllib.parse as urlparse

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*80)
print("TESTING OAUTH FIX")
print("="*80)

print("\n🔧 FIXES APPLIED:")
print("✅ Added grant_type=authorization_code parameter")
print("✅ Improved error handling and logging")
print("✅ Added detailed debugging information")

print("\n" + "="*60)
print("TESTING WITH FRESH OAUTH CODE")
print("="*60)

# Get fresh auth URL
print("1. Getting fresh auth URL...")
response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)

if response.status_code == 200:
    data = response.json()
    auth_url = data.get('data', {}).get('auth_url')
    state = data.get('data', {}).get('state')
    
    print(f"✅ Auth URL generated")
    print(f"State: {state}")
    print(f"\n🔗 AUTH URL:")
    print(f"{auth_url}")
    
    print("\n" + "="*60)
    print("TEST INSTRUCTIONS:")
    print("="*60)
    print("1. Open the auth URL above in a PRIVATE/INCOGNITO window")
    print("2. Complete the Instagram login")
    print("3. Copy the ENTIRE redirect URL")
    print("4. Run: python3 test_fixed_oauth.py 'YOUR_REDIRECT_URL'")
    print("\nThis will test the fixed OAuth flow!")
    
else:
    print(f"❌ Failed to get auth URL: {response.text}")

print("\n" + "="*60)
print("EXPECTED RESULTS:")
print("="*60)
print("✅ Token exchange should succeed")
print("✅ Long-lived token should be generated")
print("✅ Instagram account should be found")
print("✅ Session should be stored")
print("✅ No more 'code has been used' errors")
print("✅ User should see success on callback page")
