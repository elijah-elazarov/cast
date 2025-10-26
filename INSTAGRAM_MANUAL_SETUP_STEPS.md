# Instagram Integration - Manual Setup Steps

## Prerequisites Checklist

Before starting, make sure you have:
- ✅ A Facebook account
- ✅ An Instagram Business or Creator account
- ✅ Admin access to a Facebook Page (or ability to create one)
- ✅ Your Instagram account connected to the Facebook Page

---

## Step 1: Create Facebook App

### 1.1 Go to Facebook Developers
1. Open: https://developers.facebook.com/
2. Click **"My Apps"** (top right)
3. Click **"Create App"**

### 1.2 Choose App Type
1. Select **"Business"** as the app type
2. Click **"Next"**

### 1.3 Fill in App Details
```
App Name: Cast - Social Media Publisher
App Contact Email: [your-email@example.com]
```

3. Click **"Create App"**
4. Complete the security check if prompted

### What to Note Down:
- **App ID**: Found in Dashboard → Settings → Basic
- **App Secret**: Found in Settings → Basic (click "Show" to reveal)

---

## Step 2: Add Instagram Product

### 2.1 Add Instagram to Your App
1. In your app dashboard, scroll to **"Products"** section
2. Find **"Instagram"** in the list
3. Click **"Set Up"** button

### 2.2 Configure Instagram Basic Display
1. Go to **"Instagram Basic Display"** settings
2. Click **"Create New App"** or **"Set Up"**
3. Fill in the required fields:
   ```
   Display Name: Cast Social Media Publisher
   Valid OAuth Redirect URIs: http://localhost:3000/auth/instagram/callback
   ```

### 2.3 Add Instagram Graph API Product
1. In Products section, find **"Instagram Graph API"**
2. Click **"Set Up"**

### What Happens Next:
You'll be on the Instagram Graph API configuration page.

---

## Step 3: Configure OAuth Redirect URIs

### 3.1 Go to Facebook Login Settings
1. In the left sidebar, click **"Settings"** → **"Basic"**
2. Scroll to **"Add Platform"**
3. Click **"Website"**
4. Add your site URL:
   ```
   Site URL: http://localhost:3000
   ```

### 3.2 Configure OAuth Redirect URIs
1. Still in Settings → Basic, scroll to **"Valid OAuth Redirect URIs"**
2. Click **"Add URI"**
3. Add these URIs (one at a time):
   ```
   http://localhost:3000/auth/instagram/callback
   https://yourdomain.com/auth/instagram/callback (for production later)
   ```

---

## Step 4: Connect Instagram to Facebook Page

### 4.1 Create/Select a Facebook Page
1. Go to: https://www.facebook.com/pages/create
2. Create a new Page OR use an existing one
3. Make sure you're an **Admin** of the Page

### 4.2 Connect Instagram Account to Page
1. Go to your Facebook Page
2. Click **"Settings"** (left sidebar)
3. Click **"Instagram"** in the left menu
4. Click **"Connect Account"**
5. Enter your Instagram Business/Creator account credentials
6. Confirm connection

### Verification:
- Your Instagram account should now appear in Page Settings → Instagram
- Note the Instagram username displayed

---

## Step 5: Configure App Permissions

### 5.1 Go to App Settings
1. Back in Facebook Developers dashboard
2. Your App → **"App Review"** → **"Permissions and Features"**

### 5.2 Request Required Permissions
Request these permissions (if not already approved):
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`

### For Development Mode:
- Add your Facebook account as a tester
- Click **"Add People"** → Enter your email
- They'll receive an invitation

---

## Step 6: Add Environment Variables

### 6.1 Update Backend Environment

Open `backend/.env` and add:

```env
# Facebook/Instagram App Credentials
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

# Base URLs
BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

**Replace:**
- `your_app_id_here` with your **App ID** from Step 1.3
- `your_app_secret_here` with your **App Secret** from Step 1.3

### 6.2 Update Frontend Environment

Open `.env.local` (or create it) and add:

```env
BACKEND_URL=http://localhost:8000
```

---

## Step 7: Test the Integration

### 7.1 Start Backend Server
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 7.2 Start Frontend Server
```bash
npm run dev
```

### 7.3 Test OAuth Flow
1. Open: http://localhost:3000
2. Click **"Connect with Instagram"**
3. You should be redirected to Facebook login
4. Log in with your Facebook account
5. Authorize the app
6. You should be redirected back with success message

### What to Watch For:
- ✅ Smooth redirect to Facebook login
- ✅ Successful authorization
- ✅ Redirect back to app with success message
- ✅ Instagram connection appears as "Connected"

---

## Troubleshooting

### Issue: "No Facebook Pages found"
**Solution:**
- Create a Facebook Page at https://www.facebook.com/pages/create
- Connect Instagram to the Page (Step 4)
- Ensure you're Admin of the Page

### Issue: "No Instagram Business account connected"
**Solution:**
- Go to Facebook Page Settings → Instagram
- Click "Connect Account"
- Use Instagram Business/Creator account (not personal)

### Issue: "Invalid redirect_uri"
**Solution:**
- Check `INSTAGRAM_REDIRECT_URI` in `backend/.env`
- Ensure it matches exactly in Facebook App Settings
- Check for trailing slashes

### Issue: "App Not Approved"
**Solution:**
- Submit for App Review (can take 3-7 days)
- For testing, add your account as a tester in App Settings

---

## Next Steps After Testing

### 1. Submit for App Review (Production)
1. Go to App Review → Permissions and Features
2. Request `instagram_content_publish` permission
3. Provide screencast and use case
4. Submit for review

### 2. Add Production URLs
Once app is approved and you have a production domain:
1. Update `backend/.env`:
   ```env
   BASE_URL=https://your-backend.onrender.com
   FRONTEND_URL=https://your-frontend.vercel.app
   INSTAGRAM_REDIRECT_URI=https://your-frontend.vercel.app/auth/instagram/callback
   ```
2. Add production OAuth redirect URI in Facebook App Settings
3. Deploy to production

---

## Quick Reference: What You Need

| Item | Where to Find |
|------|---------------|
| App ID | Dashboard → Settings → Basic |
| App Secret | Settings → Basic (click Show) |
| Redirect URI | Your app's callback URL |
| Instagram Account | Must be Business/Creator type |
| Facebook Page | Must be created and linked |

---

## Support

If you encounter issues:
1. Check backend logs: Look for error messages
2. Check browser console: Look for errors in Network tab
3. Verify environment variables are set correctly
4. Ensure Instagram account is Business/Creator
5. Ensure Facebook Page is connected to Instagram

---

## Success Checklist

- [ ] Facebook App created
- [ ] Instagram product added to app
- [ ] OAuth redirect URIs configured
- [ ] Instagram connected to Facebook Page
- [ ] App permissions configured
- [ ] Environment variables set
- [ ] Backend server running
- [ ] Frontend server running
- [ ] OAuth flow works successfully
- [ ] Instagram connection appears as "Connected"
