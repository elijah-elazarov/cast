'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Instagram, Youtube, Music, UploadCloud, FileVideo2, Loader2, X } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */

type FacebookLoginStatus = {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: { accessToken: string; userID?: string };
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

// API response type
type ApiResponse = {
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  raw?: string;
  data?: unknown;
};

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
  const [instagramStory, setInstagramStory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  
  // Processed video URLs for each platform
  const [ytProcessedUrl, setYtProcessedUrl] = useState<string | null>(null);
  const [ttProcessedUrl, setTtProcessedUrl] = useState<string | null>(null);
  const [igReelsUrl, setIgReelsUrl] = useState<string | null>(null);
  const [igThumbUrl, setIgThumbUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [videosReady, setVideosReady] = useState(false);

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

    // Check existing YouTube connection (YouTube can still auto-login)
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
  const resolveInstagramAccount = async (accessToken: string, fbUserId: string): Promise<{ id: string; username: string; pageId: string }> => {
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
        const igUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${igId}?fields=id,username,name&access_token=${accessToken}`;
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
          return { id: ig.id, username: ig.username, pageId: igId };
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
    addLog('Starting Instagram authentication (Facebook SDK)...');
    try {
      const w = window as FBWindow;
      if (!w.FB || !fbSdkLoaded) throw new Error('Facebook SDK not loaded yet');
      // Check existing login
      const auth = await new Promise<FacebookLoginStatus>((resolve) => w.FB!.getLoginStatus((r) => resolve(r as unknown as FacebookLoginStatus)));
      let accessToken: string | null = null;
      let fbUserId: string | null = null;
      if (auth?.status === 'connected') {
        accessToken = auth.authResponse?.accessToken || null;
        fbUserId = auth.authResponse?.userID || null;
        addLog('Using existing Facebook session');
      } else {
        addLog('Invoking FB.login...');
        const loginRes = await new Promise<FacebookLoginStatus>((resolve) => w.FB!.login((r) => resolve(r as unknown as FacebookLoginStatus), { scope: INSTAGRAM_CONFIG.scope, return_scopes: true }));
        accessToken = loginRes.authResponse?.accessToken || null;
        fbUserId = loginRes.authResponse?.userID || null;
      }
      if (!accessToken) throw new Error('Login failed or cancelled');
      const longLived = await exchangeLongLivedToken(accessToken);
      const ig = await resolveInstagramAccount(longLived, fbUserId || 'unknown');
      // Persist and update UI
      localStorage.setItem('instagram_user_id', ig.id);
      localStorage.setItem('instagram_username', ig.username);
      localStorage.setItem('instagram_long_lived_token', longLived);
      localStorage.setItem('instagram_page_id', ig.pageId);
      localStorage.setItem('facebook_user_id', fbUserId || '');
      setInstagramAuth({ 
        isAuthenticated: true, 
        isLoading: false, 
        error: null, 
        userInfo: { id: ig.id, username: ig.username },
        longLivedToken: longLived,
        instagramPageId: ig.pageId,
        facebookUserId: fbUserId || null
      });
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

  // Cloudinary helpers (mirrors debuggers)
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dkzbmeto1';
  const uploadToCloudinary = async (file: File, preset: string, folder: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    fd.append('folder', folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    return res.json() as Promise<{ public_id: string }>; 
  };
  const validateUrl = async (url: string, label: string, tries = 3) => {
    for (let i = 0; i < tries; i++) {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) return true;
      await new Promise(r => setTimeout(r, 600));
    }
    addLog(`⚠️ ${label} not confirmed yet; proceeding`);
    return false;
  };

  // Process video for all connected platforms
  const processVideoForAllPlatforms = useCallback(async (file: File) => {
    setIsProcessing(true);
    setVideosReady(false);
    setProcessingProgress(0);
    setYtProcessedUrl(null);
    setTtProcessedUrl(null);
    setIgReelsUrl(null);
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
            addLog('🔄 [YouTube] Uploading to Cloudinary...');
            setProcessingProgress(10);
            const up = await uploadToCloudinary(file, process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_YOUTUBE || 'youtube_uploads', 'youtube_uploads');
            const url = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_1080,h_1920,f_mp4,q_auto:best/${up.public_id}.mp4`;
            addLog('🔄 [YouTube] Generating Shorts-optimized video...');
            setProcessingProgress(50);
            await validateUrl(url, 'YouTube Shorts video');
            setYtProcessedUrl(url);
            updateProgress();
            addLog('✅ [YouTube] Processing complete');
            addLog(`📹 [YouTube] URL: ${url}`);
          } catch (e) {
            updateProgress();
            addLog(`❌ [YouTube] Processing error: ${e}`);
          }
        })()
      );
    }

    if (tiktokAuth.isAuthenticated) {
      processingPromises.push(
        (async () => {
          try {
            addLog('🎬 [TikTok] Processing video...');
            setProcessingProgress(10);
            const up = await uploadToCloudinary(file, process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_TIKTOK || 'tiktok_uploads', 'tiktok_uploads');
            const url = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_1080,h_1920,f_mp4,q_auto:best/${up.public_id}.mp4`;
            addLog('🔄 [TikTok] Generating optimized video...');
            setProcessingProgress(50);
            await validateUrl(url, 'TikTok video');
            setTtProcessedUrl(url);
            updateProgress();
            addLog('🎉 [TikTok] Processing complete');
            addLog(`📹 [TikTok] URL: ${url}`);
          } catch (e) {
            updateProgress();
            addLog(`❌ [TikTok] Processing error: ${e}`);
          }
        })()
      );
    }

    if (instagramAuth.isAuthenticated) {
      processingPromises.push(
        (async () => {
          try {
            addLog('🔄 [Instagram] Uploading to Cloudinary...');
            setProcessingProgress(10);
            const up = await uploadToCloudinary(file, process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_INSTAGRAM || 'instagram_uploads', 'instagram_uploads');
            const reelsUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${up.public_id}.mp4`;
            const thumbUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_1,w_720,h_1280,c_fill,f_jpg,q_auto:best/${up.public_id}.jpg`;
            addLog('🔄 [Instagram] Validating transformed assets...');
            setProcessingProgress(50);
            await Promise.all([
              validateUrl(reelsUrl, 'Instagram Reels video'),
              validateUrl(thumbUrl, 'Instagram thumbnail')
            ]);
            setIgReelsUrl(reelsUrl);
            setIgThumbUrl(thumbUrl);
            updateProgress();
            addLog('✅ [Instagram] Processing complete');
            addLog(`📹 [Instagram] Reels URL: ${reelsUrl}`);
          } catch (e) {
            updateProgress();
            addLog(`❌ [Instagram] Processing error: ${e}`);
          }
        })()
      );
    }

    await Promise.all(processingPromises);
    setIsProcessing(false);
    setVideosReady(true);
    setProcessingProgress(100);
    addLog(`✅ Video processed for ${connectedCount} platform(s)`);
  }, [youtubeAuth.isAuthenticated, tiktokAuth.isAuthenticated, instagramAuth.isAuthenticated, addLog]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setVideosReady(false);
    setYtProcessedUrl(null);
    setTtProcessedUrl(null);
    setIgReelsUrl(null);
    setIgThumbUrl(null);
    addLog(`Selected file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
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
      const checkContainerStatus = async (containerId: string, platform: string) => {
        const statusUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${containerId}`;
        const statusParams = new URLSearchParams({
          fields: 'status_code',
          access_token: instagramAuth.longLivedToken!
        });
        const statusResponse = await fetch(`${statusUrl}?${statusParams.toString()}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.status_code === 'FINISHED') {
            addLog('✅ Container processing finished! Publishing...');
            await publishReel(containerId, platform);
          } else if (statusData.status_code === 'IN_PROGRESS') {
            addLog('⏳ Container still processing, checking again in 5 seconds...');
            setTimeout(() => checkContainerStatus(containerId, platform), 5000);
          } else {
            addLog(`❌ Container failed with status: ${statusData.status_code}`);
          }
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
        } else {
          const errorData = await publishResponse.json();
          addLog(`❌ Publishing failed: ${JSON.stringify(errorData)}`);
        }
      };
      
      // Upload Reel
      uploads.push((async () => {
        try {
          if (!igReelsUrl) throw new Error('No processed video available');
          addLog('📤 [Instagram Reel] Creating container...');
          const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramAuth.instagramPageId}/media`;
          const containerResponse = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_url: igReelsUrl,
              caption: caption || '',
              media_type: 'REELS',
              access_token: instagramAuth.longLivedToken!
            })
          });
          if (!containerResponse.ok) throw new Error('Failed to create container');
          const containerData = await containerResponse.json();
          addLog(`✅ Reel container created: ${containerData.id}`);
          await checkContainerStatus(containerData.id, 'Reel');
          return { platform: 'Instagram Reel', success: true, message: 'Reel posted successfully' };
        } catch (e) {
          return { platform: 'Instagram Reel', success: false, message: String(e) };
        }
      })());

      // Upload Story if enabled
      if (instagramStory) {
        uploads.push((async () => {
          try {
            if (!igReelsUrl) throw new Error('No processed video available');
            addLog('📤 [Instagram Story] Creating container...');
            const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramAuth.instagramPageId}/media`;
            const containerResponse = await fetch(containerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                video_url: igReelsUrl,
                caption: caption || '',
                media_type: 'STORIES',
                access_token: instagramAuth.longLivedToken!
              })
            });
            if (!containerResponse.ok) throw new Error('Failed to create container');
            const containerData = await containerResponse.json();
            addLog(`✅ Story container created: ${containerData.id}`);
            await checkContainerStatus(containerData.id, 'Story');
            return { platform: 'Instagram Story', success: true, message: 'Story posted successfully' };
          } catch (e) {
            return { platform: 'Instagram Story', success: false, message: String(e) };
          }
        })());
      }
    } else if (instagramAuth.isAuthenticated) {
      addLog('❌ Instagram missing required auth data (token or page ID)');
    }

    // YouTube upload (send processed video blob to backend)
    if (youtubeAuth.isAuthenticated) {
      uploads.push((async () => {
        try {
          if (!ytProcessedUrl) throw new Error('Processed video missing');
          addLog('📥 [YouTube] Downloading processed video...');
          const rvid = await fetch(ytProcessedUrl);
          if (!rvid.ok) throw new Error('Failed to download processed video');
          const blob = await rvid.blob();
          const formData = new FormData();
          formData.append('file', blob, 'shorts.mp4');
          formData.append('title', caption);
          formData.append('description', caption);
          formData.append('user_id', youtubeAuth.userInfo?.id || '');
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
          addLog('📤 [YouTube] Uploading to backend...');
          const r = await fetch(`${backendUrl}/api/youtube/upload-short`, { method: 'POST', body: formData });
          const data: ApiResponse = await r.json().catch(async () => ({ raw: await r.text() }));
          addLog(`🧾 YouTube response: ${JSON.stringify(data)}`);
          return { platform: 'YouTube', success: r.ok && !!data.success, message: data.message || data.detail || 'Uploaded' };
        } catch (e) {
          return { platform: 'YouTube', success: false, message: String(e) };
        }
      })());
    }

    // TikTok upload (prefer video_url so backend pulls it)
    if (tiktokAuth.isAuthenticated) {
      const formData = new FormData();
      if (ttProcessedUrl) {
        formData.append('video_url', ttProcessedUrl);
      } else {
        formData.append('video', selectedFile);
      }
      formData.append('description', caption);
      formData.append('user_id', tiktokAuth.userInfo?.userId || '');
      uploads.push(
        fetch('/api/tiktok/upload-video', { method: 'POST', body: formData, headers: { 'ngrok-skip-browser-warning': 'true' } })
          .then(async r => { const data: ApiResponse = await r.json().catch(async () => ({ raw: await r.text() })); addLog(`🧾 TikTok response: ${JSON.stringify(data)}`); return { platform: 'TikTok', success: r.ok && !!data.success, message: data.message || 'Uploaded' }; })
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
      {videosReady && (ytProcessedUrl || ttProcessedUrl || igReelsUrl) && (
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

      {/* Instagram Story Toggle */}
      {instagramAuth.isAuthenticated && (
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={instagramStory}
              onChange={(e) => setInstagramStory(e.target.checked)}
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              📱 Also post to Instagram Stories
            </span>
          </label>
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
