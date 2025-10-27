#!/usr/bin/env python3
"""
Test auth URL generation and provide manual instructions
"""

import requests
import json

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*60)
print("INSTAGRAM LOGIN TEST")
print("="*60)

# Get fresh auth URL
print("1. Getting fresh auth URL...")
response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)

if response.status_code == 200:
    data = response.json()
    auth_url = data.get('data', {}).get('auth_url')
    state = data.get('data', {}).get('state')
    
    print(f"✅ Auth URL generated successfully")
    print(f"State: {state}")
    print(f"\n🔗 AUTH URL:")
    print(f"{auth_url}")
    
    print("\n" + "="*60)
    print("MANUAL TEST INSTRUCTIONS:")
    print("="*60)
    print("1. Copy the auth URL above")
    print("2. Open it in your browser")
    print("3. Complete the Instagram login")
    print("4. Copy the ENTIRE redirect URL from your browser")
    print("5. Run this command with your redirect URL:")
    print("   python3 test_with_redirect.py 'YOUR_REDIRECT_URL'")
    print("="*60)
    
else:
    print(f"❌ Failed to get auth URL: {response.text}")
