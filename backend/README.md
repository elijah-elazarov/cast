# Instagram Backend API

FastAPI backend service for Instagram automation using instagrapi.

## Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Backend Server

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Verify Backend is Running

Visit http://localhost:8000/health

## API Endpoints

### POST /api/instagram/login
Login to Instagram

**Request:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "your_username",
    "user_id": "123456789",
    "account_type": "PERSONAL"
  },
  "message": "Successfully connected to Instagram"
}
```

### POST /api/instagram/upload-reel
Upload a Reel video

**Request:** (multipart/form-data)
- `file`: Video file
- `caption`: Caption text (optional)
- `share_to_feed`: Boolean (optional, default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "media_id": "123456789",
    "code": "ABC123",
    "share_to_feed": true
  },
  "message": "Reel uploaded successfully"
}
```

### GET /api/instagram/account-info
Get account information

**Request:** (query parameter)
- `username`: Instagram username

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "your_username",
    "full_name": "Your Name",
    "follower_count": 1000,
    "following_count": 500,
    "media_count": 50,
    "profile_pic_url": "https://..."
  }
}
```

### POST /api/instagram/logout
Logout from Instagram

**Request:**
```json
{
  "username": "your_username"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
# No environment variables needed for basic setup
# In production, add:
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit credentials** - Keep passwords secure
2. **Use HTTPS in production** - Always use SSL/TLS
3. **Rate limiting** - Implement rate limiting to avoid bans
4. **Session management** - Use proper session storage (Redis, database)
5. **ToS compliance** - This method violates Instagram's Terms of Service

## Troubleshooting

### Login Issues

**Error: Invalid username or password**
- Double-check credentials
- Ensure account is not locked

**Error: Login failed**
- Instagram may be blocking login attempts
- Try logging in manually first
- Wait a few minutes and retry

### Upload Issues

**Error: Session expired**
- Re-login to refresh session
- Sessions may expire after inactivity

**Error: Upload failed**
- Check video format (MP4 recommended)
- Ensure video is under 100MB
- Verify video duration is under 90 seconds

## Development

### Running in Development Mode

```bash
uvicorn main:app --reload --port 8000
```

### Testing Endpoints

Use curl or Postman to test:

```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/instagram/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

## Production Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Setup

1. Use environment variables for sensitive data
2. Set up proper session storage (Redis)
3. Implement rate limiting
4. Add monitoring and logging
5. Use HTTPS

## Limitations

- ⚠️ This method violates Instagram's Terms of Service
- ⚠️ Account may be banned or restricted
- ⚠️ Rate limits apply (don't spam)
- ⚠️ Not officially supported by Instagram

## Support

For issues related to instagrapi, check:
- https://github.com/adw0rd/instagrapi
- https://github.com/adw0rd/instagrapi/issues

