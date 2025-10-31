'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// Image not used; using native img for TikTok avatars

interface UserInfo {
  id?: string;
  username?: string;
  email?: string;
  displayName?: string;
  userId?: string;
  avatarUrl?: string;
  followerCount?: string;
  followingCount?: string;
  videoCount?: string;
  likeCount?: string;
  isVerified?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface TikTokBackendResponse {
  success: boolean;
  data: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
    follower_count?: string;
    following_count?: string;
    video_count?: string;
    like_count?: string;
    is_verified?: boolean;
  };
  message: string;
}

// TikTok API configuration
const TIKTOK_CONFIG = {
  clientKey: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'your-client-key',
  scope: 'user.info.basic,user.info.profile,user.info.stats,video.upload,video.publish,video.list',
  redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/tiktok/callback`,
  apiVersion: 'v2'
};

// Cloudinary configuration
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_TIKTOK || 'tiktok_uploads';

export default function TikTokShortsDebugger() {
  const hasInitialized = useRef<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null,
    accessToken: null,
    refreshToken: null
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [videosReady, setVideosReady] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoTags, setVideoTags] = useState('');
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    size: string;
    sizeMB: number;
    type: string;
    duration?: number;
    width?: number;
    height?: number;
    previewUrl?: string;
  } | null>(null);

  // OAuth countdown state
  const [oauthCountdownSeconds, setOauthCountdownSeconds] = useState<number | null>(null);
  const oauthCountdownIntervalRef = useRef<number | null>(null);

  // Add log function
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev, logEntry]);
    console.log(`[TIKTOK SHORTS DEBUG] ${message}`);
  }, []);

  // Derive category/level styling for logs
  const getLogMeta = useCallback((line: string) => {
    const lower = line.toLowerCase();
    
    let category: 'auth' | 'process' | 'upload' | 'validate' | 'logout' | 'config' | 'other' = 'other';
    if (lower.includes('auth') || lower.includes('login') || lower.includes('token') || lower.includes('oauth')) category = 'auth';
    else if (lower.includes('process') || lower.includes('generating') || lower.includes('cloudinary')) category = 'process';
    else if (lower.includes('upload') || lower.includes('publish') || lower.includes('posting')) category = 'upload';
    else if (lower.includes('validate') || lower.includes('status') || lower.includes('checking')) category = 'validate';
    else if (lower.includes('logout')) category = 'logout';
    else if (lower.includes('initialized') || lower.includes('configuration') || lower.includes('ready')) category = 'config';

    let level: 'ok' | 'warn' | 'error' | 'info' = 'info';
    if (lower.includes('❌') || lower.includes('error') || lower.includes('failed')) level = 'error';
    else if (lower.includes('⚠️') || lower.includes('warning')) level = 'warn';
    else if (lower.includes('✅') || lower.includes('success')) level = 'ok';

    const levelColor =
      level === 'ok' ? 'text-green-400' : level === 'warn' ? 'text-yellow-300' : level === 'error' ? 'text-red-400' : 'text-gray-200';
    
    const categoryColor =
      category === 'auth' ? 'bg-blue-600' :
      category === 'process' ? 'bg-cyan-600' :
      category === 'upload' ? 'bg-green-600' :
      category === 'validate' ? 'bg-orange-600' :
      category === 'logout' ? 'bg-slate-600' :
      category === 'config' ? 'bg-indigo-600' :
      'bg-gray-600';

    return { category, level, levelColor, categoryColor };
  }, []);

  // Check if already authenticated (for silent refresh)
  const checkExistingAuth = (): boolean => {
    if (!authState.isAuthenticated || !authState.userInfo) {
      return false;
    }
    
    // If already authenticated, just refresh the UI state silently
    addLog('Already authenticated, refreshing auth data...');
    addLog(`✅ Authenticated as: ${authState.userInfo.displayName || 'TikTok User'}`);
    if (authState.userInfo.userId) {
      addLog(`📺 User ID: ${authState.userInfo.userId}`);
    }
    if (authState.userInfo.followerCount) {
      addLog(`👥 Followers: ${authState.userInfo.followerCount}`);
    }
    addLog('Authentication refreshed successfully!');
    return true;
  };

  // TikTok OAuth flow
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Do NOT clear previous logs; add a clear session separator and start logs
    addLog('— New TikTok authentication session —');
    addLog('Initializing TikTok authentication...');
    
    // Start visible countdown (120s)
    setOauthCountdownSeconds(120);
    if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
    oauthCountdownIntervalRef.current = window.setInterval(() => {
      setOauthCountdownSeconds(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    try {
      addLog('Starting TikTok Shorts authentication...');
      
      // First check if already authenticated
      const isRefreshed = checkExistingAuth();
      if (isRefreshed) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
        setOauthCountdownSeconds(null);
        return;
      }
      
      addLog('Creating authentication popup...');
      
      // IMPORTANT: Open a blank popup immediately on user gesture to avoid blockers
      const popupWidth = 640;
      const popupHeight = 655;
      const features = `width=${popupWidth},height=${popupHeight},scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no`;

      const popup = window.open('', 'tiktok-oauth', features);
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      try {
        popup.document.title = 'Connecting to TikTok…';
      } catch {}
      try {
        popup.focus();
      } catch {}
      addLog(`Popup metrics -> width:${popupWidth}, height:${popupHeight} (browser-positioned)`);

      // Get auth URL from backend
      const response = await fetch('/api/tiktok/auth-url');
      const data = await response.json();
      
      if (!data.success) {
        popup.close();
        throw new Error(data.error || 'Failed to get auth URL');
      }

      addLog('Opening TikTok authentication popup...');
      popup.location.href = data.auth_url;

      let completed = false;
      let checkClosedInterval: NodeJS.Timeout | null = null;

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'TIKTOK_AUTH_SUCCESS') {
          completed = true;
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          handleAuthSuccess(event.data.authData);
          popup.close();
          window.removeEventListener('message', messageHandler);
          stopCountdown();
        } else if (event.data.type === 'TIKTOK_AUTH_ERROR') {
          completed = true;
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          addLog(`TikTok authentication failed: ${event.data.error}`);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: `TikTok authorization failed: ${event.data.error}`
          }));
          popup.close();
          window.removeEventListener('message', messageHandler);
          stopCountdown();
        }
      };

      window.addEventListener('message', messageHandler);

      checkClosedInterval = setInterval(() => {
        if (popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          window.removeEventListener('message', messageHandler);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: completed ? prev.error : 'Login cancelled or window closed before completing authentication'
          }));
          stopCountdown();
        }
      }, 1000);

      // Failsafe timeout
      setTimeout(() => {
        if (!completed && !popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          try { popup.close(); } catch {}
          window.removeEventListener('message', messageHandler);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Authentication timed out. Please try again.'
          }));
          stopCountdown();
        }
      }, 2 * 60 * 1000); // 2 minutes

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Authentication error: ${errorMessage}`);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      stopCountdown();
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authData: TikTokBackendResponse) => {
    try {
      addLog('Processing authentication data...');
      
      if (!authData || !authData.data) {
        throw new Error('Invalid authentication data');
      }
      
      const userData = authData.data;
      addLog(`🔍 Debug - Received data: ${JSON.stringify(userData)}`);
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          displayName: userData.display_name,
          userId: userData.user_id,
          avatarUrl: userData.avatar_url,
          followerCount: userData.follower_count,
          followingCount: userData.following_count,
          videoCount: userData.video_count,
          likeCount: userData.like_count,
          isVerified: userData.is_verified
        },
        accessToken: 'stored_in_backend',
        refreshToken: 'stored_in_backend'
      });

      addLog(`✅ Authenticated as: ${userData.display_name}`);
      addLog(`📺 User ID: ${userData.user_id}`);
      if (userData.follower_count) {
        addLog(`👥 Followers: ${userData.follower_count}`);
      }
      addLog('Authentication completed successfully!');
      // Dispatch custom event for TokenManager and other components
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'tiktok' } }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Auth success processing error: ${errorMessage}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Authentication processing failed: ${errorMessage}`
      }));
    }
  };

  // Countdown management
  const stopCountdown = () => {
    if (oauthCountdownIntervalRef.current) {
      window.clearInterval(oauthCountdownIntervalRef.current);
      oauthCountdownIntervalRef.current = null;
    }
    setOauthCountdownSeconds(null);
  };

  // Logout
  const handleLogout = async () => {
    addLog('Logging out from TikTok...');
    
    // Check if user is authenticated (similar to FB.getLoginStatus() check)
    if (!authState.isAuthenticated && !localStorage.getItem('tiktok_user_id')) {
      addLog('⚠️ No active TikTok session found, clearing local state only');
      // Clear any remaining state
      localStorage.removeItem('tiktok_user_id');
      localStorage.removeItem('tiktok_display_name');
      localStorage.removeItem('tiktok_avatar_url');
      localStorage.removeItem('tiktok_follower_count');
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userInfo: null,
        accessToken: null,
        refreshToken: null
      });
      setSelectedFile(null);
      setProcessedVideoUrl(null);
      setVideosReady(false);
      setFileDetails(null);
      addLog('Logged out from TikTok successfully');
      return;
    }
    
    // User is authenticated, validate token then revoke
    const userId = authState.userInfo?.userId || localStorage.getItem('tiktok_user_id');
    
    if (userId) {
      try {
        addLog('🔍 Validating TikTok access token...');
        // Use Next.js API proxy to call backend (matching UnifiedVideoUploader)
        const response = await fetch('/api/tiktok/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await response.json();
        if (data.success) {
          if (data.token_valid === true) {
            addLog('✅ TikTok access token validated (token was active)');
            addLog('✅ TikTok access token revoked on TikTok servers via /oauth/revoke/ endpoint');
          } else if (data.token_valid === false) {
            addLog('⚠️ TikTok access token was already invalid/expired (skipping revoke)');
          } else {
            addLog('✅ TikTok logout processed');
          }
          addLog('✅ Local session cleared - logout complete');
        } else {
          addLog(`⚠️ Backend logout warning: ${data.detail || data.message || data.error || 'Unknown error'}`);
        }
      } catch (err) {
        addLog(`⚠️ Backend logout error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Continue with local logout even if backend call fails
      }
    }
    
    // Set explicit logout flag in sessionStorage (prevents auto-reconnection)
    // This persists only for this tab session, ensuring logout applies until tab is closed
    sessionStorage.setItem('tiktok_explicit_logout', 'true');
    
    // Clear localStorage (matching UnifiedVideoUploader)
    localStorage.removeItem('tiktok_user_id');
    localStorage.removeItem('tiktok_display_name');
    localStorage.removeItem('tiktok_avatar_url');
    localStorage.removeItem('tiktok_follower_count');
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null,
      accessToken: null,
      refreshToken: null
    });
    setSelectedFile(null);
    setProcessedVideoUrl(null);
    setVideosReady(false);
    setFileDetails(null);
    
    addLog('Logged out from TikTok successfully');
    // Dispatch custom event for TokenManager and other components
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'tiktok' } }));
  };

  // File selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    addLog(`Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      addLog('❌ Please select a video file');
      return;
    }

    // Validate file size (TikTok has 128MB limit)
    const maxSizeMB = 128;
    if (file.size > maxSizeMB * 1024 * 1024) {
      addLog(`❌ File too large. Max size: ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
    
    // Build initial details
    const sizeMB = +(file.size / (1024 * 1024)).toFixed(2);
    const details = {
      name: file.name,
      size: `${sizeMB} MB`,
      sizeMB,
      type: file.type || 'video/mp4',
    } as {
      name: string; size: string; sizeMB: number; type: string; width?: number; height?: number; duration?: number; previewUrl?: string;
    };

    // Create a preview URL and read metadata for resolution/duration
    try {
      const url = URL.createObjectURL(file);
      details.previewUrl = url;
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = url;
      videoEl.onloadedmetadata = () => {
        details.width = (videoEl.videoWidth || undefined);
        details.height = (videoEl.videoHeight || undefined);
        details.duration = +(videoEl.duration || 0).toFixed(2);
        setFileDetails({ ...details });
        // We keep the preview URL for inline preview; do not revoke yet
      };
      videoEl.onerror = () => {
        setFileDetails({ ...details });
      };
    } catch {
      setFileDetails({ ...details });
    }

    // Validate video for TikTok Shorts
    validateVideoForTikTok(file);
  };

  // Validate video for TikTok Shorts
  const validateVideoForTikTok = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = URL.createObjectURL(file);
      
      videoEl.onloadedmetadata = () => {
        const duration = videoEl.duration;
        const width = videoEl.videoWidth;
        const height = videoEl.videoHeight;
        
        addLog(`📏 Video dimensions: ${width}x${height}`);
        addLog(`⏱️ Video duration: ${duration.toFixed(2)}s`);
        
        // Check duration (max 60 seconds for TikTok Shorts)
        if (duration > 60) {
          addLog('❌ Video too long. TikTok Shorts must be 60 seconds or less');
          addLog(`⚠️ Your video is ${duration.toFixed(2)}s, but TikTok Shorts limit is 60s`);
          addLog('📝 Video will be trimmed to 60 seconds during processing');
          // Allow upload but warn - Cloudinary can trim duration if needed
        } else {
          addLog('✅ Video duration is within TikTok Shorts limit (≤60s)');
        }
        
        // Check aspect ratio (should be 9:16 for Shorts, but TikTok is flexible)
        const aspectRatio = width / height;
        const expectedRatio = 9 / 16; // 0.5625
        const tolerance = 0.2; // 20% tolerance
        
        if (Math.abs(aspectRatio - expectedRatio) > tolerance) {
          addLog(`⚠️ Aspect ratio ${aspectRatio.toFixed(3)} is not ideal for TikTok Shorts (9:16 = ${expectedRatio.toFixed(3)})`);
          addLog('📝 Video will be cropped to 9:16 during processing');
        } else {
          addLog('✅ Aspect ratio is good for TikTok Shorts');
        }
        
        addLog('✅ File validation passed');
        URL.revokeObjectURL(videoEl.src);
        resolve(true);
      };
      
      videoEl.onerror = () => {
        addLog('❌ Could not load video metadata');
        URL.revokeObjectURL(videoEl.src);
        resolve(false);
      };
    });
  };

  // Process video for TikTok
  const processVideoForTikTok = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setVideosReady(false);

    try {
      addLog('🎬 Processing video for TikTok Shorts...');
      setProcessingProgress(10);

      // Upload to Cloudinary with TikTok-specific transformations
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'tiktok_uploads');

      addLog('📤 Uploading to Cloudinary...');
      setProcessingProgress(30);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const uploadData = await uploadResponse.json();
      addLog('✅ Upload successful');
      setProcessingProgress(60);

      // Generate TikTok-optimized video URL with transformations:
      // - c_fill: Crop and fill to exact dimensions (9:16 aspect ratio)
      // - w_1080,h_1920: TikTok optimal resolution (max 1080x1920)
      // - f_mp4: MP4 format (required by TikTok)
      // - q_auto:best: Auto quality optimization
      // - so_0,eo_60: Trim from start (0s) to 60 seconds max (TikTok Shorts limit)
      const tiktokTransformUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_1080,h_1920,f_mp4,q_auto:best,so_0,eo_60/${uploadData.public_id}.mp4`;

      addLog('🔄 Generating TikTok-optimized video...');
      setProcessingProgress(80);

      // Validate the transformed video (best-effort; Cloudinary may delay availability)
      let ready = false;
      for (let i = 0; i < 3; i++) {
        const resp = await fetch(tiktokTransformUrl, { method: 'HEAD' });
        if (resp.ok) { ready = true; break; }
        await new Promise(r => setTimeout(r, 600));
      }
      if (!ready) addLog('⚠️ Proceeding even though HEAD validation did not pass yet');

      setProcessedVideoUrl(tiktokTransformUrl);
      setProcessingProgress(100);
      setVideosReady(true);

      addLog('🎉 Video processing complete! Ready for TikTok upload');
      addLog(`📹 TikTok URL: ${tiktokTransformUrl}`);

    } catch (error) {
      addLog(`❌ Processing error: ${error}`);
      setVideosReady(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload to TikTok
  const uploadToTikTok = async () => {
    if (!processedVideoUrl || !authState.userInfo?.userId) return;

    addLog('Testing TikTok Shorts upload...');
    addLog(`📹 Using processed video: ${processedVideoUrl}`);
    addLog(`📝 Title: ${videoTitle}`);
    addLog(`📄 Description: ${videoDescription || 'No description'}`);
    addLog(`🏷️ Tags: ${videoTags || 'No tags'}`);

    try {
      // Send video_url directly to backend (backend will download from Cloudinary)
      // This avoids "Body is disturbed or locked" error and 413 (Payload Too Large) errors
      addLog('📤 Preparing upload to TikTok via backend...');
      addLog(`📹 Using processed video URL: ${processedVideoUrl}`);
      addLog('💡 Backend will download video directly from Cloudinary');
      
      // Create form data for backend upload (backend accepts 'video_url' or 'video' file)
      const formData = new FormData();
      formData.append('video_url', processedVideoUrl);
      formData.append('description', videoTitle || videoDescription || '');
      formData.append('user_id', authState.userInfo.userId);
      
      addLog('📤 Uploading to TikTok via backend...');
      const response = await fetch(`/api/tiktok/upload-video`, {
        method: 'POST',
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      if (!response.ok) {
        let detail = 'Unknown error';
        try {
          const errorData = await response.json();
          detail = errorData.detail || errorData.error || JSON.stringify(errorData);
        } catch {
          const text = await response.text();
          detail = text || detail;
        }
        throw new Error(`Backend upload failed: ${detail}`);
      }

      const data = await response.json();
      // Always show raw backend response for debugging
      addLog(`🧾 Backend response: ${JSON.stringify(data)}`);

      // Treat inbox-ready message as success and surface publish_id when present
      if (data.success) {
        const publishId = data.publish_id || (data.data && data.data.publish_id);
        if (publishId) addLog(`📨 TikTok inbox publish_id: ${publishId}`);
        addLog('✅ Upload sent to TikTok. Open the TikTok app to finish posting.');
      } else {
        addLog(`❌ Upload failed: ${data.detail || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      addLog(`❌ Upload error: ${error}`);
    }
  };

  // Add initial welcome logs when component mounts (guarded for React Strict Mode)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    addLog('🎵 TikTok Shorts Debugger initialized');
    addLog('📋 Configuration loaded');
    addLog(`🔑 Client Key: ${TIKTOK_CONFIG.clientKey.substring(0, 8)}...`);
    addLog(`📦 Upload Preset: ${UPLOAD_PRESET}`);
    addLog('✅ Ready to connect and upload videos to TikTok');
    addLog('👆 Click "Connect TikTok" to begin authentication');
  }, [addLog]);

  // Sync auth state with localStorage changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only react to TikTok-related localStorage changes
      if (e.key && e.key.startsWith('tiktok_')) {
        const userId = localStorage.getItem('tiktok_user_id');
        const displayName = localStorage.getItem('tiktok_display_name');

        if (userId && displayName) {
          // Auth state exists in localStorage - sync it
          if (!authState.isAuthenticated) {
            addLog('🔄 Syncing auth state from localStorage (change detected)...');
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              userInfo: {
                userId: userId,
                displayName: displayName,
                avatarUrl: localStorage.getItem('tiktok_avatar_url') || ''
              },
              accessToken: null,
              refreshToken: null
            });
            addLog('✅ Auth state synced from localStorage');
            // Dispatch custom event for TokenManager
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'tiktok' } }));
          }
        } else {
          // Auth state removed from localStorage - clear state (unless explicitly logged out in this tab)
          if (authState.isAuthenticated && !sessionStorage.getItem('tiktok_explicit_logout')) {
            addLog('🔄 Clearing auth state (logout detected in another component)...');
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              error: null,
              userInfo: null,
              accessToken: null,
              refreshToken: null
            });
            setSelectedFile(null);
            setProcessedVideoUrl(null);
            setVideosReady(false);
            setFileDetails(null);
            addLog('✅ Auth state cleared');
            // Dispatch custom event for TokenManager
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'tiktok' } }));
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authState.isAuthenticated]); // Only re-run when auth state changes

  // Check for OAuth callback success/error from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tiktokConnected = urlParams.get('tiktok_connected');
    const tiktokError = urlParams.get('tiktok_error');
    const tiktokUserId = urlParams.get('tiktok_user_id');
    const tiktokDisplayName = urlParams.get('tiktok_display_name');
    const tiktokAvatarUrl = urlParams.get('tiktok_avatar_url');

    if (tiktokConnected === 'true' && tiktokUserId) {
      addLog('TikTok authentication successful!');
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          displayName: tiktokDisplayName || 'TikTok User',
          userId: tiktokUserId,
          avatarUrl: tiktokAvatarUrl || undefined
        },
        accessToken: 'stored_in_backend',
        refreshToken: 'stored_in_backend'
      });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (tiktokError) {
      addLog(`TikTok authentication error: ${tiktokError}`);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: `TikTok authentication failed: ${tiktokError}`
      }));
    }
  }, [addLog]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🎵 TikTok Shorts Debugger</h2>
        <p className="text-gray-600">Debug component to test TikTok Shorts upload authentication and video processing.</p>
      </div>

      {/* Authentication Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Authentication Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-700">Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-gray-700">Error: {authState.error ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isLoading ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
            <span className="text-gray-700">Loading: {authState.isLoading ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${videosReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-gray-700">Video Ready: {videosReady ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className={`mb-6 p-4 rounded-lg border bg-yellow-50 border-yellow-200 ${!authState.isAuthenticated ? 'opacity-50' : ''}`}>
        <h3 className={`text-lg font-semibold mb-2 ${!authState.isAuthenticated ? 'text-gray-500' : 'text-yellow-700'}`}>
          Select Video {!authState.isAuthenticated && '(Sign in required)'}
        </h3>
        <label className={`inline-flex items-center px-4 py-2 rounded cursor-pointer ${!authState.isAuthenticated ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>
          <span className="font-medium">Choose file</span>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={!authState.isAuthenticated}
            className="hidden"
          />
        </label>
        {fileDetails && (
          <div className="mt-3 text-sm text-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-medium">{fileDetails.name}</div>
                <div className="text-gray-600">{fileDetails.type} • {fileDetails.sizeMB} MB{fileDetails.duration ? ` • ${fileDetails.duration}s` : ''}</div>
                {(fileDetails.width && fileDetails.height) && (
                  <div className="text-gray-600">Resolution: {fileDetails.width} × {fileDetails.height}</div>
                )}
              </div>
              {fileDetails.previewUrl && (
                <video
                  src={fileDetails.previewUrl}
                  className="w-28 h-48 object-cover rounded border"
                  controls
                  muted
                />
              )}
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={processVideoForTikTok}
            disabled={!selectedFile || isProcessing || !authState.isAuthenticated}
            className={`px-4 py-2 rounded ${!authState.isAuthenticated ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-yellow-700 text-white hover:bg-yellow-800 disabled:opacity-50'}`}
          >
            {!authState.isAuthenticated 
              ? 'Sign in to process video' 
              : isProcessing 
                ? `Processing... ${processingProgress}%` 
                : 'Process for TikTok Shorts'
            }
          </button>
          {isProcessing && (
            <div className="w-48 bg-gray-200 rounded h-2">
              <div className="bg-yellow-500 h-2 rounded" style={{ width: `${processingProgress}%` }} />
            </div>
          )}
          {videosReady && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-800 font-medium">Video Status: Ready for Upload</span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                TikTok Shorts video: <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">ready</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Details */}
      {authState.isAuthenticated && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Video Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Enter video title (keep it engaging for TikTok)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                style={{ color: '#374151' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Enter video description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                style={{ color: '#374151' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={videoTags}
                onChange={(e) => setVideoTags(e.target.value)}
                placeholder="shorts, tiktok, video, example"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                style={{ color: '#374151' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Account Information */}
      {authState.isAuthenticated && authState.userInfo && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Account Information</h3>
          
          {/* Channel Header with Avatar */}
          <div className="flex items-start gap-4 mb-4">
            {authState.userInfo.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={authState.userInfo.avatarUrl}
                alt="Profile avatar"
                width={64}
                height={64}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900">{authState.userInfo.displayName || 'N/A'}</h4>
              {authState.userInfo.isVerified && (
                <p className="text-sm text-blue-600">✓ Verified Creator</p>
              )}
            </div>
          </div>

          {/* Channel Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-xl font-bold text-gray-900">
                {authState.userInfo.followerCount ? 
                  parseInt(authState.userInfo.followerCount).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-600">Followers</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-xl font-bold text-gray-900">
                {authState.userInfo.followingCount ? 
                  parseInt(authState.userInfo.followingCount).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-600">Following</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-xl font-bold text-gray-900">
                {authState.userInfo.videoCount ? 
                  parseInt(authState.userInfo.videoCount).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-600">Videos</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-xl font-bold text-gray-900">
                {authState.userInfo.likeCount ? 
                  parseInt(authState.userInfo.likeCount).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-600">Likes</div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-gray-900">
              <strong className="text-gray-900">User ID:</strong> 
              <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {authState.userInfo.userId || 'N/A'}
              </span>
            </div>
            {authState.userInfo.isVerified && (
              <div className="text-gray-900">
                <strong className="text-gray-900">Status:</strong> 
                <span className="ml-2 text-blue-600">Verified Creator</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {authState.error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Error</h3>
          <p className="text-red-700">{authState.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleAuth}
          disabled={authState.isLoading}
          className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {authState.isLoading ? 'Authenticating...' : 'Connect TikTok'}
        </button>
        
        {authState.isAuthenticated && (
          <button
            onClick={uploadToTikTok}
            disabled={!videosReady || !videoTitle}
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Upload TikTok Video
          </button>
        )}
        
        {authState.isAuthenticated && (
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Logout
          </button>
        )}
      </div>

      {/* OAuth Countdown */}
      {authState.isLoading && oauthCountdownSeconds !== null && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500 mr-2"></div>
            <span className="text-gray-700">Login will timeout in {Math.floor(oauthCountdownSeconds / 60).toString().padStart(2, '0')}:{Math.floor(oauthCountdownSeconds % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {/* Debug Logs */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Debug Logs</h3>
        <div className="bg-black p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto space-y-1">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            debugLogs.map((log, index) => {
              const { category, levelColor, categoryColor } = getLogMeta(log);
              const categoryLabel = category.toUpperCase();
              return (
                <div key={index} className={`mb-0.5 ${levelColor}`}>
                  <span className="inline-block px-1.5 py-0.5 mr-2 rounded text-white text-[10px] bg-yellow-600">TIKTOK</span>
                  <span className={`inline-block px-1 py-0.5 mr-2 rounded text-white text-[10px] ${categoryColor}`}>{categoryLabel}</span>
                  <span className="text-gray-200">{log}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Configuration Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Client Key: {TIKTOK_CONFIG.clientKey}</div>
        <div>API Version: {TIKTOK_CONFIG.apiVersion}</div>
        <div>Upload Preset: {UPLOAD_PRESET}</div>
      </div>
    </div>
  );
}
