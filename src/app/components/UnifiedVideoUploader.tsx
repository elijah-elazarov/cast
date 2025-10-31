'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Instagram, Youtube, Music, UploadCloud, FileVideo2, Loader2, X } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */

type FacebookLoginStatus = {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: { accessToken: string; userID?: string; expiresIn?: number; grantedScopes?: string };
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

// (Removed unused ApiResponse type)

// Instagram auth (from InstagramReelsDebugger)
interface InstagramAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    id: string;
    username: string;
    account_type?: string;
    avatarUrl?: string;
    followerCount?: string;
  } | null;
  longLivedToken?: string | null;
  instagramPageId?: string | null;
  facebookUserId?: string | null;
}

// YouTube auth (from YouTubeShortsDebugger)
interface YouTubeAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    id?: string;
    channelTitle?: string;
    channelDescription?: string;
    customUrl?: string;
    publishedAt?: string;
    country?: string;
    thumbnailUrl?: string;
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
    hiddenSubscriberCount?: boolean;
  } | null;
}

// TikTok auth (from TikTokShortsDebugger)
interface TikTokAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    userId?: string;
    username?: string;
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

  // YouTube API config (same as debugger)
  const YOUTUBE_CONFIG = {
    clientId: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || 'your-client-id',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/youtube/callback`,
    apiVersion: 'v3'
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
  const [instagramReel, setInstagramReel] = useState(true);
  const [instagramStory, setInstagramStory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  
  // Processed video URLs for each platform
  const [ytProcessedUrl, setYtProcessedUrl] = useState<string | null>(null);
  const [ttProcessedUrl, setTtProcessedUrl] = useState<string | null>(null);
  const [igReelsUrl, setIgReelsUrl] = useState<string | null>(null);
  const [igStoriesUrl, setIgStoriesUrl] = useState<string | null>(null);
  const [igThumbUrl, setIgThumbUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [videosReady, setVideosReady] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[UNIFIED UPLOAD] ${message}`);
  }, []);

  // Derive platform/category/level styling for logs without changing stored format
  const getLogMeta = (line: string) => {
    const lower = line.toLowerCase();
    let platform: 'instagram' | 'youtube' | 'tiktok' | 'system' = 'system';
    if (lower.includes('tiktok')) platform = 'tiktok';
    else if (lower.includes('youtube')) platform = 'youtube';
    else if (lower.includes('instagram') || lower.includes('facebook sdk') || lower.includes('fb.')) platform = 'instagram';

    let category: 'auth' | 'process' | 'upload' | 'validate' | 'logout' | 'config' | 'other' = 'other';
    if (lower.includes('auth') || lower.includes('login') || lower.includes('token')) category = 'auth';
    else if (lower.includes('process') || lower.includes('generating')) category = 'process';
    else if (lower.includes('upload') || lower.includes('publish')) category = 'upload';
    else if (lower.includes('validate') || lower.includes('status')) category = 'validate';
    else if (lower.includes('logout')) category = 'logout';
    else if (lower.includes('initialized') || lower.includes('configuration')) category = 'config';

    let level: 'ok' | 'warn' | 'error' | 'info' = 'info';
    if (lower.includes('❌') || lower.includes('error') || lower.includes('failed')) level = 'error';
    else if (lower.includes('⚠️') || lower.includes('warning')) level = 'warn';
    else if (lower.includes('✅') || lower.includes('success')) level = 'ok';

    const platformColor =
      platform === 'youtube' ? 'bg-red-600' : platform === 'tiktok' ? 'bg-yellow-600' : platform === 'instagram' ? 'bg-purple-600' : 'bg-gray-600';
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

    return { platform, category, level, platformColor, levelColor, categoryColor };
  };

  // Add initial YouTube configuration logs (guarded for React Strict Mode)
  const hasLoggedInit = useRef<boolean>(false);
  useEffect(() => {
    if (hasLoggedInit.current) return;
    hasLoggedInit.current = true;
    const youtubeUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_YOUTUBE || 'youtube_uploads';
    addLog('🎬 YouTube Shorts Debugger initialized');
    addLog('📋 Configuration loaded');
    addLog(`🔑 Client ID: ${YOUTUBE_CONFIG.clientId.substring(0, 8)}...`);
    addLog(`📦 Upload Preset: ${youtubeUploadPreset}`);
    addLog(`🌐 API Version: ${YOUTUBE_CONFIG.apiVersion}`);
    addLog(`📡 Scopes: ${YOUTUBE_CONFIG.scope}`);
    addLog(`🔗 Redirect URI: ${YOUTUBE_CONFIG.redirectUri}`);
    addLog('✅ Ready to connect and upload videos to YouTube');
    addLog('👆 Click "Connect YouTube" to begin authentication');
  }, [addLog, YOUTUBE_CONFIG.apiVersion, YOUTUBE_CONFIG.clientId, YOUTUBE_CONFIG.redirectUri, YOUTUBE_CONFIG.scope]);

  // Add initial TikTok configuration logs (guarded for React Strict Mode)
  useEffect(() => {
    if (!hasLoggedInit.current) return; // ensure only one batch of init logs per mount
    const tiktokClientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'your-client-key';
    const tiktokUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_TIKTOK || 'tiktok_uploads';
    addLog('🎵 TikTok Shorts Debugger initialized');
    addLog('📋 Configuration loaded');
    addLog(`🔑 Client Key: ${tiktokClientKey.substring(0, 8)}...`);
    addLog(`📦 Upload Preset: ${tiktokUploadPreset}`);
    addLog('✅ Ready to connect and upload videos to TikTok');
    addLog('👆 Click "Connect TikTok" to begin authentication');
  }, [addLog]);

  // Sync auth state with localStorage changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // React to Instagram-related localStorage changes
      if (e.key && (e.key.startsWith('instagram_') || e.key.startsWith('facebook_'))) {
        const userId = localStorage.getItem('instagram_user_id');
        const username = localStorage.getItem('instagram_username');
        const longLivedToken = localStorage.getItem('instagram_long_lived_token');
        const pageId = localStorage.getItem('instagram_page_id');

        if (userId && username && longLivedToken && pageId) {
          // Auth state exists in localStorage - sync it
          if (!instagramAuth.isAuthenticated) {
            addLog('🔄 Syncing Instagram auth state from localStorage (change detected)...');
            setInstagramAuth(prev => ({
              ...prev,
              isAuthenticated: true,
              userInfo: {
                id: userId,
                username: username
              },
              longLivedToken: longLivedToken,
              instagramPageId: pageId,
              facebookUserId: localStorage.getItem('facebook_user_id') || null
            }));
            addLog('✅ Instagram auth state synced from localStorage');
          }
        } else {
          // Auth state removed from localStorage - clear state
          if (instagramAuth.isAuthenticated) {
            addLog('🔄 Clearing Instagram auth state (logout detected in another component)...');
            setInstagramAuth({
              isAuthenticated: false,
              isLoading: false,
              error: null,
              userInfo: null,
              longLivedToken: null,
              instagramPageId: null,
              facebookUserId: null
            });
            addLog('✅ Instagram auth state cleared');
          }
        }
      }

      // React to YouTube-related localStorage changes
      if (e.key && e.key.startsWith('youtube_')) {
        const userId = localStorage.getItem('youtube_user_id');
        const channelTitle = localStorage.getItem('youtube_channel_title');

        if (userId && channelTitle) {
          // Auth state exists in localStorage - sync it
          if (!youtubeAuth.isAuthenticated) {
            addLog('🔄 Syncing YouTube auth state from localStorage (change detected)...');
            setYouTubeAuth(prev => ({
              ...prev,
              isAuthenticated: true,
              userInfo: {
                id: userId,
                username: channelTitle,
                channelTitle: channelTitle
              }
            }));
            addLog('✅ YouTube auth state synced from localStorage');
          }
        } else {
          // Auth state removed from localStorage - clear state
          if (youtubeAuth.isAuthenticated) {
            addLog('🔄 Clearing YouTube auth state (logout detected in another component)...');
            setYouTubeAuth({
              isAuthenticated: false,
              isLoading: false,
              error: null,
              userInfo: null
            });
            addLog('✅ YouTube auth state cleared');
          }
        }
      }

      // React to TikTok-related localStorage changes
      if (e.key && e.key.startsWith('tiktok_')) {
        const userId = localStorage.getItem('tiktok_user_id');
        const displayName = localStorage.getItem('tiktok_display_name');
        const usernameLs = localStorage.getItem('tiktok_username');

        if (userId && (displayName || usernameLs)) {
          // Auth state exists in localStorage - sync it
          if (!tiktokAuth.isAuthenticated) {
            addLog('🔄 Syncing TikTok auth state from localStorage (change detected)...');
            setTiktokAuth((prev: typeof tiktokAuth) => ({
              ...prev,
              isAuthenticated: true,
              userInfo: {
                userId: userId,
                username: usernameLs || undefined,
                displayName: displayName || usernameLs || 'TikTok User',
                avatarUrl: localStorage.getItem('tiktok_avatar_url') || ''
              }
            }));
            addLog('✅ TikTok auth state synced from localStorage');
          }
        } else {
          // Auth state removed from localStorage - clear state (unless explicitly logged out in this tab)
          if (tiktokAuth.isAuthenticated && !sessionStorage.getItem('tiktok_explicit_logout')) {
            addLog('🔄 Clearing TikTok auth state (logout detected in another component)...');
            setTiktokAuth({
              isAuthenticated: false,
              isLoading: false,
              error: null,
              userInfo: null
            });
            addLog('✅ TikTok auth state cleared');
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [instagramAuth.isAuthenticated, youtubeAuth.isAuthenticated, tiktokAuth.isAuthenticated, addLog]);

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
      const longLivedToken = localStorage.getItem('instagram_long_lived_token');
      const pageId = localStorage.getItem('instagram_page_id');
      const fbUserId = localStorage.getItem('facebook_user_id');
      if (instagramUserId && instagramUsername) {
        setInstagramAuth({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userInfo: {
            id: instagramUserId,
            username: instagramUsername,
            account_type: localStorage.getItem('instagram_account_type') || undefined
          },
          longLivedToken: longLivedToken || null,
          instagramPageId: pageId || null,
          facebookUserId: fbUserId || null
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

  }, [addLog, INSTAGRAM_CONFIG.appId, INSTAGRAM_CONFIG.apiVersion]);


  // Helper: exchange short-lived token to long-lived via backend
  const exchangeLongLivedToken = async (shortLived: string): Promise<string> => {
    addLog('Getting long-lived token from backend...');
    try {
      const res = await fetch('/api/instagram/graph/long-lived-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: shortLived })
      });
      if (!res.ok) {
        const errorData = await res.json();
        addLog(`Long-lived token failed: ${JSON.stringify(errorData)}`);
        throw new Error(`Long-lived token failed: ${errorData.error || 'Unknown error'}`);
      }
      const json = await res.json();
      addLog(`Long-lived token successful: ${json.success}`);
      if (json.data?.expires_in) {
        addLog(`Token expires in: ${json.data.expires_in} seconds`);
      }
      const longLivedToken = json.data.access_token as string;
      addLog(`Long-lived token obtained: ${longLivedToken.substring(0, 20)}...`);
      return longLivedToken;
    } catch (error) {
      addLog(`Long-lived token error: ${error}`);
      throw error;
    }
  };

  // Helper: find IG business account via FB pages (returns all needed fields)
  const resolveInstagramAccount = async (accessToken: string): Promise<{ id: string; username: string; pageId: string; avatarUrl?: string; followerCount?: string }> => {
    addLog('Getting Instagram Business Account from Facebook Pages...');
    const pagesUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`;
    const pagesRes = await fetch(pagesUrl);
    if (!pagesRes.ok) {
      const errorData = await pagesRes.json();
      addLog(`Pages fetch failed: ${JSON.stringify(errorData)}`);
      throw new Error(`Pages fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }
    const pages = await pagesRes.json();
    addLog(`Found ${pages.data?.length || 0} Facebook Pages`);
    for (const page of pages.data || []) {
      addLog(`Checking page: ${page.name} (${page.id})`);
      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        addLog(`Found Instagram Business Account: ${igId}`);
        addLog(`Page ID: ${page.id}, Page Access Token: ${page.access_token ? 'Present' : 'Missing'}`);
        const igUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${igId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${accessToken}`;
        const igRes = await fetch(igUrl);
        if (!igRes.ok) {
          const errorData = await igRes.json();
          addLog(`Instagram account fetch failed: ${JSON.stringify(errorData)}`);
          continue;
        }
        const ig = await igRes.json();
        addLog(`Instagram account details: ${JSON.stringify(ig)}`);
        if (page.access_token && page.id) {
          const pageUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${page.id}`;
          const pageParams = new URLSearchParams({
            fields: 'instagram_business_account{id,username,name,media_count,followers_count}',
            access_token: page.access_token
          });
          try {
            const pageResponse = await fetch(`${pageUrl}?${pageParams.toString()}`);
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              if (pageData.instagram_business_account) {
                addLog(`✅ Instagram Business Account connected to page: ${pageData.instagram_business_account.username}`);
              }
            } else {
              const errorData = await pageResponse.json().catch(() => ({}));
              addLog(`Page API call failed (${pageResponse.status}): ${JSON.stringify(errorData)}`);
            }
          } catch (error) {
            addLog(`Page API call error: ${error}`);
          }
        }
        if (ig?.id && ig?.username) {
          addLog(`Instagram account found: ${ig.username} (${ig.id})`);
          addLog(`Instagram Page ID: ${igId}`);
          addLog('Authentication completed successfully!');
          return { id: ig.id, username: ig.username, pageId: igId, avatarUrl: ig.profile_picture_url, followerCount: ig.followers_count ? String(ig.followers_count) : undefined };
        }
      } else {
        addLog(`Page ${page.name} has no Instagram Business Account`);
      }
    }
    throw new Error('No Instagram Business account found');
  };

  // Instagram connect (use Facebook SDK like the debugger)
  const handleInstagramConnect = async () => {
    setInstagramAuth(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting Instagram authentication...');
    try {
      const w = window as FBWindow;
      if (!w.FB || !fbSdkLoaded) throw new Error('Facebook SDK not loaded yet');
      // Check existing login
      const auth = await new Promise<FacebookLoginStatus>((resolve) => w.FB!.getLoginStatus((r) => resolve(r as unknown as FacebookLoginStatus)));
      addLog(`Login status check: ${auth?.status || 'unknown'}`);
      let accessToken: string | null = null;
      let fbUserId: string | null = null;
      let grantedScopes: string | undefined;
      let expiresIn: number | undefined;
      if (auth?.status === 'connected') {
        accessToken = auth.authResponse?.accessToken || null;
        fbUserId = auth.authResponse?.userID || null;
        expiresIn = auth.authResponse?.expiresIn;
        grantedScopes = auth.authResponse?.grantedScopes;
        addLog(`Already logged in with user ID: ${fbUserId}`);
        addLog('Already logged in, using existing token');
      } else {
        addLog('Invoking FB.login...');
        const loginRes = await new Promise<FacebookLoginStatus>((resolve) => w.FB!.login((r) => resolve(r as unknown as FacebookLoginStatus), { scope: INSTAGRAM_CONFIG.scope, return_scopes: true }));
        accessToken = loginRes.authResponse?.accessToken || null;
        fbUserId = loginRes.authResponse?.userID || null;
        expiresIn = loginRes.authResponse?.expiresIn;
        grantedScopes = loginRes.authResponse?.grantedScopes;
        addLog(`Login successful for user: ${fbUserId}`);
      }
      if (!accessToken || !fbUserId) throw new Error('Login failed or cancelled');
      
      // Log auth response details (matching debugger)
      addLog(`Processing auth response for user: ${fbUserId}`);
      if (expiresIn) {
        addLog(`Access token expires in: ${expiresIn} seconds`);
      }
      if (grantedScopes) {
        addLog(`Granted scopes: ${grantedScopes}`);
      }
      
      const longLived = await exchangeLongLivedToken(accessToken);
      const ig = await resolveInstagramAccount(longLived);
      // Persist and update UI
      localStorage.setItem('instagram_user_id', ig.id);
      localStorage.setItem('instagram_username', ig.username);
      localStorage.setItem('instagram_long_lived_token', longLived);
      localStorage.setItem('instagram_page_id', ig.pageId);
      localStorage.setItem('facebook_user_id', fbUserId);
      setInstagramAuth({ 
        isAuthenticated: true, 
        isLoading: false, 
        error: null, 
        userInfo: { id: ig.id, username: ig.username, avatarUrl: ig.avatarUrl, followerCount: ig.followerCount },
        longLivedToken: longLived,
        instagramPageId: ig.pageId,
        facebookUserId: fbUserId
      });
      addLog('Authentication completed successfully!');
      // Dispatch custom event for TokenManager and other components
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'instagram' } }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Authentication error: ${msg}`);
      setInstagramAuth(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  // Instagram logout (use Facebook SDK - Instagram doesn't have a server-side revoke endpoint)
  // Best practice: Check FB.getLoginStatus() first before calling FB.logout() to avoid "no access token" errors
  // See: https://stackoverflow.com/questions/8430474/fb-logout-called-without-an-access-token
  const handleInstagramLogout = () => {
    addLog('Logging out from Instagram...');
    const w = window as FBWindow;
    if (w.FB) {
      // Step 1: Validate token by checking login status (similar to YouTube/TikTok validation)
      addLog('🔍 Validating Instagram access token...');
      // First check if user is connected (prevents "FB.logout() called without an access token" error)
      w.FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
          // User is connected, token is valid
          addLog('✅ Instagram access token validated (token was active)');
          // Step 2: Revoke token via FB.logout()
          w.FB.logout(() => {
            localStorage.removeItem('instagram_user_id');
            localStorage.removeItem('instagram_username');
            localStorage.removeItem('instagram_long_lived_token');
            localStorage.removeItem('instagram_page_id');
            localStorage.removeItem('facebook_user_id');
            localStorage.removeItem('instagram_account_type');
            setInstagramAuth({
              isAuthenticated: false,
              isLoading: false,
              error: null,
              userInfo: null,
              longLivedToken: null,
              instagramPageId: null,
              facebookUserId: null
            });
            addLog('✅ Instagram access token revoked on Facebook servers via FB.logout()');
            addLog('✅ Local session cleared - logout complete');
            addLog('Logged out from Instagram successfully');
            // Dispatch custom event for TokenManager and other components
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'instagram' } }));
          });
        } else {
          // User not connected or no access token, token was invalid
          addLog('⚠️ Instagram access token was already invalid/expired (skipping revoke)');
          // Just clear local state
          localStorage.removeItem('instagram_user_id');
          localStorage.removeItem('instagram_username');
          localStorage.removeItem('instagram_long_lived_token');
          localStorage.removeItem('instagram_page_id');
          localStorage.removeItem('facebook_user_id');
          localStorage.removeItem('instagram_account_type');
          setInstagramAuth({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            userInfo: null,
            longLivedToken: null,
            instagramPageId: null,
            facebookUserId: null
          });
          addLog('✅ Local session cleared - logout complete');
          addLog('Logged out from Instagram successfully');
        }
      });
    } else {
      // If SDK not loaded, just clear state and localStorage
      localStorage.removeItem('instagram_user_id');
      localStorage.removeItem('instagram_username');
      localStorage.removeItem('instagram_long_lived_token');
      localStorage.removeItem('instagram_page_id');
      localStorage.removeItem('facebook_user_id');
      localStorage.removeItem('instagram_account_type');
      setInstagramAuth({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userInfo: null,
        longLivedToken: null,
        instagramPageId: null,
        facebookUserId: null
      });
      addLog('Logged out from Instagram successfully');
      // Dispatch custom event for TokenManager and other components
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'instagram' } }));
    }
  };

  // Check if already authenticated (for YouTube) - from state or localStorage
  const checkYouTubeExistingAuth = (): boolean => {
    // First check if already authenticated in state
    if (youtubeAuth.isAuthenticated && youtubeAuth.userInfo) {
      addLog('Already authenticated, refreshing auth data...');
      addLog(`✅ Authenticated as: ${youtubeAuth.userInfo.channelTitle || 'YouTube User'}`);
      if (youtubeAuth.userInfo.id) {
        addLog(`📺 Channel ID: ${youtubeAuth.userInfo.id}`);
      }
      if (youtubeAuth.userInfo.subscriberCount) {
        addLog(`👥 Subscribers: ${youtubeAuth.userInfo.subscriberCount}`);
      }
      addLog('Authentication refreshed successfully!');
      return true;
    }
    
    // Check localStorage for stored session (like Instagram does)
    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const youtubeChannelTitle = localStorage.getItem('youtube_channel_title');
    
    if (youtubeUserId && youtubeChannelTitle) {
      addLog('Found existing YouTube session in storage, reconnecting...');
      const storedUserInfo: YouTubeAuthState['userInfo'] = {
        id: youtubeUserId,
        channelTitle: youtubeChannelTitle,
        thumbnailUrl: localStorage.getItem('youtube_thumbnail_url') || undefined,
        subscriberCount: localStorage.getItem('youtube_subscriber_count') || undefined,
        channelDescription: localStorage.getItem('youtube_channel_description') || undefined,
        customUrl: localStorage.getItem('youtube_custom_url') || undefined,
        publishedAt: localStorage.getItem('youtube_published_at') || undefined,
        country: localStorage.getItem('youtube_country') || undefined,
        videoCount: localStorage.getItem('youtube_video_count') || undefined,
        viewCount: localStorage.getItem('youtube_view_count') || undefined,
        hiddenSubscriberCount: localStorage.getItem('youtube_hidden_subscriber_count') === 'true' || undefined
      };
      
      setYouTubeAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: storedUserInfo
      });
      
      addLog(`✅ Reconnected as: ${youtubeChannelTitle}`);
      if (youtubeUserId) {
        addLog(`📺 Channel ID: ${youtubeUserId}`);
      }
      if (storedUserInfo.subscriberCount) {
        addLog(`👥 Subscribers: ${storedUserInfo.subscriberCount}`);
      }
      addLog('Session restored successfully!');
      return true;
    }
    
    return false;
  };

  // YouTube connect (popup OAuth like YouTubeShortsDebugger)
  const handleYouTubeConnect = async () => {
    setYouTubeAuth(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('Starting YouTube Shorts authentication...');
    try {
      // First check if already authenticated or can reconnect from storage
      const isRefreshed = checkYouTubeExistingAuth();
      if (isRefreshed) {
        setYouTubeAuth(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const popupWidth = 640;
      const popupHeight = 655;
      const popup = window.open('', 'youtube-oauth', `width=${popupWidth},height=${popupHeight},scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no`);
      if (!popup) throw new Error('Popup blocked. Please allow popups for this site.');
      try { popup.document.title = 'Connecting to YouTube…'; popup.focus(); } catch {}
      addLog(`Popup metrics -> width:${popupWidth}, height:${popupHeight} (browser-positioned)`);

      interface YoutubeAuthUrlResponse { success: boolean; data?: { auth_url?: string }; auth_url?: string; error?: string }
      const response = await fetch('/api/youtube/auth-url', { headers: { 'ngrok-skip-browser-warning': 'true' } });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        popup.close();
        throw new Error(`Auth URL fetch returned non-JSON: ${text.slice(0,80)}...`);
      }
      const json = data as Partial<YoutubeAuthUrlResponse>;
      if (!json.success) { popup.close(); throw new Error(json.error || 'Failed to get auth URL'); }
      const authUrl = json.data?.auth_url ?? json.auth_url;
      if (!authUrl) { popup.close(); throw new Error('Auth URL missing in response'); }
      addLog('Opening YouTube authentication popup...');
      popup.location.href = authUrl;

      let completed = false;
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
          completed = true;
          handleYouTubeAuthSuccess(event.data.authData);
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
            setYouTubeAuth(prev => ({ ...prev, isLoading: false, error: 'Login cancelled or failed' }));
          }
        }
      }, 800);
    } catch (error) {
      addLog(`YouTube authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setYouTubeAuth(prev => ({ ...prev, isLoading: false, error: String(error) }));
    }
  };

  // Handle successful YouTube authentication (matching debugger)
  const handleYouTubeAuthSuccess = async (authData: { success: boolean; data?: { user_id?: string; channel_title?: string; channel_description?: string; custom_url?: string; published_at?: string; country?: string; thumbnail_url?: string; subscriber_count?: string; video_count?: string; view_count?: string; hidden_subscriber_count?: boolean }; message?: string }) => {
    try {
      addLog('Processing authentication data...');
      
      if (!authData || !authData.data) {
        throw new Error('Invalid authentication data');
      }
      
      const userData = authData.data;
      addLog(`🔍 Debug - Received data: ${JSON.stringify(userData)}`);
      
      const userInfo: YouTubeAuthState['userInfo'] = {
        id: userData.user_id,
        channelTitle: userData.channel_title,
        channelDescription: userData.channel_description,
        customUrl: userData.custom_url,
        publishedAt: userData.published_at,
        country: userData.country,
        thumbnailUrl: userData.thumbnail_url,
        subscriberCount: userData.subscriber_count,
        videoCount: userData.video_count,
        viewCount: userData.view_count,
        hiddenSubscriberCount: userData.hidden_subscriber_count
      };
      
      setYouTubeAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo
      });
      
      // Store in localStorage for reconnection (like Instagram does)
      if (userData.user_id) localStorage.setItem('youtube_user_id', userData.user_id);
      if (userData.channel_title) localStorage.setItem('youtube_channel_title', userData.channel_title);
      if (userData.channel_description) localStorage.setItem('youtube_channel_description', userData.channel_description);
      if (userData.custom_url) localStorage.setItem('youtube_custom_url', userData.custom_url);
      if (userData.published_at) localStorage.setItem('youtube_published_at', userData.published_at);
      if (userData.country) localStorage.setItem('youtube_country', userData.country);
      if (userData.thumbnail_url) localStorage.setItem('youtube_thumbnail_url', userData.thumbnail_url);
      if (userData.subscriber_count) localStorage.setItem('youtube_subscriber_count', userData.subscriber_count);
      if (userData.video_count) localStorage.setItem('youtube_video_count', userData.video_count);
      if (userData.view_count) localStorage.setItem('youtube_view_count', userData.view_count);
      if (userData.hidden_subscriber_count !== undefined) localStorage.setItem('youtube_hidden_subscriber_count', String(userData.hidden_subscriber_count));

      addLog(`✅ Authenticated as: ${userData.channel_title || 'YouTube User'}`);
      if (userData.user_id) {
        addLog(`📺 Channel ID: ${userData.user_id}`);
      }
      if (userData.subscriber_count) {
        addLog(`👥 Subscribers: ${userData.subscriber_count}`);
      }
      addLog('Authentication completed successfully!');
      // Dispatch custom event for TokenManager and other components
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'youtube' } }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Auth success processing error: ${msg}`);
      setYouTubeAuth(prev => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  // YouTube logout (call backend to revoke session - backend calls Google's official revoke endpoint)
  // Note: We check local auth state (similar to FB.getLoginStatus() for Instagram)
  // Google's revoke endpoint handles invalid tokens gracefully, so no pre-check needed
  const handleYouTubeLogout = async () => {
    addLog('Logging out from YouTube...');
    
    // Check if user is authenticated (similar to FB.getLoginStatus() check)
    if (!youtubeAuth.isAuthenticated && !localStorage.getItem('youtube_user_id')) {
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
      setYouTubeAuth({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userInfo: null
      });
      addLog('Logged out from YouTube successfully');
      return;
    }
    
    // User is authenticated, validate token then revoke
    const userId = youtubeAuth.userInfo?.id || localStorage.getItem('youtube_user_id');
    
    if (userId) {
      try {
        addLog('🔍 Validating YouTube access token...');
        // Use Next.js API proxy to call backend (like YouTubeConnection.tsx does)
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
    
    // Clear localStorage
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
    
    // Reset state
    setYouTubeAuth({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null
    });
    
    addLog('Logged out from YouTube successfully');
    // Dispatch custom event for TokenManager and other components
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'youtube' } }));
  };

  // Check if already authenticated (for TikTok) - from state or localStorage
  // Note: Only reconnects from localStorage if state is NOT authenticated AND user didn't explicitly logout
  // TikTok OAuth auto-reconnects if session is still valid on TikTok's servers (no official revoke endpoint)
  const checkTikTokExistingAuth = (): boolean => {
    // First check if already authenticated in state
    if (tiktokAuth.isAuthenticated && tiktokAuth.userInfo) {
      addLog('Already authenticated, refreshing auth data...');
      addLog(`✅ Authenticated as: ${tiktokAuth.userInfo.displayName || 'TikTok User'}`);
      if (tiktokAuth.userInfo.userId) {
        addLog(`📺 User ID: ${tiktokAuth.userInfo.userId}`);
      }
      if (tiktokAuth.userInfo.followerCount) {
        addLog(`👥 Followers: ${tiktokAuth.userInfo.followerCount}`);
      }
      addLog('Authentication refreshed successfully!');
      return true;
    }
    
    // Check if user explicitly logged out (prevent auto-reconnection)
    // SessionStorage persists only for the tab session, ensuring logout applies until tab is closed
    const explicitLogout = sessionStorage.getItem('tiktok_explicit_logout');
    if (explicitLogout === 'true') {
      addLog('⚠️ User explicitly logged out - clearing localStorage and forcing fresh authentication');
      localStorage.removeItem('tiktok_user_id');
      localStorage.removeItem('tiktok_display_name');
      localStorage.removeItem('tiktok_avatar_url');
      localStorage.removeItem('tiktok_follower_count');
      // Keep the flag to prevent reconnection during this session
      // User will need to complete a fresh OAuth flow
      return false;
    }
    
    // Only check localStorage for reconnection if state is NOT authenticated AND no explicit logout
    // This prevents reconnection after explicit logout
    if (!tiktokAuth.isAuthenticated) {
      const tiktokUserId = localStorage.getItem('tiktok_user_id');
      const tiktokDisplayName = localStorage.getItem('tiktok_display_name');
      
      if (tiktokUserId && tiktokDisplayName) {
        addLog('Found existing TikTok session in storage, reconnecting...');
        const storedUserInfo: TikTokAuthState['userInfo'] = {
          userId: tiktokUserId,
          displayName: tiktokDisplayName,
          avatarUrl: localStorage.getItem('tiktok_avatar_url') || undefined,
          followerCount: localStorage.getItem('tiktok_follower_count') || undefined
        };
        
        setTiktokAuth({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userInfo: storedUserInfo
        });
        
        addLog(`✅ Reconnected as: ${tiktokDisplayName}`);
        if (tiktokUserId) {
          addLog(`📺 User ID: ${tiktokUserId}`);
        }
        if (storedUserInfo.followerCount) {
          addLog(`👥 Followers: ${storedUserInfo.followerCount}`);
        }
        addLog('Session restored successfully!');
        return true;
      }
    }
    
    return false;
  };

  // TikTok connect (matching TikTokShortsDebugger exactly)
  const handleTikTokConnect = async () => {
    setTiktokAuth(prev => ({ ...prev, isLoading: true, error: null }));
    addLog('— New TikTok authentication session —');
    addLog('Initializing TikTok authentication...');
    
    try {
      addLog('Starting TikTok Shorts authentication...');
      
      // First check if already authenticated
      const isRefreshed = checkTikTokExistingAuth();
      if (isRefreshed) {
        setTiktokAuth(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      addLog('Creating authentication popup...');
      
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
      const response = await fetch('/api/tiktok/auth-url', { headers: { 'ngrok-skip-browser-warning': 'true' } });
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
          handleTikTokAuthSuccess(event.data.authData);
          popup.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'TIKTOK_AUTH_ERROR') {
          completed = true;
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          addLog(`TikTok authentication failed: ${event.data.error}`);
          setTiktokAuth(prev => ({
            ...prev,
            isLoading: false,
            error: `TikTok authorization failed: ${event.data.error}`
          }));
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      checkClosedInterval = setInterval(() => {
        if (popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          window.removeEventListener('message', messageHandler);
          setTiktokAuth(prev => ({
            ...prev,
            isLoading: false,
            error: completed ? prev.error : 'Login cancelled or window closed before completing authentication'
          }));
        }
      }, 1000);
      
      // Failsafe timeout
      setTimeout(() => {
        if (!completed && !popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          try { popup.close(); } catch {}
          window.removeEventListener('message', messageHandler);
          setTiktokAuth(prev => ({
            ...prev,
            isLoading: false,
            error: 'Authentication timed out. Please try again.'
          }));
        }
      }, 2 * 60 * 1000); // 2 minutes
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Authentication error: ${errorMessage}`);
      setTiktokAuth(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

  // Handle successful TikTok authentication (matching TikTokShortsDebugger)
  const handleTikTokAuthSuccess = async (authData: { success: boolean; data?: { user_id?: string; username?: string; display_name?: string; avatar_url?: string; follower_count?: string; following_count?: string; video_count?: string; like_count?: string }; message?: string }) => {
    try {
      addLog('Processing authentication data...');
      
      if (!authData || !authData.data) {
        throw new Error('Invalid authentication data');
      }
      
      const userData = authData.data;
      addLog(`🔍 Debug - Received data: ${JSON.stringify(userData)}`);
      
      setTiktokAuth({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: {
          userId: userData.user_id,
          username: userData.username || undefined,
          displayName: userData.display_name,
          avatarUrl: userData.avatar_url,
          followerCount: userData.follower_count
        }
      });
      
      // Clear explicit logout flag on successful authentication (user intentionally reconnected)
      sessionStorage.removeItem('tiktok_explicit_logout');
      
      // Store in localStorage for reconnection (like Instagram/YouTube do)
      if (userData.user_id) localStorage.setItem('tiktok_user_id', userData.user_id);
      if (userData.username) localStorage.setItem('tiktok_username', userData.username);
      if (userData.display_name) localStorage.setItem('tiktok_display_name', userData.display_name);
      if (userData.avatar_url) localStorage.setItem('tiktok_avatar_url', userData.avatar_url);
      if (userData.follower_count) localStorage.setItem('tiktok_follower_count', userData.follower_count);
      
      addLog(`✅ Authenticated as: ${userData.display_name || 'TikTok User'}`);
      if (userData.user_id) {
        addLog(`📺 User ID: ${userData.user_id}`);
      }
      if (userData.follower_count) {
        addLog(`👥 Followers: ${userData.follower_count}`);
      }
      addLog('Authentication completed successfully!');
      // Dispatch custom event for TokenManager and other components
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'tiktok' } }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Auth success processing error: ${errorMessage}`);
      setTiktokAuth(prev => ({
        ...prev,
        isLoading: false,
        error: `Authentication processing failed: ${errorMessage}`
      }));
    }
  };

  // TikTok logout (call backend to revoke session like YouTube does)
  // Note: Backend calls TikTok's official /oauth/revoke/ endpoint (v2 API) to invalidate the access token
  // We check local auth state (similar to FB.getLoginStatus() for Instagram)
  // TikTok's revoke endpoint handles invalid tokens gracefully, so no pre-check needed
  // We also use sessionStorage flag as an additional safeguard to prevent auto-reconnection after explicit logout
  const handleTikTokLogout = async () => {
    addLog('Logging out from TikTok...');
    
    // Check if user is authenticated (similar to FB.getLoginStatus() check)
    if (!tiktokAuth.isAuthenticated && !localStorage.getItem('tiktok_user_id')) {
      addLog('⚠️ No active TikTok session found, clearing local state only');
      // Clear any remaining state
      localStorage.removeItem('tiktok_user_id');
      localStorage.removeItem('tiktok_display_name');
      localStorage.removeItem('tiktok_avatar_url');
      localStorage.removeItem('tiktok_follower_count');
      setTiktokAuth({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userInfo: null
      });
      addLog('Logged out from TikTok successfully');
      return;
    }
    
    // User is authenticated, validate token then revoke
    const userId = tiktokAuth.userInfo?.userId || localStorage.getItem('tiktok_user_id');
    
    if (userId) {
      try {
        addLog('🔍 Validating TikTok access token...');
        // Use Next.js API proxy to call backend (like TikTokConnection.tsx does)
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
    
    // Clear localStorage (like Instagram/YouTube do)
    localStorage.removeItem('tiktok_user_id');
    localStorage.removeItem('tiktok_display_name');
    localStorage.removeItem('tiktok_avatar_url');
    localStorage.removeItem('tiktok_follower_count');
    
    // Reset state immediately to prevent any reconnection attempts
    setTiktokAuth({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null
    });
    
    addLog('Logged out from TikTok successfully');
    // Dispatch custom event for TokenManager and other components
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { platform: 'tiktok' } }));
  };

  // Cloudinary helpers (mirrors debuggers)
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dkzbmeto1';
  const uploadToCloudinary = useCallback(async (file: File, preset: string, folder: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    fd.append('folder', folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    return res.json() as Promise<{ public_id: string }>; 
  }, [CLOUD_NAME]);
  const validateUrl = useCallback(async (url: string, label: string, tries = 3) => {
    for (let i = 0; i < tries; i++) {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) return true;
      await new Promise(r => setTimeout(r, 600));
    }
    addLog(`⚠️ ${label} not confirmed yet; proceeding`);
    return false;
  }, [addLog]);

  // Process video for all connected platforms
  const processVideoForAllPlatforms = useCallback(async (file: File) => {
    setIsProcessing(true);
    setVideosReady(false);
    setProcessingProgress(0);
    setYtProcessedUrl(null);
    setTtProcessedUrl(null);
    setIgReelsUrl(null);
    setIgStoriesUrl(null);
    setIgThumbUrl(null);

    const connectedCount = [youtubeAuth.isAuthenticated, tiktokAuth.isAuthenticated, instagramAuth.isAuthenticated].filter(Boolean).length;
    if (connectedCount === 0) {
      addLog('ℹ️ No platforms connected; please connect at least one platform');
      setIsProcessing(false);
      return;
    }

    const processingPromises: Promise<void>[] = [];
    let completed = 0;

    const updateProgress = () => {
      completed++;
      setProcessingProgress(Math.round((completed / connectedCount) * 100));
    };

    if (youtubeAuth.isAuthenticated) {
      processingPromises.push(
        (async () => {
          try {
            // Step 1: Upload original file to Cloudinary
            addLog('🔄 Step 1/3: Uploading video to Cloudinary...');
            setProcessingProgress(20);
            const up = await uploadToCloudinary(file, process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_YOUTUBE || 'youtube_uploads', 'youtube_uploads');
            addLog('✅ Uploaded source video to Cloudinary');

            // Step 2: Generate YouTube Shorts transformation URL
            addLog('🔄 Step 2/3: Generating YouTube Shorts-compliant transformation URL...');
            setProcessingProgress(60);
            const shortsTransformUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_1080,h_1920,f_mp4,q_auto:best/${up.public_id}.mp4`;
            const thumbnailUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_1,w_1080,h_1920,c_fill,f_jpg,q_auto:best/${up.public_id}.jpg`;

            // Step 3: Validate URLs are accessible
            addLog('🔄 Step 3/3: Validating transformed video is accessible...');
            setProcessingProgress(80);
            const [shortsOk] = await Promise.all([
              validateUrl(shortsTransformUrl, 'YouTube Shorts video'),
              validateUrl(thumbnailUrl, 'Thumbnail')
            ]);

            if (!shortsOk) {
              addLog('⚠️ YouTube Shorts video validation failed, but allowing upload');
              addLog('Note: Cloudinary transformations may still be processing in background');
            }

            setYtProcessedUrl(shortsTransformUrl);
            updateProgress();
            setProcessingProgress(100);

            if (shortsOk) {
              addLog('🎉 Video processing complete! Ready for YouTube Shorts upload');
            } else {
              addLog('⚠️ Video processing completed with issues - check logs above');
            }
            addLog(`📹 YouTube Shorts URL: ${shortsTransformUrl}`);
            addLog(`🖼️ Thumbnail URL: ${thumbnailUrl}`);
          } catch (e) {
            updateProgress();
            addLog(`❌ Processing error: ${e}`);
          }
        })()
      );
    }

    if (tiktokAuth.isAuthenticated) {
      processingPromises.push(
        (async () => {
          try {
            addLog('🎬 Processing video for TikTok Shorts...');
            setProcessingProgress(10);
            
            // Upload to Cloudinary with TikTok-specific transformations
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_TIKTOK || 'tiktok_uploads');
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
            
            setTtProcessedUrl(tiktokTransformUrl);
            updateProgress();
            setProcessingProgress(100);
            
            addLog('🎉 Video processing complete! Ready for TikTok upload');
            addLog(`📹 TikTok URL: ${tiktokTransformUrl}`);
          } catch (e) {
            updateProgress();
            addLog(`❌ Processing error: ${e}`);
          }
        })()
      );
    }

    if (instagramAuth.isAuthenticated) {
      processingPromises.push(
        (async () => {
          try {
            // Step 1: Upload original file to Cloudinary
            addLog('🔄 Step 1/3: Uploading video to Cloudinary...');
            setProcessingProgress(20);
            const up = await uploadToCloudinary(file, process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_INSTAGRAM || 'instagram_uploads', 'instagram_uploads');
            addLog('✅ Uploaded source video to Cloudinary');
            
            // Step 2: Generate transformation URLs
            addLog('🔄 Step 2/3: Generating Instagram-compliant transformation URLs...');
            setProcessingProgress(60);
            const reelsUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${up.public_id}.mp4`;
            const storiesUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${up.public_id}.mp4`;
            const thumbUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_1,w_720,h_1280,c_fill,f_jpg,q_auto:best/${up.public_id}.jpg`;
            
            // Step 3: Validate URLs are accessible
            addLog('🔄 Step 3/3: Validating transformed videos are accessible...');
            setProcessingProgress(80);
            addLog('Trying simple center crop transformations (no content awareness)...');
            addLog('Using basic c_fill for fast, reliable cropping');
            const [reelsOk, storiesOk, thumbOk] = await Promise.all([
              validateUrl(reelsUrl, 'Reels video (simple crop)'),
              validateUrl(storiesUrl, 'Stories video (simple crop)'),
              validateUrl(thumbUrl, 'Thumbnail')
            ]);
            
            setIgReelsUrl(reelsUrl);
            setIgStoriesUrl(storiesUrl);
            setIgThumbUrl(thumbUrl);
            updateProgress();
            setProcessingProgress(100);
            
            const allValid = reelsOk && storiesOk && thumbOk;
            if (allValid) {
              addLog('🎉 Video processing complete! Videos are ready for posting');
            } else {
              addLog('⚠️ Video processing completed with some issues - check logs above');
            }
            addLog(`📹 Reels URL: ${reelsUrl}`);
            addLog(`📱 Stories URL: ${storiesUrl}`);
            addLog(`🖼️ Thumbnail URL: ${thumbUrl}`);
          } catch (e) {
            updateProgress();
            addLog(`❌ Processing error: ${e}`);
          }
        })()
      );
    }

    await Promise.all(processingPromises);
    setIsProcessing(false);
    setVideosReady(true);
    setProcessingProgress(100);
    addLog(`✅ Video processed for ${connectedCount} platform(s)`);
  }, [youtubeAuth.isAuthenticated, tiktokAuth.isAuthenticated, instagramAuth.isAuthenticated, addLog, CLOUD_NAME, uploadToCloudinary, validateUrl]);

  // Validate YouTube Shorts file (matching debugger)
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

  // Validate TikTok file (matching TikTokShortsDebugger)
  const validateTikTokFile = async (file: File): Promise<boolean> => {
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

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setVideosReady(false);
    setYtProcessedUrl(null);
    setTtProcessedUrl(null);
    setIgReelsUrl(null);
    setIgStoriesUrl(null);
    setIgThumbUrl(null);
    addLog(`Selected file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
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
    
    // Validate for YouTube if authenticated (matching debugger)
    if (youtubeAuth.isAuthenticated) {
      await validateYouTubeShortsFile(file);
    }
    
    // Validate for TikTok if authenticated (matching debugger)
    if (tiktokAuth.isAuthenticated) {
      await validateTikTokFile(file);
    }
  };

  // Manual process handler
  const handleProcess = async () => {
    if (!selectedFile) {
      addLog('❌ No file selected');
      return;
    }
    await processVideoForAllPlatforms(selectedFile);
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

    if (isProcessing) {
      addLog('⏳ Video is still processing; please wait...');
      return;
    }

    setIsUploading(true);
    addLog(`🚀 Starting upload to ${connected} platform(s)...`);

    const uploads: Promise<{ platform: string; success: boolean; message: string }>[] = [];

    // Instagram uploads (Reels and optionally Stories) - use direct Facebook Graph API
    if (instagramAuth.isAuthenticated && instagramAuth.longLivedToken && instagramAuth.instagramPageId) {
      const showAvailableTransformedVideos = () => {
        addLog('📋 Available transformed videos:');
        if (igReelsUrl) {
          addLog(`  📹 Reels video: ${igReelsUrl}`);
          addLog('    → Optimized for Instagram Reels (progressive encoding)');
        }
        if (igStoriesUrl) {
          addLog(`  📱 Stories video: ${igStoriesUrl}`);
          addLog('    → Optimized for Instagram Stories (fast upload encoding)');
        }
        if (igThumbUrl) {
          addLog(`  🖼️  Thumbnail: ${igThumbUrl}`);
          addLog('    → Extracted frame for image_url parameter');
        }
      };
      
      const checkContainerStatus = async (containerId: string, platform: string) => {
        const statusUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${containerId}`;
        const statusParams = new URLSearchParams({
          fields: 'status_code',
          access_token: instagramAuth.longLivedToken!
        });
        const statusResponse = await fetch(`${statusUrl}?${statusParams.toString()}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          addLog(`Container status: ${statusData.status_code}`);
          if (statusData.status_code === 'FINISHED') {
            addLog(`✅ Container processing finished! Publishing ${platform}...`);
            await publishReel(containerId, platform);
          } else if (statusData.status_code === 'IN_PROGRESS') {
            addLog('⏳ Container still processing, checking again in 5 seconds...');
            setTimeout(() => checkContainerStatus(containerId, platform), 5000);
          } else {
            addLog(`❌ Container failed with status: ${statusData.status_code}`);
          }
        } else {
          const errorData = await statusResponse.json();
          addLog(`❌ Status check failed: ${JSON.stringify(errorData)}`);
        }
      };
      
      const publishReel = async (containerId: string, platform: string) => {
        const publishUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramAuth.instagramPageId}/media_publish`;
        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: containerId, access_token: instagramAuth.longLivedToken })
        });
        if (publishResponse.ok) {
          const publishResult = await publishResponse.json();
          addLog(`🎉 SUCCESS! ${platform} published with ID: ${publishResult.id}`);
          addLog(`✅ Your Instagram ${platform} has been posted successfully!`);
        } else {
          const errorData = await publishResponse.json();
          addLog(`❌ Publishing failed: ${JSON.stringify(errorData)}`);
        }
      };
      
      // Upload Reel if enabled
      if (instagramReel) {
        uploads.push((async () => {
        try {
          if (!igReelsUrl) throw new Error('No processed video available. Please process a video first.');
          addLog('Testing Instagram Reels posting capability...');
          showAvailableTransformedVideos();
          
          // Step 1: Use already processed video from Cloudinary
          addLog('Step 1: Using pre-processed video from Cloudinary...');
          addLog(`📹 Using Reels-optimized video URL: ${igReelsUrl}`);
          addLog('🎯 This video is specifically transformed for Instagram Reels posting');
          const finalProcessedVideoUrl = igReelsUrl;
          
          // Step 2: Create media container
          addLog('Step 2: Creating media container...');
          const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramAuth.instagramPageId}/media`;
          const approaches = [
            {
              name: 'Reels with video_url',
              data: {
                video_url: finalProcessedVideoUrl,
                caption: caption || '🎬 Test Reel from Unified Video Uploader - Posted via API! #test #reels #api',
                media_type: 'REELS',
                access_token: instagramAuth.longLivedToken!
              }
            }
          ];
          
          let containerCreated = false;
          let containerId: string | null = null;
          
          for (const approach of approaches) {
            addLog(`Trying approach: ${approach.name}`);
            const containerResponse = await fetch(containerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(approach.data)
            });
            
            if (containerResponse.ok) {
              const containerResult = await containerResponse.json();
              containerId = containerResult.id;
              addLog(`✅ Media container created with ${approach.name}: ${containerId}`);
              containerCreated = true;
              break;
            } else {
              const errorData = await containerResponse.json();
              addLog(`❌ ${approach.name} failed: ${JSON.stringify(errorData)}`);
            }
          }
          
          if (containerCreated && containerId) {
            // Step 3: Check container status
            addLog('Step 3: Checking container status...');
            await checkContainerStatus(containerId, 'Reel');
            return { platform: 'Instagram Reel', success: true, message: 'Reel posted successfully' };
          } else {
            addLog('❌ All container creation approaches failed');
            return { platform: 'Instagram Reel', success: false, message: 'Failed to create container' };
          }
        } catch (e) {
          return { platform: 'Instagram Reel', success: false, message: String(e) };
        }
      })());
      }

      // Upload Story if enabled
      if (instagramStory) {
        uploads.push((async () => {
          try {
            if (!igStoriesUrl) throw new Error('No processed Stories video available. Please process a video first.');
            addLog('Posting Instagram Stories with processed video...');
            showAvailableTransformedVideos();
            
            // Step 1: Use already processed video from Cloudinary
            addLog('Step 1: Using pre-processed video from Cloudinary...');
            addLog(`📱 Using Stories-optimized video URL: ${igStoriesUrl}`);
            addLog('🎯 This video is specifically transformed for Instagram Stories posting');
            const finalProcessedVideoUrl = igStoriesUrl;
            const processedThumbnailUrl: string | null = igThumbUrl;
            
            // Stories have more flexible requirements
            const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramAuth.instagramPageId}/media`;
            const isVideoFile = selectedFile && selectedFile.type.startsWith('video/');
            const storiesApproaches = isVideoFile ? [
              {
                name: 'Stories video',
                data: {
                  video_url: finalProcessedVideoUrl,
                  caption: caption || '📱 Test Story from Unified Video Uploader - Posted via API! #test #stories #api',
                  media_type: 'STORIES',
                  access_token: instagramAuth.longLivedToken!
                }
              }
            ] : [
              {
                name: 'Stories image',
                data: {
                  image_url: processedThumbnailUrl || finalProcessedVideoUrl,
                  caption: caption || '📱 Test Story from Unified Video Uploader - Posted via API! #test #stories #api',
                  media_type: 'STORIES',
                  access_token: instagramAuth.longLivedToken!
                }
              }
            ];
            
            let storiesContainerCreated = false;
            let storiesContainerId: string | null = null;
            
            for (const approach of storiesApproaches) {
              addLog(`Trying Stories approach: ${approach.name}`);
              const containerResponse = await fetch(containerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(approach.data)
              });
              
              if (containerResponse.ok) {
                const containerResult = await containerResponse.json();
                storiesContainerId = containerResult.id;
                addLog(`✅ Stories container created with ${approach.name}: ${storiesContainerId}`);
                storiesContainerCreated = true;
                break;
              } else {
                const errorData = await containerResponse.json();
                addLog(`❌ ${approach.name} failed: ${JSON.stringify(errorData)}`);
              }
            }
            
            if (storiesContainerCreated && storiesContainerId) {
              // Check container status
              addLog('Checking Stories container status...');
              await checkContainerStatus(storiesContainerId, 'Story');
              return { platform: 'Instagram Story', success: true, message: 'Story posted successfully' };
            } else {
              addLog('❌ All Stories container creation approaches failed');
              return { platform: 'Instagram Story', success: false, message: 'Failed to create Stories container' };
            }
          } catch (e) {
            return { platform: 'Instagram Story', success: false, message: String(e) };
          }
        })());
      }
    } else if (instagramAuth.isAuthenticated) {
      if (!instagramReel && !instagramStory) {
        addLog('ℹ️ Instagram Reels and Stories are both unchecked - skipping Instagram upload');
      } else {
        addLog('❌ Instagram missing required auth data (token or page ID)');
      }
    }

    // YouTube upload (send processed video blob to backend - matching debugger exactly)
    if (youtubeAuth.isAuthenticated) {
      uploads.push((async () => {
        try {
          if (!ytProcessedUrl) throw new Error('No processed video available. Please process a video first.');
          addLog('Testing YouTube Shorts upload...');
          addLog(`📹 Using processed video: ${ytProcessedUrl}`);
          addLog(`📝 Title: ${caption || 'No title'}`);
          addLog(`📄 Description: ${caption || 'No description'}`);
          addLog('🏷️ Tags: No tags');

          // Download video from Cloudinary first
          addLog('📥 Downloading video from Cloudinary...');
          const videoResponse = await fetch(ytProcessedUrl);
          if (!videoResponse.ok) {
            throw new Error('Failed to download video from Cloudinary');
          }
          const videoBlob = await videoResponse.blob();
          addLog('✅ Video downloaded successfully');

          // Create form data for backend upload
          const formData = new FormData();
          formData.append('file', videoBlob, 'video.mp4');
          formData.append('title', caption || '');
          formData.append('description', caption || '');
          formData.append('user_id', youtubeAuth.userInfo?.id || '');

          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
          addLog('📤 Uploading to YouTube via backend...');
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
            return { platform: 'YouTube', success: true, message: `Uploaded with ID: ${data.data.video_id}` };
          } else {
            const errorMsg = data.detail || data.message || 'Unknown error';
            addLog(`❌ Upload failed: ${errorMsg}`);
            return { platform: 'YouTube', success: false, message: errorMsg };
          }
        } catch (e) {
          addLog(`❌ Upload error: ${e}`);
          return { platform: 'YouTube', success: false, message: String(e) };
        }
      })());
    }

    // TikTok upload (prefer video_url so backend pulls it)
    // TikTok upload (matching TikTokShortsDebugger exactly)
    if (tiktokAuth.isAuthenticated) {
      uploads.push((async () => {
        try {
          if (!ttProcessedUrl) throw new Error('No processed video available. Please process a video first.');
          addLog('Testing TikTok Shorts upload...');
          addLog(`📹 Using processed video: ${ttProcessedUrl}`);
          addLog(`📝 Title: ${caption || 'No title'}`);
          addLog(`📄 Description: ${caption || 'No description'}`);
          addLog(`🏷️ Tags: No tags`);
          
          // Send video_url directly to backend (backend will download from Cloudinary)
          // This avoids "Body is disturbed or locked" error and 413 (Payload Too Large) errors
          addLog('📤 Preparing upload to TikTok via backend...');
          addLog(`📹 Using processed video URL: ${ttProcessedUrl}`);
          addLog('💡 Backend will download video directly from Cloudinary');
          
          // Create form data for backend upload (backend accepts 'video_url' or 'video' file)
          const formData = new FormData();
          formData.append('video_url', ttProcessedUrl);
          formData.append('description', caption || '');
          formData.append('user_id', tiktokAuth.userInfo?.userId || '');
          
          addLog('📤 Uploading to TikTok via backend...');
          const response = await fetch('/api/tiktok/upload-video', {
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
            return { platform: 'TikTok', success: true, message: 'Uploaded to inbox' };
          } else {
            // Extract error message from detail or message
            const errorMsg = data.detail || data.message || data.error || 'Unknown error';
            
            // Check for specific TikTok errors and provide helpful guidance
            if (errorMsg.includes('spam_risk_too_many_pending_share')) {
              addLog('❌ TikTok inbox limit reached: Too many pending posts');
              addLog('💡 Solution: Go to TikTok app → Inbox → Publish or delete pending posts, then try again');
              return { platform: 'TikTok', success: false, message: 'Too many pending posts in inbox' };
            }
            
            addLog(`❌ Upload failed: ${errorMsg}`);
            return { platform: 'TikTok', success: false, message: errorMsg };
          }
        } catch (e) {
          addLog(`❌ Upload error: ${e}`);
          return { platform: 'TikTok', success: false, message: String(e) };
        }
      })());
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
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
              {instagramAuth.userInfo.avatarUrl && (
                <img src={instagramAuth.userInfo.avatarUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div>@{instagramAuth.userInfo.username}</div>
                {instagramAuth.userInfo.followerCount && (
                  <div className="text-xs text-gray-500">{parseInt(instagramAuth.userInfo.followerCount).toLocaleString()} followers</div>
                )}
              </div>
            </div>
          )}
          
          {instagramAuth.error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              {instagramAuth.error}
            </div>
          )}
          
          {instagramAuth.isAuthenticated ? (
            <button
              onClick={handleInstagramLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Logout Instagram
            </button>
          ) : (
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
          )}
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
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
              {youtubeAuth.userInfo.thumbnailUrl && (
                <img src={youtubeAuth.userInfo.thumbnailUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div>{youtubeAuth.userInfo.channelTitle}</div>
                {youtubeAuth.userInfo.subscriberCount && (
                  <div className="text-xs text-gray-500">{parseInt(youtubeAuth.userInfo.subscriberCount).toLocaleString()} subscribers</div>
                )}
              </div>
            </div>
          )}
          
          {youtubeAuth.isAuthenticated ? (
            <button
              onClick={handleYouTubeLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Logout YouTube
            </button>
          ) : (
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
          )}
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
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
              {tiktokAuth.userInfo.avatarUrl && (
                <img src={tiktokAuth.userInfo.avatarUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div>@{tiktokAuth.userInfo.username || tiktokAuth.userInfo.displayName}</div>
                {tiktokAuth.userInfo.followerCount && (
                  <div className="text-xs text-gray-500">{parseInt(tiktokAuth.userInfo.followerCount).toLocaleString()} followers</div>
                )}
              </div>
            </div>
          )}
          
          {tiktokAuth.isAuthenticated ? (
            <button
              onClick={handleTikTokLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Logout TikTok
            </button>
          ) : (
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
          )}
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

      {/* Process Button */}
      {selectedFile && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleProcess}
              disabled={!selectedFile || isProcessing || (!instagramAuth.isAuthenticated && !youtubeAuth.isAuthenticated && !tiktokAuth.isAuthenticated)}
              className={`px-4 py-2 rounded ${!selectedFile || (!instagramAuth.isAuthenticated && !youtubeAuth.isAuthenticated && !tiktokAuth.isAuthenticated) ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50'}`}
            >
              {!instagramAuth.isAuthenticated && !youtubeAuth.isAuthenticated && !tiktokAuth.isAuthenticated
                ? 'Connect platforms to process video'
                : isProcessing
                  ? `Processing... ${processingProgress}%`
                  : 'Process with Cloudinary'}
            </button>
            {isProcessing && (
              <div className="flex-1 bg-gray-200 rounded h-2">
                <div className="bg-blue-600 h-2 rounded transition-all duration-300" style={{ width: `${processingProgress}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Status Boxes */}
      {videosReady && (ytProcessedUrl || ttProcessedUrl || igReelsUrl || igStoriesUrl) && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span className="text-green-800 font-medium">Video Status: Ready for Upload</span>
          </div>
          {ytProcessedUrl && youtubeAuth.isAuthenticated && (
            <div className="text-sm text-green-700 mt-1 flex items-center">
              <span className="mr-2">📹</span>
              <span>YouTube Shorts video: </span>
              <a className="text-blue-600 underline ml-1" href={ytProcessedUrl} target="_blank" rel="noreferrer">open</a>
              <span className="ml-2 text-green-600">✓</span>
            </div>
          )}
          {ttProcessedUrl && tiktokAuth.isAuthenticated && (
            <div className="text-sm text-green-700 mt-1 flex items-center">
              <span className="mr-2">🎬</span>
              <span>TikTok video: </span>
              <a className="text-blue-600 underline ml-1" href={ttProcessedUrl} target="_blank" rel="noreferrer">open</a>
              <span className="ml-2 text-green-600">✓</span>
            </div>
          )}
          {igReelsUrl && instagramAuth.isAuthenticated && (
            <div className="text-sm text-green-700 mt-1 flex items-center">
              <span className="mr-2">📹</span>
              <span>Instagram Reels video: </span>
              <a className="text-blue-600 underline ml-1" href={igReelsUrl} target="_blank" rel="noreferrer">open</a>
              <span className="ml-2 text-green-600">✓</span>
            </div>
          )}
          {igStoriesUrl && instagramAuth.isAuthenticated && (
            <div className="text-sm text-green-700 mt-1 flex items-center">
              <span className="mr-2">📱</span>
              <span>Instagram Stories video: </span>
              <a className="text-blue-600 underline ml-1" href={igStoriesUrl} target="_blank" rel="noreferrer">open</a>
              <span className="ml-2 text-green-600">✓</span>
            </div>
          )}
        </div>
      )}

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

      {/* Instagram Upload Options */}
      {instagramAuth.isAuthenticated && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Instagram Upload Options</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={instagramReel}
                onChange={(e) => setInstagramReel(e.target.checked)}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                📹 Post to Instagram Reels
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={instagramStory}
                onChange={(e) => setInstagramStory(e.target.checked)}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                📱 Post to Instagram Stories
              </span>
            </label>
            {!instagramReel && !instagramStory && (
              <p className="text-xs text-gray-500 mt-1">Select at least one option to upload to Instagram</p>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || !videosReady || (!instagramAuth.isAuthenticated && !youtubeAuth.isAuthenticated && !tiktokAuth.isAuthenticated)}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : !videosReady ? (
            <>
              <UploadCloud className="w-5 h-5" />
              Process video first
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
        <div className="bg-black p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto space-y-1">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            debugLogs.map((log, index) => {
              const { platform, category, platformColor, levelColor, categoryColor } = getLogMeta(log);
              const platformLabel = platform === 'youtube' ? 'YOUTUBE' : platform === 'tiktok' ? 'TIKTOK' : platform === 'instagram' ? 'INSTAGRAM' : 'SYSTEM';
              const categoryLabel = category.toUpperCase();
              return (
                <div key={index} className={`mb-0.5 ${levelColor}`}>
                  <span className={`inline-block px-1.5 py-0.5 mr-2 rounded text-white text-[10px] ${platformColor}`}>{platformLabel}</span>
                  <span className={`inline-block px-1 py-0.5 mr-2 rounded text-white text-[10px] ${categoryColor}`}>{categoryLabel}</span>
                  <span className="text-gray-200">{log}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
