'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Instagram, Youtube, Music, UploadCloud, FileVideo2, Loader2, X } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */

type FacebookLoginStatus = {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: { accessToken: string };
};

type FacebookSDK = {
  init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  getLoginStatus: (callback: (response: FacebookLoginStatus) => void) => void;
  login: (
    callback: (response: { authResponse?: { accessToken: string } }) => void,
    options: { scope: string; return_scopes: boolean }
  ) => void;
};

type FBWindow = Window & { FB?: FacebookSDK; fbAsyncInit?: () => void };

// Instagram auth (from InstagramReelsDebugger)
interface InstagramAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    id: string;
    username: string;
    account_type?: string;
  } | null;
}

// YouTube auth (from YouTubeShortsDebugger)
interface YouTubeAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    id?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
    subscriberCount?: string;
  } | null;
}

// TikTok auth (from TikTokShortsDebugger)
interface TikTokAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    userId?: string;
    displayName?: string;
    avatarUrl?: string;
    followerCount?: string;
  } | null;
}

export default function UnifiedVideoUploader({ onClose }: { onClose?: () => void }) {
  // Instagram SDK config (same as debugger)
  const INSTAGRAM_CONFIG = {
    appId: '717044718072411',
    scope: 'instagram_basic,pages_show_list,pages_read_engagement,business_management,instagram_content_publish,instagram_manage_comments,instagram_manage_insights',
    apiVersion: 'v21.0'
  } as const;

  const [instagramAuth, setInstagramAuth] = useState<InstagramAuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null
  });
  const [youtubeAuth, setYouTubeAuth] = useState<YouTubeAuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null
  });
  const [tiktokAuth, setTiktokAuth] = useState<TikTokAuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[UNIFIED UPLOAD] ${message}`);
  }, []);

  // Check existing connections on mount and handle OAuth callbacks
  useEffect(() => {
    // Load Facebook SDK (for Instagram)
    const loadFacebookSDK = () => {
      const w = window as FBWindow;
      if (w.FB) {
        setFbSdkLoaded(true);
        addLog('Facebook SDK already loaded');
        return;
      }
      addLog('Loading Facebook SDK...');
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        (w as FBWindow).fbAsyncInit = () => {
          w.FB?.init({
            appId: INSTAGRAM_CONFIG.appId,
            cookie: true,
            xfbml: true,
            version: INSTAGRAM_CONFIG.apiVersion
          });
          setFbSdkLoaded(true);
          addLog('Facebook SDK loaded successfully');
        };
      };
      document.head.appendChild(script);
    };
    loadFacebookSDK();
    // Check Instagram callback
    const urlParams = new URLSearchParams(window.location.search);
    const instagramConnected = urlParams.get('instagram_connected');
    if (instagramConnected === 'true') {
      const instagramUserId = localStorage.getItem('instagram_user_id');
      const instagramUsername = localStorage.getItem('instagram_username');
      if (instagramUserId && instagramUsername) {
        setInstagramAuth({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userInfo: {
            id: instagramUserId,
            username: instagramUsername,
            account_type: localStorage.getItem('instagram_account_type') || undefined
          }
        });
        addLog(`Instagram connected: ${instagramUsername}`);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check YouTube callback
    const youtubeConnected = urlParams.get('youtube_connected');
    if (youtubeConnected === 'true') {
      const youtubeUserId = localStorage.getItem('youtube_user_id');
      const youtubeChannelTitle = localStorage.getItem('youtube_channel_title');
      if (youtubeUserId && youtubeChannelTitle) {
        setYouTubeAuth({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userInfo: {
            id: youtubeUserId,
            channelTitle: youtubeChannelTitle,
            thumbnailUrl: localStorage.getItem('youtube_thumbnail_url') || undefined,
            subscriberCount: localStorage.getItem('youtube_subscriber_count') || undefined
          }
        });
        addLog(`YouTube connected: ${youtubeChannelTitle}`);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }

    // TikTok callback via query params (fallback)
    const tiktokConnected = urlParams.get('tiktok_connected');
    const tiktokUserIdQP = urlParams.get('tiktok_user_id');
    const tiktokDisplayNameQP = urlParams.get('tiktok_display_name');
    const tiktokAvatarUrlQP = urlParams.get('tiktok_avatar_url');
    if (tiktokConnected === 'true' && tiktokUserIdQP) {
      setTiktokAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          userId: tiktokUserIdQP,
          displayName: tiktokDisplayNameQP || 'TikTok User',
          avatarUrl: tiktokAvatarUrlQP || undefined
        }
      });
      addLog('TikTok authentication successful (URL callback)');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check existing connections
    const instagramUserId = localStorage.getItem('instagram_user_id');
    const instagramUsername = localStorage.getItem('instagram_username');
    if (instagramUserId && instagramUsername && !instagramConnected) {
      setInstagramAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          id: instagramUserId,
          username: instagramUsername,
          account_type: localStorage.getItem('instagram_account_type') || undefined
        }
      });
    }

    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const youtubeChannelTitle = localStorage.getItem('youtube_channel_title');
    if (youtubeUserId && youtubeChannelTitle && !youtubeConnected) {
      setYouTubeAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          id: youtubeUserId,
          channelTitle: youtubeChannelTitle,
          thumbnailUrl: localStorage.getItem('youtube_thumbnail_url') || undefined,
          subscriberCount: localStorage.getItem('youtube_subscriber_count') || undefined
        }
      });
    }

    const tiktokUserId = localStorage.getItem('tiktok_user_id');
    const tiktokDisplayName = localStorage.getItem('tiktok_display_name');
    if (tiktokUserId && tiktokDisplayName) {
      setTiktokAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          userId: tiktokUserId,
          displayName: tiktokDisplayName,
          avatarUrl: localStorage.getItem('tiktok_avatar_url') || undefined,
          followerCount: localStorage.getItem('tiktok_follower_count') || undefined
        }
      });
    }
  }, [addLog, INSTAGRAM_CONFIG.appId, INSTAGRAM_CONFIG.apiVersion]);

  // React to localStorage updates from OAuth callbacks (cross-tab/popup)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'youtube_user_id' || e.key === 'youtube_channel_title') {
        const id = localStorage.getItem('youtube_user_id');
        const title = localStorage.getItem('youtube_channel_title');
        if (id && title) {
          setYouTubeAuth({ isAuthenticated: true, isLoading: false, error: null, userInfo: { id, channelTitle: title } });
          addLog(`YouTube connected (storage event): ${title}`);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [addLog]);

  // Helper: exchange short-lived token to long-lived via backend
  const exchangeLongLivedToken = async (shortLived: string): Promise<string> => {
    const res = await fetch('/api/instagram/graph/long-lived-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: shortLived })
    });
    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Long-lived token failed');
    return json.data.access_token as string;
  };

  // Helper: find IG business account via FB pages
  const resolveInstagramAccount = async (accessToken: string): Promise<{ id: string; username: string }> => {
    const pagesUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pages = await pagesRes.json();
    if (!pagesRes.ok) throw new Error('Failed to fetch pages');
    for (const page of pages.data || []) {
      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        const igUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${igId}?fields=id,username&access_token=${accessToken}`;
        const igRes = await fetch(igUrl);
        const ig = await igRes.json();
        if (igRes.ok && ig?.id && ig?.username) return { id: ig.id, username: ig.username };
      }
    }
    throw new Error('No Instagram Business account found');
  };

  // Instagram connect (use Facebook SDK like the debugger)
  const handleInstagramConnect = async () => {
    setInstagramAuth(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting Instagram authentication (Facebook SDK)...');
    try {
      const w = window as FBWindow;
      if (!w.FB || !fbSdkLoaded) throw new Error('Facebook SDK not loaded yet');
      // Check existing login
      const auth = await new Promise<FacebookLoginStatus>((resolve) => w.FB!.getLoginStatus((r) => resolve(r as unknown as FacebookLoginStatus)));
      let accessToken: string | null = null;
      if (auth?.status === 'connected') {
        accessToken = auth.authResponse?.accessToken || null;
        addLog('Using existing Facebook session');
      } else {
        addLog('Invoking FB.login...');
        const loginRes = await new Promise<{ authResponse?: { accessToken: string } }>((resolve) => w.FB!.login((r) => resolve(r as unknown as { authResponse?: { accessToken: string } }), { scope: INSTAGRAM_CONFIG.scope, return_scopes: true }));
        accessToken = loginRes.authResponse?.accessToken || null;
      }
      if (!accessToken) throw new Error('Login failed or cancelled');
      addLog('Exchanging long-lived token...');
      const longLived = await exchangeLongLivedToken(accessToken);
      addLog('Resolving Instagram Business account...');
      const ig = await resolveInstagramAccount(longLived);
      // Persist and update UI
      localStorage.setItem('instagram_user_id', ig.id);
      localStorage.setItem('instagram_username', ig.username);
      setInstagramAuth({ isAuthenticated: true, isLoading: false, error: null, userInfo: { id: ig.id, username: ig.username } });
      addLog(`Instagram connected: @${ig.username}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Instagram authentication error: ${msg}`);
      setInstagramAuth(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  // YouTube connect (popup OAuth like YouTubeShortsDebugger)
  const handleYouTubeConnect = async () => {
    setYouTubeAuth(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting YouTube authentication...');
    try {
      const popupWidth = 600;
      const popupHeight = 650;
      const popup = window.open('', 'youtube-oauth', `width=${popupWidth},height=${popupHeight},scrollbars=yes,resizable=yes`);
      if (!popup) throw new Error('Popup blocked. Please allow popups for this site.');
      try { popup.document.title = 'Connecting to YouTube…'; popup.focus(); } catch {}

      const response = await fetch('/api/youtube/auth-url');
      const data = await response.json();
      if (!data.success) { popup.close(); throw new Error(data.error || 'Failed to get auth URL'); }
      addLog('Opening YouTube authentication popup...');
      popup.location.href = data.data?.auth_url || data.auth_url;

      let completed = false;
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
          completed = true;
          // Prefer direct authData from callback when available (like debugger)
          const authData = event.data.authData?.data;
          if (authData?.user_id && authData?.channel_title) {
            setYouTubeAuth({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              userInfo: { id: authData.user_id, channelTitle: authData.channel_title }
            });
            addLog(`YouTube connected (postMessage): ${authData.channel_title}`);
          } else {
            // Fallback to localStorage populated by callback
            const userId = localStorage.getItem('youtube_user_id');
            const channelTitle = localStorage.getItem('youtube_channel_title');
            if (userId && channelTitle) {
            setYouTubeAuth({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              userInfo: { id: userId, channelTitle }
            });
            addLog(`YouTube connected (localStorage): ${channelTitle}`);
          } else {
              setYouTubeAuth(prev => ({ ...prev, isLoading: false }));
            }
          }
          popup.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'YOUTUBE_AUTH_ERROR') {
          completed = true;
          const err = event.data.error || 'Authorization failed';
          addLog(`YouTube authentication failed: ${err}`);
          setYouTubeAuth(prev => ({ ...prev, isLoading: false, error: err }));
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };
      window.addEventListener('message', messageHandler);
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', messageHandler);
          if (!completed) {
            // Fallback: check localStorage (backend callback may have populated it)
            const userId = localStorage.getItem('youtube_user_id');
            const channelTitle = localStorage.getItem('youtube_channel_title');
            if (userId && channelTitle) {
              setYouTubeAuth({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                userInfo: { id: userId, channelTitle }
              });
              addLog(`YouTube connected (fallback): ${channelTitle}`);
            } else {
              setYouTubeAuth(prev => ({ ...prev, isLoading: false, error: 'Login cancelled' }));
            }
          }
        }
      }, 800);
    } catch (error) {
      addLog(`YouTube authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setYouTubeAuth(prev => ({ ...prev, isLoading: false, error: String(error) }));
    }
  };

  // TikTok connect (using popup OAuth like TikTokShortsDebugger)
  const handleTikTokConnect = async () => {
    setTiktokAuth(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting TikTok authentication...');
    
    try {
      const popupWidth = 640;
      const popupHeight = 655;
      const popup = window.open('', 'tiktok-oauth', `width=${popupWidth},height=${popupHeight}`);
      if (!popup) throw new Error('Popup blocked');
      
      const response = await fetch('/api/tiktok/auth-url', { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to get auth URL');
      
      popup.location.href = data.auth_url;
      
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'TIKTOK_AUTH_SUCCESS') {
          const authData = event.data.authData?.data;
          if (authData) {
            setTiktokAuth({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              userInfo: {
                userId: authData.user_id,
                displayName: authData.display_name,
                avatarUrl: authData.avatar_url,
                followerCount: authData.follower_count
              }
            });
            localStorage.setItem('tiktok_user_id', authData.user_id);
            localStorage.setItem('tiktok_display_name', authData.display_name);
            if (authData.avatar_url) localStorage.setItem('tiktok_avatar_url', authData.avatar_url);
            addLog(`TikTok connected: ${authData.display_name}`);
          }
          popup.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'TIKTOK_AUTH_ERROR') {
          addLog(`TikTok authentication error: ${event.data.error}`);
          setTiktokAuth(prev => ({ ...prev, isLoading: false, error: event.data.error }));
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Cleanup if popup closes
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setTiktokAuth(prev => ({ ...prev, isLoading: false }));
        }
      }, 1000);
    } catch (error) {
      addLog(`TikTok authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTiktokAuth(prev => ({ ...prev, isLoading: false, error: String(error) }));
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    addLog(`Selected file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  // Unified upload to all connected platforms
  const handleUpload = async () => {
    if (!selectedFile) {
      addLog('❌ No file selected');
      return;
    }

    const connected = [instagramAuth.isAuthenticated, youtubeAuth.isAuthenticated, tiktokAuth.isAuthenticated].filter(Boolean).length;
    if (connected === 0) {
      addLog('❌ No platforms connected');
      return;
    }

    setIsUploading(true);
    addLog(`🚀 Starting upload to ${connected} platform(s)...`);

    const uploads: Promise<{ platform: string; success: boolean; message: string }>[] = [];

    // Instagram upload
    if (instagramAuth.isAuthenticated) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption);
      formData.append('user_id', instagramAuth.userInfo?.id || '');
      
      uploads.push(
        fetch('/api/instagram/upload-reel', {
          method: 'POST',
          body: formData,
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
          .then(async r => {
            const data = await r.json();
            addLog(`🧾 Instagram response: ${JSON.stringify(data)}`);
            return {
              platform: 'Instagram',
              success: r.ok && data.success,
              message: data.message || data.detail || 'Uploaded'
            };
          })
          .catch(e => ({ platform: 'Instagram', success: false, message: String(e) }))
      );
    }

    // YouTube upload
    if (youtubeAuth.isAuthenticated) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', caption);
      formData.append('description', caption);
      formData.append('user_id', youtubeAuth.userInfo?.id || '');
      
      uploads.push(
        fetch('/api/youtube/upload-short', {
          method: 'POST',
          body: formData,
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
          .then(async r => {
            const data = await r.json();
            addLog(`🧾 YouTube response: ${JSON.stringify(data)}`);
            return {
              platform: 'YouTube',
              success: r.ok && data.success,
              message: data.message || 'Uploaded'
            };
          })
          .catch(e => ({ platform: 'YouTube', success: false, message: String(e) }))
      );
    }

    // TikTok upload
    if (tiktokAuth.isAuthenticated) {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('description', caption);
      formData.append('user_id', tiktokAuth.userInfo?.userId || '');
      
      uploads.push(
        fetch('/api/tiktok/upload-video', {
          method: 'POST',
          body: formData,
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
          .then(async r => {
            const data = await r.json();
            addLog(`🧾 TikTok response: ${JSON.stringify(data)}`);
            return {
              platform: 'TikTok',
              success: r.ok && data.success,
              message: data.message || 'Uploaded'
            };
          })
          .catch(e => ({ platform: 'TikTok', success: false, message: String(e) }))
      );
    }

    const results = await Promise.all(uploads);
    results.forEach(r => {
      addLog(`${r.success ? '✅' : '❌'} ${r.platform}: ${r.message}`);
    });

    setIsUploading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🚀 Unified Video Uploader
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Upload a single video and post it to all connected social media platforms (Instagram Reels & YouTube Shorts).
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Platform Connections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Instagram */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-600" />
              <span className="font-medium text-gray-900 dark:text-white">Instagram</span>
            </div>
            {instagramAuth.isAuthenticated ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Not Connected</span>
            )}
          </div>
          
          {instagramAuth.isAuthenticated && instagramAuth.userInfo && (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">
              <div>@{instagramAuth.userInfo.username}</div>
              {instagramAuth.userInfo.account_type && (
                <div className="text-xs text-gray-500">{instagramAuth.userInfo.account_type}</div>
              )}
            </div>
          )}
          
          {instagramAuth.error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              {instagramAuth.error}
            </div>
          )}
          
          <button
            onClick={handleInstagramConnect}
            disabled={instagramAuth.isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {instagramAuth.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Instagram className="w-4 h-4" />
                Connect Instagram
              </>
            )}
          </button>
        </div>

        {/* YouTube */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-600" />
              <span className="font-medium text-gray-900 dark:text-white">YouTube</span>
            </div>
            {youtubeAuth.isAuthenticated ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Not Connected</span>
            )}
          </div>
          
          {youtubeAuth.isAuthenticated && youtubeAuth.userInfo && (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">
              <div>{youtubeAuth.userInfo.channelTitle}</div>
              {youtubeAuth.userInfo.subscriberCount && (
                <div className="text-xs text-gray-500">{parseInt(youtubeAuth.userInfo.subscriberCount).toLocaleString()} subscribers</div>
              )}
            </div>
          )}
          
          <button
            onClick={handleYouTubeConnect}
            disabled={youtubeAuth.isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {youtubeAuth.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Youtube className="w-4 h-4" />
                Connect YouTube
              </>
            )}
          </button>
        </div>

        {/* TikTok */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              <span className="font-medium text-gray-900 dark:text-white">TikTok</span>
            </div>
            {tiktokAuth.isAuthenticated ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Not Connected</span>
            )}
          </div>
          
          {tiktokAuth.isAuthenticated && tiktokAuth.userInfo && (
            <div className="mb-3 flex items-center gap-2">
              {tiktokAuth.userInfo.avatarUrl && (
                <img src={tiktokAuth.userInfo.avatarUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div>{tiktokAuth.userInfo.displayName}</div>
                {tiktokAuth.userInfo.followerCount && (
                  <div className="text-xs text-gray-500">{parseInt(tiktokAuth.userInfo.followerCount).toLocaleString()} followers</div>
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={handleTikTokConnect}
            disabled={tiktokAuth.isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {tiktokAuth.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Music className="w-4 h-4" />
                Connect TikTok
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Video Selection</h3>
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <video src={previewUrl} controls className="mx-auto max-h-64 rounded" />
          ) : (
            <>
              <UploadCloud className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">Select a video file to upload</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
            <FileVideo2 className="w-4 h-4" />
            Choose Video File
          </button>
        </div>
      </div>

      {/* Caption */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Caption</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption to reuse across platforms"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Upload Button */}
      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || (!instagramAuth.isAuthenticated && !youtubeAuth.isAuthenticated && !tiktokAuth.isAuthenticated)}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="w-5 h-5" />
              Upload to Connected Platforms
            </>
          )}
        </button>
      </div>

      {/* Debug Logs */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Debug Logs</h3>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            debugLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
