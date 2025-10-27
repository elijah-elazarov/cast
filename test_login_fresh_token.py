#!/usr/bin/env python3
import requests, json

user_token = "EAAKMJfu1clsBP9Cm2Yy0lft7VGk9fggb0DLjkBBtdix0NxExZA4I4NMa9YjfK6yDdz3Hk78ryHrY1FXvf33pVTXUaoJAgb3jw7TloJLUpnaSB6aqKNGtesV61ip0XqNHrxKIbif1ajRq9zy7WjbS82yZBfUnaTcs0BXJwngfKpWK6s9FJbXvUB4SLvPbEuNAkbXkgZCoyhkRukHqZCJIdcmUiNpVjGiBXgZDZD"

response = requests.get("https://graph.facebook.com/v21.0/me/accounts", params={"access_token": user_token, "fields": "id,name,access_token,instagram_business_account"}, timeout=30)

if response.status_code == 200:
    data = response.json()
    pages = data.get('data', [])
    print(f"Found {len(pages)} pages:")
    for page in pages:
        print(f"  {page.get('name')} - Instagram: {bool(page.get('instagram_business_account'))}")
else:
    print(f"Error: {response.text}")
