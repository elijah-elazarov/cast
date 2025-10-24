# Instagram Graph API Setup Guide - 2025

## Overview
This guide will help you set up Instagram Graph API integration for login and posting functionality using the latest 2025 API requirements.

## Prerequisites
- Facebook Developer Account
- Instagram Business or Creator Account
- Facebook Page connected to Instagram account
- Cloud storage service (AWS S3, Google Cloud, etc.)

## Step 1: Facebook App Setup

### 1.1 Create Facebook App
1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as app type
4. Fill in app details:
   - App Name: "Cast - Social Media Publisher"
   - App Contact Email: your-email@example.com
   - App Purpose: "Business"

### 1.2 Configure Instagram Product
1. In your app dashboard, go to "Add Product"
2. Find "Instagram" and click "Set Up"
3. Enable "Instagram Graph API"

### 1.3 Configure Facebook Login
1. Go to "Facebook Login" → "Settings"
2. Add Valid OAuth Redirect URIs:
   - `http://localhost:3000/auth/instagram/callback` (development)
   - `https://yourdomain.com/auth/instagram/callback` (production)

## Step 2: App Configuration

### 2.1 Basic Settings
- App Domains: your-domain.com
- Privacy Policy URL: https://your-domain.com/privacy
- Terms of Service URL: https://your-domain.com/terms

### 2.2 Instagram Graph API Settings
- Instagram Basic Display: Enabled
- Instagram Graph API: Enabled
- Permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`

## Step 3: Environment Variables

Add to your backend `.env` file:

```env
# Facebook/Instagram App Credentials
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

# Cloud Storage (choose one)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# Or Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name
```

## Step 4: Required Permissions

Your app needs these permissions:
- `instagram_basic`: Access to basic profile information
- `instagram_content_publish`: Permission to publish content
- `pages_show_list`: Access to pages user manages
- `pages_read_engagement`: Read engagement metrics

## Step 5: Instagram Account Requirements

Users must have:
- Instagram Business or Creator account
- Facebook Page connected to Instagram account
- Admin or Editor role on the connected Facebook Page

## Step 6: Video Upload Requirements

Instagram Graph API requires:
- Videos must be publicly accessible via HTTPS
- Maximum file size: 100MB
- Supported formats: MP4, MOV
- Duration: 3 seconds to 60 seconds for Reels
- Resolution: Minimum 720p

## Step 7: Testing

### 7.1 Add Test Users
1. Go to "Roles" → "Test Users"
2. Add test users with Instagram Business accounts
3. Test the complete flow

### 7.2 App Review Process
Before going live:
1. Submit app for review
2. Provide detailed use case description
3. Include screencast of functionality
4. Wait for approval (can take several days)

## Step 8: Production Deployment

### 8.1 Switch to Live Mode
1. Complete app review process
2. Switch app from Development to Live mode
3. Update redirect URIs for production domain

### 8.2 Monitor Usage
- Track API usage and rate limits
- Monitor error rates and user feedback
- Keep app updated with latest API changes

## Troubleshooting

### Common Issues:
1. **"App Not Approved"**: Ensure app review is completed
2. **"Invalid Redirect URI"**: Check OAuth redirect URIs match exactly
3. **"User Not Connected"**: Ensure user has Business/Creator account with connected Facebook Page
4. **"Video Upload Failed"**: Check video format, size, and accessibility

### Support Resources:
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Facebook for Developers Community](https://developers.facebook.com/community/)
- [Instagram Platform Policies](https://developers.facebook.com/policy/)

## Next Steps

After completing this setup:
1. Implement OAuth flow in backend
2. Create styled login UI
3. Implement video upload functionality
4. Test complete flow
5. Deploy to production
