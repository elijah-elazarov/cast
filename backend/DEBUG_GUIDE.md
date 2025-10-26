# Instagram Connection Debug Guide

This guide helps you debug Instagram Graph API connections and understand what's available.

## 🔧 Debug Scripts

### 1. Basic Connection Test
```bash
cd backend
python debug_instagram_connection.py
```
This tests basic functionality without an access token.

### 2. Full OAuth Flow Test
```bash
cd backend
python test_oauth_flow.py <authorization_code>
```
This tests the complete OAuth flow with a real authorization code.

## 🚀 How to Get an Authorization Code

1. **Go to your app**: https://your-frontend.vercel.app
2. **Click "Connect with Instagram"**
3. **Complete the OAuth flow** (select pages and Instagram account)
4. **Copy the 'code' parameter** from the callback URL
5. **Run the test script** with that code

## 📊 What the Scripts Test

### Basic Tests (without access token):
- ✅ Instagram Graph API credentials configuration
- ✅ OAuth URL generation
- ✅ API endpoint accessibility

### Full Tests (with access token):
- ✅ Access token validation
- ✅ User information retrieval
- ✅ Facebook Pages retrieval
- ✅ Instagram Business account connection
- ✅ Instagram account details
- ✅ Media retrieval capabilities
- ✅ Posting capabilities (test mode)

## 🔍 Understanding the Output

### Successful Connection:
```
✅ Access token is valid
✅ Found 2 Facebook pages
✅ Instagram Business Account Connected
✅ Retrieved 15 media items
🎉 OAUTH FLOW TEST COMPLETED SUCCESSFULLY!
```

### Common Issues:

#### "No Facebook pages found"
- Your Facebook account doesn't have any pages
- The pages aren't accessible via the Graph API
- Missing `pages_show_list` permission

#### "No Instagram Business accounts found"
- Your Instagram account isn't a Business/Creator account
- Your Instagram account isn't connected to a Facebook Page
- The connection isn't properly configured

#### "Access token validation failed"
- The authorization code is invalid or expired
- The redirect URI doesn't match
- The app configuration is incorrect

## 🛠️ Troubleshooting Steps

1. **Run the basic test first**:
   ```bash
   python debug_instagram_connection.py
   ```

2. **If basic test passes, get an authorization code** and run:
   ```bash
   python test_oauth_flow.py <your_code>
   ```

3. **Check the detailed logs** to see exactly where the process fails

4. **Verify your Facebook Page setup**:
   - Go to Facebook Business Manager
   - Check that your Page is listed
   - Verify Instagram is connected to the Page

5. **Verify your Instagram account**:
   - Make sure it's a Business or Creator account
   - Check that it's connected to a Facebook Page
   - Verify the connection in Instagram settings

## 📝 Log Analysis

The scripts provide detailed logging at each step. Look for:
- `✅` - Success indicators
- `❌` - Error indicators  
- `⚠️` - Warning indicators
- `ℹ️` - Information indicators

Each step shows exactly what data is being retrieved and what's available.

## 🔄 Next Steps

Once the debug scripts show a successful connection, your Instagram integration should work properly. If there are still issues, the detailed logs will help identify the specific problem.
