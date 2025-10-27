#!/usr/bin/env python3
"""
Test with completely fresh, untouched OAuth code
"""

import requests
import json

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*60)
print("FRESH UNTOUCHED CODE TEST")
print("="*60)

print("1. Get a fresh auth URL...")
response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)

if response.status_code == 200:
    data = response.json()
    auth_url = data.get('data', {}).get('auth_url')
    print(f"✅ Fresh auth URL: {auth_url}")
    
    print("\n2. CRITICAL INSTRUCTIONS:")
    print("   - Open the URL above in a PRIVATE/INCOGNITO window")
    print("   - Complete the login")
    print("   - Copy the redirect URL")
    print("   - DO NOT let the callback page process it")
    print("   - Run: python3 test_immediate.py 'YOUR_REDIRECT_URL'")
    print("\n   This will test the backend BEFORE the callback page processes it")
    
else:
    print(f"❌ Failed to get auth URL: {response.text}")
