#!/usr/bin/env python3
"""
Simulate exactly what the callback page does
"""

import requests
import json

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

# Use the OAuth code from your callback URL
code = "AQD2U6IGXPr1CdME486s5uvMrC4Yhm6cylpItG-rTTRDqgV0UyJO6JxGGgCantsGD3z10Vngjv01T2tDyLudcSSvyCTKJf187VNIWedoepa1UG1w7DdXkelP1WkCp9MohmmW0xx09utCypsFWWEVz7keeNfRu3sxffFZ3D8d2oUjuALHhUGGjgrp6ClY-w7uQWEEDUKXnq15M2-gnvXqflARze3LuhVtpXGLoEYF18pfNLhTOcOTGNMrplbv5FjlgiE1WYus3RHNlbUy6L1kHxSohT6ymSFmnlMYLcZcIYQptzFro1SCNWJykdniTo2UnAG5HAV078qnW5AqkQAhpntXYOLZXC5mFWI2LYVWvNkIsiLbDTcJNUupDnGCdecR2Rk"

print("="*60)
print("CALLBACK PAGE SIMULATION")
print("="*60)

print(f"Testing with code: {code[:20]}...")

# Simulate exactly what the callback page does
login_data = {"code": code}

try:
    print("\n1. Calling backend login endpoint...")
    response = requests.post(
        f"{BACKEND_URL}/api/instagram/graph/login",
        json=login_data,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n2. Response data:")
        print(f"  success: {data.get('success')}")
        print(f"  detail: {data.get('detail')}")
        print(f"  error: {data.get('error')}")
        
        if data.get('success'):
            print("\n✅ LOGIN SUCCESSFUL!")
            print(f"Username: {data.get('data', {}).get('username')}")
            print(f"User ID: {data.get('data', {}).get('user_id')}")
            
            # Display session info
            session_info = data.get('session_info', {})
            auth_info = data.get('auth_info', {})
            
            print(f"\n📊 SESSION INFO:")
            for key, value in session_info.items():
                print(f"  {key}: {value}")
            
            print(f"\n🔐 AUTH INFO:")
            for key, value in auth_info.items():
                print(f"  {key}: {value}")
        else:
            print(f"\n❌ LOGIN FAILED!")
            print(f"Error: {data.get('detail') or data.get('error')}")
            
            # This is what the callback page shows as "failure"
            print("\nThis is why the callback page shows 'failure'")
    else:
        print(f"\n❌ REQUEST FAILED!")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
