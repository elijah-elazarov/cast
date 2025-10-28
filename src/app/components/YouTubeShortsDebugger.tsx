'use client';

import { useState, useEffect } from 'react';

interface UserInfo {
  id: string;
  username: string;
  email?: string;
  channelTitle?: string;
  channelId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface YouTubeAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// YouTube API configuration
const YOUTUBE_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || 'your-client-id',
  scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
  redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/youtube/callback`,
  apiVersion: 'v3'
};

export default function YouTubeShortsDebugger() {
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
  }, []);

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

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[YOUTUBE SHORTS DEBUG] ${message}`);
  };

  // YouTube OAuth flow - use same approach as original YouTubeConnection
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    setDebugLogs([]);
    
    try {
      addLog('Starting YouTube Shorts authentication...');
      
      // Get auth URL from backend
      const response = await fetch('/api/youtube/auth-url');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get auth URL');
      }
      
      addLog('Redirecting to YouTube authentication...');
      
      // Redirect directly to Google OAuth (same as original YouTubeConnection)
      window.location.href = data.data.auth_url;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Authentication error: ${errorMessage}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authData: YouTubeAuthResponse) => {
    try {
      addLog('Processing authentication data...');
      
      // Get user info
      const userResponse = await fetch('/api/youtube/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authData })
      });
      
      const userData = await userResponse.json();
      
      if (!userData.success) {
        throw new Error(userData.error || 'Failed to get user info');
      }
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: userData.userInfo,
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token
      });

      addLog(`✅ Authenticated as: ${userData.userInfo.channelTitle || userData.userInfo.username}`);
      addLog('Authentication completed successfully!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Auth success processing error: ${errorMessage}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  };

  // Logout
  const handleLogout = () => {
    addLog('Logging out...');
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null,
      accessToken: null,
      refreshToken: null
    });
    setDebugLogs([]);
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
      const response = await fetch('/api/youtube/upload-short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: processedVideoUrl,
          title: videoTitle,
          description: videoDescription,
          tags: videoTags.split(',').map(tag => tag.trim()).filter(tag => tag),
          accessToken: authState.accessToken
        })
      });

      const data = await response.json();

      if (data.success) {
        addLog(`🎉 SUCCESS! YouTube Short uploaded with ID: ${data.videoId}`);
        addLog('✅ Your YouTube Short has been uploaded successfully!');
        addLog(`🔗 Video URL: https://www.youtube.com/watch?v=${data.videoId}`);
      } else {
        addLog(`❌ Upload failed: ${data.error || 'Unknown error'}`);
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
      </div>

      {/* File Selection and Processing */}
      <div className={`mb-6 p-4 rounded-lg border ${!authState.isAuthenticated ? 'opacity-50' : ''}`}>
        <h3 className={`text-lg font-semibold mb-2 ${!authState.isAuthenticated ? 'text-gray-500' : 'text-gray-900'}`}>
          Select Video {!authState.isAuthenticated && '(Sign in required)'}
        </h3>
        <label className={`inline-flex items-center px-4 py-2 rounded cursor-pointer ${!authState.isAuthenticated ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}>
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
            className={`px-4 py-2 rounded ${!authState.isAuthenticated ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50'}`}
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
              <div className="bg-blue-600 h-2 rounded" style={{ width: `${processingProgress}%` }} />
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
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Video Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Enter video title (include #Shorts for better categorization)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Enter video description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={videoTags}
                onChange={(e) => setVideoTags(e.target.value)}
                placeholder="shorts, youtube, video, example"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Account Information */}
      {authState.isAuthenticated && authState.userInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Account Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-gray-700"><strong className="text-gray-800">Channel ID:</strong> {authState.userInfo.channelId}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Channel Title:</strong> {authState.userInfo.channelTitle}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Username:</strong> {authState.userInfo.username}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Email:</strong> {authState.userInfo.email}</div>
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
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click &quot;Connect YouTube&quot; to start debugging.</div>
          ) : (
            debugLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
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
