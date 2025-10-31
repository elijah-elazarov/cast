'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

interface UserInfo {
  id?: string;
  username?: string;
  email?: string;
  channelTitle?: string;
  channelId?: string;
  userId?: string;
  subscriberCount?: string;
  channelDescription?: string;
  customUrl?: string;
  publishedAt?: string;
  country?: string;
  thumbnailUrl?: string;
  videoCount?: string;
  viewCount?: string;
  hiddenSubscriberCount?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface YouTubeBackendResponse {
  success: boolean;
  data: {
    user_id: string;
    channel_title: string;
    channel_description: string;
    custom_url: string;
    published_at: string;
    country: string;
    thumbnail_url: string;
    subscriber_count: string;
    video_count: string;
    view_count: string;
    hidden_subscriber_count: boolean;
  };
  message: string;
}

// YouTube API configuration
const YOUTUBE_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || 'your-client-id',
  scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
  redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/youtube/callback`,
  apiVersion: 'v3'
};

export default function YouTubeShortsDebugger() {
  const hasInitialized = useRef<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null,
    accessToken: null,
    refreshToken: null
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [videosReady, setVideosReady] = useState(false);
  const [oauthCountdownSeconds, setOauthCountdownSeconds] = useState<number | null>(null);
  const oauthCountdownIntervalRef = useRef<number | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    sizeMB: number;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
    previewUrl?: string;
  } | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoTags, setVideoTags] = useState('');

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dkzbmeto1';
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_YOUTUBE || 'youtube_uploads';

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[YOUTUBE SHORTS DEBUG] ${message}`);
  }, []);

  // Derive category/level styling for logs
  const getLogMeta = useCallback((line: string) => {
    const lower = line.toLowerCase();
    
    let category: 'auth' | 'process' | 'upload' | 'validate' | 'logout' | 'config' | 'other' = 'other';
    if (lower.includes('auth') || lower.includes('login') || lower.includes('token') || lower.includes('oauth')) category = 'auth';
    else if (lower.includes('process') || lower.includes('generating') || lower.includes('cloudinary')) category = 'process';
    else if (lower.includes('upload') || lower.includes('publish') || lower.includes('posting') || lower.includes('short')) category = 'upload';
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

  // Initialize: Log configuration and status (guarded for React Strict Mode)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    addLog('🎬 YouTube Shorts Debugger initialized');
    addLog('📋 Configuration loaded');
    addLog(`🔑 Client ID: ${YOUTUBE_CONFIG.clientId.substring(0, 8)}...`);
    addLog(`📦 Upload Preset: ${UPLOAD_PRESET}`);
    addLog(`🌐 API Version: ${YOUTUBE_CONFIG.apiVersion}`);
    addLog(`📡 Scopes: ${YOUTUBE_CONFIG.scope}`);
    addLog(`🔗 Redirect URI: ${YOUTUBE_CONFIG.redirectUri}`);
    addLog('✅ Ready to connect and upload videos to YouTube');
    addLog('👆 Click "Connect YouTube" to begin authentication');
  }, [addLog, UPLOAD_PRESET]);

  // Check for OAuth callback success/error from query params (same as original YouTubeConnection)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const youtubeConnected = urlParams.get('youtube_connected');
    const youtubeError = urlParams.get('youtube_error');

    if (youtubeConnected === 'true') {
      addLog('YouTube authentication successful!');
      // Get user info from localStorage (set by backend callback)
      const userId = localStorage.getItem('youtube_user_id');
      const channelTitle = localStorage.getItem('youtube_channel_title');
      
      if (userId && channelTitle) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userInfo: {
            id: userId,
            username: channelTitle,
            channelTitle: channelTitle,
            channelId: userId
          },
          accessToken: localStorage.getItem('youtube_access_token') || null,
          refreshToken: localStorage.getItem('youtube_refresh_token') || null
        });
        addLog(`Connected as: ${channelTitle}`);
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (youtubeError) {
      addLog(`YouTube authentication failed: ${youtubeError}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `YouTube authorization failed: ${youtubeError}` 
      }));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addLog]);

  // Sync auth state with localStorage changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only react to YouTube-related localStorage changes
      if (e.key && e.key.startsWith('youtube_')) {
        const userId = localStorage.getItem('youtube_user_id');
        const channelTitle = localStorage.getItem('youtube_channel_title');

        if (userId && channelTitle) {
          // Auth state exists in localStorage - sync it
          if (!authState.isAuthenticated) {
            addLog('🔄 Syncing auth state from localStorage (change detected)...');
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              userInfo: {
                id: userId,
                username: channelTitle,
                channelTitle: channelTitle,
                channelId: userId
              },
              accessToken: localStorage.getItem('youtube_access_token') || null,
              refreshToken: localStorage.getItem('youtube_refresh_token') || null
            });
            addLog('✅ Auth state synced from localStorage');
            // Dispatch custom event for TokenManager
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'youtube' } }));
          }
        } else {
          // Auth state removed from localStorage - clear state
          if (authState.isAuthenticated) {
            addLog('🔄 Clearing auth state (logout detected in another component)...');
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              error: null,
              userInfo: null,
              accessToken: null,
              refreshToken: null
            });
            setDebugLogs([]);
            addLog('✅ Auth state cleared');
            // Dispatch custom event for TokenManager
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'youtube' } }));
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authState.isAuthenticated, addLog]); // Only re-run when auth state changes

  // Validate a Cloudinary video URL becoming available
  const validateVideoUrl = async (url: string, label: string, maxAttempts = 6): Promise<boolean> => {
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        let res = await fetch(url, { method: 'HEAD' });
        
        if (!res.ok && (res.status === 400 || res.status === 423)) {
          res = await fetch(url, {
            method: 'GET',
            headers: { Range: 'bytes=0-1' }
          });
        }
        
        if (res.ok || res.status === 206) {
          addLog(`✅ ${label} validated (status ${res.status})`);
          return true;
        }
        
        if (res.status === 400 || res.status === 423) {
          addLog(`⏳ ${label} transform in progress (${res.status}), retrying... [${attempt}/${maxAttempts}]`);
        } else {
          addLog(`⏳ ${label} not ready yet (status ${res.status}), retrying... [${attempt}/${maxAttempts}]`);
        }
      } catch {
        addLog(`⏳ ${label} validation error, retrying... [${attempt}/${maxAttempts}]`);
      }
      
      const delayMs = attempt <= 3 ? 1000 * attempt : Math.min(10000, 2000 * (attempt - 2));
      await new Promise((r) => setTimeout(r, delayMs));
    }
    addLog(`⚠️ ${label} validation timed out after ${maxAttempts} attempts`);
    return false;
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setProcessedVideoUrl(null);
    setVideosReady(false);

    // Validate YouTube Shorts requirements
    const isValid = await validateYouTubeShortsFile(file);
    if (!isValid) {
      return;
    }

    // Build initial details
    const details = {
      name: file.name,
      sizeMB: +(file.size / (1024 * 1024)).toFixed(2),
      type: file.type || 'video/mp4',
    } as {
      name: string; sizeMB: number; type: string; width?: number; height?: number; duration?: number; previewUrl?: string
    };

    // Create a preview URL and read metadata
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
      };
      videoEl.onerror = () => {
        setFileDetails({ ...details });
      };
    } catch {
      setFileDetails({ ...details });
    }
  };

  const validateYouTubeShortsFile = async (file: File): Promise<boolean> => {
    addLog('🔍 Validating file for YouTube Shorts requirements...');
    
    // Check file type
    if (!file.type.startsWith('video/')) {
      addLog('❌ File must be a video');
      return false;
    }

    // Check file size (YouTube has 128GB limit, but we'll be more reasonable)
    const maxSizeMB = 1000; // 1GB
    if (file.size > maxSizeMB * 1024 * 1024) {
      addLog(`❌ File too large. Max size: ${maxSizeMB}MB`);
      return false;
    }

    // Check duration and aspect ratio
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
        
        // Check duration (max 60 seconds for Shorts)
        if (duration > 60) {
          addLog('❌ Video too long. YouTube Shorts must be 60 seconds or less');
          URL.revokeObjectURL(videoEl.src);
          resolve(false);
          return;
        }
        
        // Check aspect ratio (should be 9:16, but we'll be flexible)
        const aspectRatio = width / height;
        const expectedRatio = 9 / 16; // 0.5625
        const tolerance = 0.1; // 10% tolerance
        
        if (Math.abs(aspectRatio - expectedRatio) > tolerance) {
          addLog(`⚠️ Aspect ratio ${aspectRatio.toFixed(3)} is not ideal for Shorts (9:16 = ${expectedRatio.toFixed(3)})`);
          addLog('📝 Video will be cropped to 9:16 during processing');
        } else {
          addLog('✅ Aspect ratio is good for YouTube Shorts');
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

  const processClientSide = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    setProcessingProgress(0);
    setVideosReady(false);

    try {
      // Step 1: Upload original file to Cloudinary
      addLog('🔄 Step 1/3: Uploading video to Cloudinary...');
      setProcessingProgress(20);
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
      const formVideo = new FormData();
      formVideo.append('file', selectedFile);
      formVideo.append('upload_preset', UPLOAD_PRESET);
      const vRes = await fetch(uploadUrl, { method: 'POST', body: formVideo });
      const vJson = await vRes.json();
      if (!vRes.ok) throw new Error(`Cloudinary upload failed: ${JSON.stringify(vJson)}`);
      addLog('✅ Uploaded source video to Cloudinary');

      // Step 2: Generate YouTube Shorts transformation URL
      addLog('🔄 Step 2/3: Generating YouTube Shorts-compliant transformation URL...');
      setProcessingProgress(60);
      
      // YouTube Shorts: 9:16 aspect ratio, 1920x1080 resolution
      const shortsTransformUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_1080,h_1920,f_mp4,q_auto:best/${vJson.public_id}.mp4`;
      
      // Generate thumbnail: extract frame at 1 second
      const thumbnailUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_1,w_1080,h_1920,c_fill,f_jpg,q_auto:best/${vJson.public_id}.jpg`;

      // Step 3: Validate URLs are accessible
      addLog('🔄 Step 3/3: Validating transformed video is accessible...');
      setProcessingProgress(80);

      const [shortsOk] = await Promise.all([
        validateVideoUrl(shortsTransformUrl, 'YouTube Shorts video'),
        validateVideoUrl(thumbnailUrl, 'Thumbnail')
      ]);

      if (!shortsOk) {
        addLog('⚠️ YouTube Shorts video validation failed, but allowing upload');
        addLog('Note: Cloudinary transformations may still be processing in background');
      }

      // Set the processed URLs
      setProcessedVideoUrl(shortsTransformUrl);
      setProcessingProgress(100);
      setVideosReady(true);
      
      if (shortsOk) {
        addLog('🎉 Video processing complete! Ready for YouTube Shorts upload');
      } else {
        addLog('⚠️ Video processing completed with issues - check logs above');
      }
      addLog(`📹 YouTube Shorts URL: ${shortsTransformUrl}`);
      addLog(`🖼️ Thumbnail URL: ${thumbnailUrl}`);
    } catch (e) {
      addLog(`❌ Processing error: ${e}`);
      setVideosReady(false);
    } finally {
      setProcessing(false);
    }
  };


  // Check if already authenticated (for silent refresh)
  const checkExistingAuth = (): boolean => {
    if (!authState.isAuthenticated || !authState.userInfo) {
      return false;
    }
    
    // If already authenticated, just refresh the UI state silently
    addLog('Already authenticated, refreshing auth data...');
    addLog(`✅ Authenticated as: ${authState.userInfo.channelTitle || 'YouTube User'}`);
    if (authState.userInfo.channelId) {
      addLog(`📺 Channel ID: ${authState.userInfo.channelId}`);
    }
    if (authState.userInfo.subscriberCount) {
      addLog(`👥 Subscribers: ${authState.userInfo.subscriberCount}`);
    }
    addLog('Authentication refreshed successfully!');
    return true;
  };

  // YouTube OAuth flow - use same approach as original YouTubeConnection
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    setDebugLogs([]);
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
      addLog('Starting YouTube Shorts authentication...');
      
      // First check if already authenticated
      const isRefreshed = checkExistingAuth();
      if (isRefreshed) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
        setOauthCountdownSeconds(null);
        return;
      }
      
      // IMPORTANT: Open a blank popup immediately on user gesture to avoid blockers
      // Center the popup on screen (robust across browsers/monitors)
      const popupWidth = 640;
      const popupHeight = 655;
      // Let browser handle positioning - just specify size
      const features = `width=${popupWidth},height=${popupHeight},scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no`;

      const popup = window.open('', 'youtube-oauth', features);
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      try {
        popup.document.title = 'Connecting to YouTube…';
      } catch {}

      // Focus the popup
      try {
        popup.focus();
      } catch {}
      // Log detected metrics for troubleshooting
      addLog(`Popup metrics -> width:${popupWidth}, height:${popupHeight} (browser-positioned)`);

      // Get auth URL from backend
      const response = await fetch('/api/youtube/auth-url');
      const data = await response.json();
      
      if (!data.success) {
        popup.close();
        throw new Error(data.error || 'Failed to get auth URL');
      }
      
      addLog('Opening YouTube authentication popup...');
      
      // Navigate the already opened popup to Google's OAuth page
      popup.location.href = data.data.auth_url;

      // Track completion to distinguish cancellations
      let completed = false;

      // Listen for messages from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
          // Success - process auth data
          completed = true;
          handleAuthSuccess(event.data.authData);
          popup.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'YOUTUBE_AUTH_ERROR') {
          // Error - update state
          completed = true;
          addLog(`YouTube authentication failed: ${event.data.error}`);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: `YouTube authorization failed: ${event.data.error}`
          }));
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Monitor popup closure and treat early close as cancel
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: completed ? prev.error : 'Login cancelled or window closed before completing authentication'
          }));
          if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
          oauthCountdownIntervalRef.current = null;
          setOauthCountdownSeconds(null);
        }
      }, 1000);

      // Failsafe timeout in case popup stays open but no message is received
      setTimeout(() => {
        if (!completed && !popup.closed) {
          try { popup.close(); } catch {}
          window.removeEventListener('message', messageHandler);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Authentication timed out. Please try again.'
          }));
          if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
          oauthCountdownIntervalRef.current = null;
          setOauthCountdownSeconds(null);
        }
      }, 2 * 60 * 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Authentication error: ${errorMessage}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      if (oauthCountdownIntervalRef.current) window.clearInterval(oauthCountdownIntervalRef.current);
      oauthCountdownIntervalRef.current = null;
      setOauthCountdownSeconds(null);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authData: YouTubeBackendResponse) => {
    try {
      addLog('Processing authentication data...');
      
      // The authData comes from the backend and contains user info directly
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
          channelTitle: userData.channel_title,
          channelId: userData.user_id,
          userId: userData.user_id,
          subscriberCount: userData.subscriber_count,
          channelDescription: userData.channel_description,
          customUrl: userData.custom_url,
          publishedAt: userData.published_at,
          country: userData.country,
          thumbnailUrl: userData.thumbnail_url,
          videoCount: userData.video_count,
          viewCount: userData.view_count,
          hiddenSubscriberCount: userData.hidden_subscriber_count
        },
        accessToken: 'stored_in_backend', // Tokens are stored in backend
        refreshToken: 'stored_in_backend'
      });

      addLog(`✅ Authenticated as: ${userData.channel_title}`);
      addLog(`📺 Channel ID: ${userData.user_id}`);
      addLog(`👥 Subscribers: ${userData.subscriber_count}`);
      addLog('Authentication completed successfully!');
      // Dispatch custom event for TokenManager and other components
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'youtube' } }));
      
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

  // Logout
  const handleLogout = async () => {
    addLog('Logging out from YouTube...');
    
    // Check if user is authenticated (similar to FB.getLoginStatus() check)
    if (!authState.isAuthenticated && !localStorage.getItem('youtube_user_id')) {
      addLog('⚠️ No active YouTube session found, clearing local state only');
      // Clear any remaining state
      localStorage.removeItem('youtube_user_id');
      localStorage.removeItem('youtube_channel_title');
      localStorage.removeItem('youtube_channel_description');
      localStorage.removeItem('youtube_custom_url');
      localStorage.removeItem('youtube_published_at');
      localStorage.removeItem('youtube_country');
      localStorage.removeItem('youtube_thumbnail_url');
      localStorage.removeItem('youtube_subscriber_count');
      localStorage.removeItem('youtube_video_count');
      localStorage.removeItem('youtube_view_count');
      localStorage.removeItem('youtube_hidden_subscriber_count');
      localStorage.removeItem('youtube_access_token');
      localStorage.removeItem('youtube_refresh_token');
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userInfo: null,
        accessToken: null,
        refreshToken: null
      });
      setDebugLogs([]);
      addLog('Logged out from YouTube successfully');
      return;
    }
    
    // User is authenticated, validate token then revoke
    const userId = authState.userInfo?.id || localStorage.getItem('youtube_user_id');
    
    if (userId) {
      try {
        addLog('🔍 Validating YouTube access token...');
        // Use Next.js API proxy to call backend (matching UnifiedVideoUploader)
        const response = await fetch('/api/youtube/logout', {
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
            addLog('✅ YouTube access token validated (token was active)');
            addLog('✅ YouTube access token revoked on Google servers via /revoke endpoint');
          } else if (data.token_valid === false) {
            addLog('⚠️ YouTube access token was already invalid/expired (skipping revoke)');
          } else {
            addLog('✅ YouTube logout processed');
          }
          addLog('✅ Local session cleared - logout complete');
        } else {
          addLog(`⚠️ Backend logout warning: ${data.detail || data.message || 'Unknown error'}`);
        }
      } catch (err) {
        addLog(`⚠️ Backend logout error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Continue with local logout even if backend call fails
      }
    }
    
    // Clear localStorage (matching UnifiedVideoUploader)
    localStorage.removeItem('youtube_user_id');
    localStorage.removeItem('youtube_channel_title');
    localStorage.removeItem('youtube_channel_description');
    localStorage.removeItem('youtube_custom_url');
    localStorage.removeItem('youtube_published_at');
    localStorage.removeItem('youtube_country');
    localStorage.removeItem('youtube_thumbnail_url');
    localStorage.removeItem('youtube_subscriber_count');
    localStorage.removeItem('youtube_video_count');
    localStorage.removeItem('youtube_view_count');
    localStorage.removeItem('youtube_hidden_subscriber_count');
    localStorage.removeItem('youtube_access_token');
    localStorage.removeItem('youtube_refresh_token');
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null,
      accessToken: null,
      refreshToken: null
    });
    setDebugLogs([]);
    
    addLog('Logged out from YouTube successfully');
    // Dispatch custom event for TokenManager and other components
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'youtube' } }));
  };

  // Test YouTube Shorts upload
  const testYouTubeShortsUpload = async () => {
    if (!processedVideoUrl) {
      addLog('❌ No processed video available. Please process a video first.');
      return;
    }

    if (!videosReady) {
      addLog('❌ Video is not ready yet. Please wait for processing to complete.');
      return;
    }

    if (!authState.isAuthenticated || !authState.accessToken) {
      addLog('❌ Not authenticated');
      return;
    }

    if (!videoTitle.trim()) {
      addLog('❌ Please enter a video title');
      return;
    }

    addLog('Testing YouTube Shorts upload...');
    addLog(`📹 Using processed video: ${processedVideoUrl}`);
    addLog(`📝 Title: ${videoTitle}`);
    addLog(`📄 Description: ${videoDescription || 'No description'}`);
    addLog(`🏷️ Tags: ${videoTags || 'No tags'}`);

    try {
      // Download video from Cloudinary first
      addLog('📥 Downloading video from Cloudinary...');
      const videoResponse = await fetch(processedVideoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download video from Cloudinary');
      }
      
      const videoBlob = await videoResponse.blob();
      addLog('✅ Video downloaded successfully');
      
      // Create form data for backend upload
      const formData = new FormData();
      formData.append('file', videoBlob, 'video.mp4');
      formData.append('title', videoTitle);
      formData.append('description', videoDescription || '');
      formData.append('user_id', authState.userInfo?.userId || '');
      
      // Add tags if provided
      if (videoTags) {
        const tagsArray = videoTags.split(',').map(tag => tag.trim()).filter(tag => tag);
        tagsArray.forEach(tag => formData.append('tags', tag));
      }
      
      addLog('📤 Uploading to YouTube via backend...');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
      const response = await fetch(`${backendUrl}/api/youtube/upload-short`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend upload failed: ${errorData.detail || 'Unknown error'}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        addLog(`🎉 SUCCESS! YouTube Short uploaded with ID: ${data.data.video_id}`);
        addLog('✅ Your YouTube Short has been uploaded successfully!');
        addLog(`🔗 Video URL: ${data.data.url || `https://www.youtube.com/watch?v=${data.data.video_id}`}`);
      } else {
        addLog(`❌ Upload failed: ${data.detail || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      addLog(`❌ Upload error: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎬 YouTube Shorts Debugger
        </h2>
        <p className="text-gray-600">
          Debug component to test YouTube Shorts upload authentication and video processing
        </p>
      </div>

      {/* Status Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Authentication Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-700">Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isLoading ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
            <span className="text-gray-700">Loading: {authState.isLoading ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-gray-700">Error: {authState.error ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${videosReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-gray-700">Video Ready: {videosReady ? 'Yes' : 'No'}</span>
          </div>
        </div>
        {authState.isLoading && oauthCountdownSeconds !== null && (
          <div className="mt-2 text-sm text-gray-600">
            Login will timeout in {Math.floor(oauthCountdownSeconds / 60)}:{String(oauthCountdownSeconds % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* File Selection and Processing */}
      <div className={`mb-6 p-4 rounded-lg border bg-red-50 border-red-200 ${!authState.isAuthenticated ? 'opacity-50' : ''}`}>
        <h3 className={`text-lg font-semibold mb-2 ${!authState.isAuthenticated ? 'text-gray-500' : 'text-red-800'}`}>
          Select Video {!authState.isAuthenticated && '(Sign in required)'}
        </h3>
        <label className={`inline-flex items-center px-4 py-2 rounded cursor-pointer ${!authState.isAuthenticated ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
          <span className="font-medium">Choose file</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
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
            onClick={processClientSide}
            disabled={!authState.isAuthenticated || !selectedFile || processing}
            className={`px-4 py-2 rounded ${!authState.isAuthenticated ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-red-700 text-white hover:bg-red-800 disabled:opacity-50'}`}
          >
            {!authState.isAuthenticated 
              ? 'Sign in to process video' 
              : processing 
                ? `Processing... ${processingProgress}%` 
                : 'Process for YouTube Shorts'
            }
          </button>
          {processing && (
            <div className="w-48 bg-gray-200 rounded h-2">
              <div className="bg-red-600 h-2 rounded" style={{ width: `${processingProgress}%` }} />
            </div>
          )}
        </div>
        {processedVideoUrl && authState.isAuthenticated && (
          <div className="mt-3 text-sm text-gray-700">
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${videosReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium">
                Video Status: {videosReady ? 'Ready for Upload' : 'Processing...'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">📹</span>
              <span>YouTube Shorts video: </span>
              <a className="text-blue-600 underline ml-1" href={processedVideoUrl} target="_blank" rel="noreferrer">open</a>
              {videosReady && <span className="ml-2 text-green-600">✓</span>}
            </div>
          </div>
        )}
      </div>

      {/* Video Details Form */}
      {authState.isAuthenticated && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold mb-3 text-red-800">Video Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Enter video title (include #Shorts for better categorization)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ color: '#374151' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={videoTags}
                onChange={(e) => setVideoTags(e.target.value)}
                placeholder="shorts, youtube, video, example"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ color: '#374151' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Account Information */}
      {authState.isAuthenticated && authState.userInfo && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold mb-3 text-red-800">Account Information</h3>
          
          {/* Channel Header with Thumbnail */}
          <div className="flex items-start gap-4 mb-4">
            {authState.userInfo.thumbnailUrl && (
              <Image 
                src={authState.userInfo.thumbnailUrl} 
                alt="Channel thumbnail" 
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900">{authState.userInfo.channelTitle || 'N/A'}</h4>
              {authState.userInfo.customUrl && (
                <p className="text-sm text-blue-600">
                  {authState.userInfo.customUrl.startsWith('@') 
                    ? authState.userInfo.customUrl 
                    : `@${authState.userInfo.customUrl}`}
                </p>
              )}
              {authState.userInfo.channelDescription && (
                <p className="text-sm text-gray-600 mt-1">{authState.userInfo.channelDescription}</p>
              )}
            </div>
          </div>

          {/* Channel Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-xl font-bold text-gray-900">
                {authState.userInfo.subscriberCount ? 
                  parseInt(authState.userInfo.subscriberCount).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-600">Subscribers</div>
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
                {authState.userInfo.viewCount ? 
                  parseInt(authState.userInfo.viewCount).toLocaleString() : '0'}
              </div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
              <div className="text-xl font-bold text-gray-900">{authState.userInfo.country || 'N/A'}</div>
              <div className="text-xs text-gray-600">Country</div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-gray-900">
              <strong className="text-gray-900">Channel ID:</strong> 
              <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {authState.userInfo.channelId || 'N/A'}
              </span>
            </div>
            <div className="text-gray-900">
              <strong className="text-gray-900">User ID:</strong> 
              <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {authState.userInfo.userId || 'N/A'}
              </span>
            </div>
            {authState.userInfo.publishedAt && (
              <div className="text-gray-900">
                <strong className="text-gray-900">Joined:</strong> 
                <span className="ml-2">{new Date(authState.userInfo.publishedAt).toLocaleDateString()}</span>
              </div>
            )}
            {authState.userInfo.customUrl && (
              <div className="text-gray-900">
                <strong className="text-gray-900">Channel URL:</strong> 
                <a 
                  href={`https://www.youtube.com/${authState.userInfo.customUrl}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  View Channel
                </a>
              </div>
            )}
            {authState.userInfo.hiddenSubscriberCount && (
              <div className="text-gray-900">
                <strong className="text-gray-900">Subscriber Count:</strong> 
                <span className="ml-2 text-orange-600">Hidden</span>
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
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {authState.isLoading ? 'Authenticating...' : 'Connect YouTube'}
        </button>
        
        {authState.isAuthenticated && (
          <>
            {processedVideoUrl && videosReady && (
              <button
                onClick={testYouTubeShortsUpload}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Upload YouTube Short
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* Debug Logs */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Debug Logs</h3>
        <div className="bg-black p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto space-y-1">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click &quot;Connect YouTube&quot; to start debugging.</div>
          ) : (
            debugLogs.map((log, index) => {
              const { category, levelColor, categoryColor } = getLogMeta(log);
              const categoryLabel = category.toUpperCase();
              return (
                <div key={index} className={`mb-0.5 ${levelColor}`}>
                  <span className="inline-block px-1.5 py-0.5 mr-2 rounded text-white text-[10px] bg-red-600">YOUTUBE</span>
                  <span className={`inline-block px-1 py-0.5 mr-2 rounded text-white text-[10px] ${categoryColor}`}>{categoryLabel}</span>
                  <span className="text-gray-200">{log}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Configuration</h3>
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="flex justify-between">
            <div className="text-gray-700"><strong className="text-gray-800">Client ID:</strong> {YOUTUBE_CONFIG.clientId}</div>
            <div className="text-gray-700"><strong className="text-gray-800">API Version:</strong> {YOUTUBE_CONFIG.apiVersion}</div>
          </div>
          <div className="text-gray-700">
            <strong className="text-gray-800">Scopes:</strong>
            <div className="mt-1 flex flex-wrap gap-2">
              {YOUTUBE_CONFIG.scope.split(' ').map((scope, index) => (
                <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
