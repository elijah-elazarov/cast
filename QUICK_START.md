# Quick Start Guide - Direct Login Setup

## Prerequisites

- Python 3.8+ installed
- Node.js 22.11.0 (use `nvm use 22.11.0`)
- Instagram account credentials

## Step 1: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 2: Start Backend Server

```bash
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Step 3: Start Frontend

In a new terminal:

```bash
cd /Users/eliyahu/Desktop/linkme/cast
nvm use 22.11.0
npm run dev
```

## Step 4: Access the Application

Open http://localhost:3000 in your browser

## Step 5: Connect Instagram

1. Click "Connect Instagram" button
2. Enter your Instagram username and password
3. Click "Login"
4. Wait for connection confirmation

## Step 6: Upload a Reel

1. Once connected, the upload section will appear
2. Drag and drop a video file or click to browse
3. Add a caption (optional)
4. Click "Upload to Instagram"
5. Wait for upload to complete

## Troubleshooting

### Backend won't start

```bash
# Check if port 8000 is already in use
lsof -i :8000

# Kill the process if needed
kill -9 <PID>
```

### Frontend can't connect to backend

Make sure the backend is running on http://localhost:8000

### Login fails

- Double-check your username and password
- Make sure 2FA is disabled (for testing)
- Try logging in manually to Instagram first

### Upload fails

- Check video format (MP4 recommended)
- Ensure video is under 100MB
- Video should be under 90 seconds

## Important Warnings

⚠️ **Using this method violates Instagram's Terms of Service**

- Your account may be banned or restricted
- Use at your own risk
- Don't spam or abuse the API
- Consider using the official API for production

## Next Steps

- Add rate limiting
- Implement proper session storage
- Add error handling and retries
- Set up monitoring

