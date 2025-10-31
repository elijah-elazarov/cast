'use client';

import { useState, useEffect, useRef } from 'react';
import { Key, Instagram, Youtube, Music, CheckCircle, XCircle, Loader2, RefreshCw, LogOut, AlertCircle, Clock, Database, Trash2, Eye, EyeOff } from 'lucide-react';

interface TokenStatus {
  platform: 'instagram' | 'youtube' | 'tiktok';
  isAuthenticated: boolean;
  isValid: boolean | null; // null = not checked yet
  isValidating: boolean;
  expiresAt?: number;
  scopes?: string[];
  userId?: string;
  username?: string;
  error?: string;
}

export default function TokenManager() {
  const [logs, setLogs] = useState<string[]>([]);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus[]>([
    { platform: 'instagram', isAuthenticated: false, isValid: null, isValidating: false },
    { platform: 'youtube', isAuthenticated: false, isValid: null, isValidating: false },
    { platform: 'tiktok', isAuthenticated: false, isValid: null, isValidating: false },
  ]);
  const [showLocalStorage, setShowLocalStorage] = useState(false);
  const [showTokenValues, setShowTokenValues] = useState(false);
  const hasInitialized = useRef(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Derive platform/category/level styling for logs
  const getLogMeta = (line: string) => {
    const lower = line.toLowerCase();
    
    let platform: 'instagram' | 'youtube' | 'tiktok' | 'system' = 'system';
    if (lower.includes('tiktok')) platform = 'tiktok';
    else if (lower.includes('youtube')) platform = 'youtube';
    else if (lower.includes('instagram') || lower.includes('facebook')) platform = 'instagram';

    let category: 'auth' | 'process' | 'upload' | 'validate' | 'logout' | 'config' | 'storage' | 'other' = 'other';
    if (lower.includes('auth') || lower.includes('login') || lower.includes('oauth')) category = 'auth';
    else if (lower.includes('process') || lower.includes('generating')) category = 'process';
    else if (lower.includes('upload') || lower.includes('publish')) category = 'upload';
    else if (lower.includes('validate') || lower.includes('validating') || lower.includes('checking') || lower.includes('status') || lower.includes('token')) category = 'validate';
    else if (lower.includes('logout') || lower.includes('logging out')) category = 'logout';
    else if (lower.includes('localstorage') || lower.includes('setitem') || lower.includes('removeitem')) category = 'storage';
    else if (lower.includes('initialized') || lower.includes('configuration') || lower.includes('complete')) category = 'config';

    let level: 'ok' | 'warn' | 'error' | 'info' = 'info';
    if (lower.includes('❌') || lower.includes('error') || lower.includes('failed')) level = 'error';
    else if (lower.includes('⚠️') || lower.includes('warning')) level = 'warn';
    else if (lower.includes('✅') || lower.includes('success') || lower.includes('valid')) level = 'ok';

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
      category === 'storage' ? 'bg-teal-600' :
      'bg-gray-600';

    return { platform, category, level, platformColor, levelColor, categoryColor };
  };

  const checkAllStatuses = (silent = false) => {
    if (!silent) {
      addLog('🔍 Checking token status for all platforms...');
      addLog('📦 Reading localStorage items...');
    }
    
    // Instagram
    if (!silent) addLog('  📱 Checking Instagram localStorage...');
    const instagramToken = localStorage.getItem('instagram_long_lived_token');
    const instagramUserId = localStorage.getItem('instagram_user_id');
    const instagramUsername = localStorage.getItem('instagram_username');
    const instagramPageId = localStorage.getItem('instagram_page_id');
    const facebookUserId = localStorage.getItem('facebook_user_id');
    if (!silent) {
      addLog(`    ✅ Found: ${[!!instagramToken && 'token', !!instagramUserId && 'user_id', !!instagramUsername && 'username', !!instagramPageId && 'page_id', !!facebookUserId && 'facebook_user_id'].filter(Boolean).join(', ') || 'none'}`);
    }
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'instagram' 
        ? { 
            ...status, 
            isAuthenticated: !!instagramToken, 
            userId: instagramUserId || undefined, 
            username: instagramUsername || undefined,
            // Store additional info in a custom field we can show
            error: !instagramToken ? 'No token found in localStorage' : instagramPageId ? `Page ID: ${instagramPageId}` : undefined
          }
        : status
    ));

    // YouTube
    if (!silent) addLog('  📺 Checking YouTube localStorage...');
    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const youtubeChannelTitle = localStorage.getItem('youtube_channel_title');
    const youtubeAccessToken = localStorage.getItem('youtube_access_token');
    const youtubeRefreshToken = localStorage.getItem('youtube_refresh_token');
    if (!silent) {
      addLog(`    ✅ Found: ${[!!youtubeUserId && 'user_id', !!youtubeChannelTitle && 'channel_title', !!youtubeAccessToken && 'access_token', !!youtubeRefreshToken && 'refresh_token'].filter(Boolean).join(', ') || 'none'}`);
    }
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'youtube' 
        ? { 
            ...status, 
            isAuthenticated: !!youtubeUserId, 
            userId: youtubeUserId || undefined,
            username: youtubeChannelTitle || undefined,
            error: !youtubeUserId ? 'No session found in localStorage' : youtubeAccessToken ? 'Token present' : 'No access token'
          }
        : status
    ));

    // TikTok
    if (!silent) addLog('  🎵 Checking TikTok localStorage...');
    const tiktokUserId = localStorage.getItem('tiktok_user_id');
    const tiktokDisplayName = localStorage.getItem('tiktok_display_name');
    const tiktokAvatarUrl = localStorage.getItem('tiktok_avatar_url');
    if (!silent) {
      addLog(`    ✅ Found: ${[!!tiktokUserId && 'user_id', !!tiktokDisplayName && 'display_name', !!tiktokAvatarUrl && 'avatar_url'].filter(Boolean).join(', ') || 'none'}`);
    }
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'tiktok' 
        ? { 
            ...status, 
            isAuthenticated: !!tiktokUserId, 
            userId: tiktokUserId || undefined, 
            username: tiktokDisplayName || undefined,
            error: !tiktokUserId ? 'No session found in localStorage' : tiktokAvatarUrl ? 'Avatar URL available' : undefined
          }
        : status
    ));

    if (!silent) {
      const authenticatedCount = [!!instagramToken, !!youtubeUserId, !!tiktokUserId].filter(Boolean).length;
      addLog(`✅ Status check complete: ${authenticatedCount} platform(s) authenticated`);
    }
  };

  // Initialize: Check which platforms are authenticated (only once, even in React Strict Mode)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkAllStatuses();
    }
  }, []);

  // Monitor localStorage changes (for debugging)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('instagram_') || e.key.startsWith('facebook_') || e.key.startsWith('youtube_') || e.key.startsWith('tiktok_'))) {
        if (e.newValue === null) {
          addLog(`🗑️ localStorage removed: ${e.key} (old value: ${e.oldValue ? `${e.oldValue.substring(0, 30)}...` : 'null'})`);
        } else if (e.oldValue === null) {
          const isToken = e.key.includes('token') || e.key.includes('access') || e.key.includes('refresh');
          addLog(`➕ localStorage set: ${e.key} = ${isToken ? '***token***' : e.newValue.substring(0, 50)}${e.newValue.length > 50 ? '...' : ''}`);
        } else {
          const isToken = e.key.includes('token') || e.key.includes('access') || e.key.includes('refresh');
          addLog(`🔄 localStorage updated: ${e.key} = ${isToken ? '***token***' : e.newValue.substring(0, 50)}${e.newValue.length > 50 ? '...' : ''}`);
        }
        // Refresh status after localStorage change
        setTimeout(() => checkAllStatuses(true), 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom auth-state-changed events from other components
    const handleAuthStateChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      const platform = customEvent.detail?.platform;
      if (platform && (platform === 'instagram' || platform === 'youtube' || platform === 'tiktok')) {
        addLog(`🔄 Auth state changed for ${platform} - refreshing status...`);
        setTimeout(() => checkAllStatuses(true), 100);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthStateChanged);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
    };
  }, [checkAllStatuses, addLog]);

  // Also intercept localStorage.setItem/removeItem calls (works for same-origin)
  useEffect(() => {
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key && (key.startsWith('instagram_') || key.startsWith('facebook_') || key.startsWith('youtube_') || key.startsWith('tiktok_'))) {
        const isToken = key.includes('token') || key.includes('access') || key.includes('refresh');
        addLog(`➕ localStorage.setItem: ${key} = ${isToken ? '***token***' : value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      }
      return originalSetItem.call(this, key, value);
    };
    
    Storage.prototype.removeItem = function(key: string) {
      if (key && (key.startsWith('instagram_') || key.startsWith('facebook_') || key.startsWith('youtube_') || key.startsWith('tiktok_'))) {
        const oldValue = this.getItem(key);
        addLog(`🗑️ localStorage.removeItem: ${key}${oldValue ? ` (was: ${oldValue.substring(0, 30)}...)` : ''}`);
      }
      return originalRemoveItem.call(this, key);
    };

    return () => {
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
    };
  }, [addLog]);

  const validateInstagramToken = async () => {
    addLog('🔍 Validating Instagram token...');
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'instagram' ? { ...status, isValidating: true } : status
    ));

    const w = window as any;
    if (!w.FB) {
      addLog('❌ Facebook SDK not loaded');
      setTokenStatus(prev => prev.map(status => 
        status.platform === 'instagram' ? { ...status, isValid: false, isValidating: false, error: 'Facebook SDK not loaded' } : status
      ));
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        w.FB.getLoginStatus((response: any) => {
          if (response.status === 'connected') {
            const accessToken = response.authResponse.accessToken;
            const expiresIn = response.authResponse.expiresIn;
            const scopes = response.authResponse.grantedScopes?.split(',') || [];
            const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : undefined;

            addLog('✅ Instagram token is valid');
            addLog(`📅 Expires in: ${expiresIn ? `${Math.floor(expiresIn / 3600)} hours` : 'N/A'}`);
            addLog(`🔑 Scopes: ${scopes.join(', ') || 'N/A'}`);

            setTokenStatus(prev => prev.map(status => 
              status.platform === 'instagram' 
                ? { ...status, isValid: true, isValidating: false, expiresAt, scopes, error: undefined }
                : status
            ));
            resolve();
          } else {
            addLog(`⚠️ Instagram token is invalid: ${response.status}`);
            setTokenStatus(prev => prev.map(status => 
              status.platform === 'instagram' 
                ? { ...status, isValid: false, isValidating: false, error: response.status }
                : status
            ));
            resolve();
          }
        });
      });
    } catch (error) {
      addLog(`❌ Instagram validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTokenStatus(prev => prev.map(status => 
        status.platform === 'instagram' ? { ...status, isValid: false, isValidating: false, error: error instanceof Error ? error.message : 'Unknown error' } : status
      ));
    }
  };

  const validateYouTubeToken = async () => {
    addLog('🔍 Validating YouTube token...');
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'youtube' ? { ...status, isValidating: true } : status
    ));

    const userId = localStorage.getItem('youtube_user_id');
    if (!userId) {
      addLog('❌ No YouTube user ID found');
      setTokenStatus(prev => prev.map(status => 
        status.platform === 'youtube' ? { ...status, isValid: false, isValidating: false, error: 'Not authenticated' } : status
      ));
      return;
    }

    try {
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
          addLog('✅ YouTube token is valid');
          setTokenStatus(prev => prev.map(status => 
            status.platform === 'youtube' ? { ...status, isValid: true, isValidating: false, error: undefined } : status
          ));
        } else if (data.token_valid === false) {
          addLog('⚠️ YouTube token is invalid/expired');
          setTokenStatus(prev => prev.map(status => 
            status.platform === 'youtube' ? { ...status, isValid: false, isValidating: false, error: 'Token invalid/expired' } : status
          ));
        } else {
          addLog('⚠️ Could not determine YouTube token validity');
          setTokenStatus(prev => prev.map(status => 
            status.platform === 'youtube' ? { ...status, isValid: null, isValidating: false } : status
          ));
        }
      } else {
        addLog(`❌ YouTube validation failed: ${data.detail || data.message || 'Unknown error'}`);
        setTokenStatus(prev => prev.map(status => 
          status.platform === 'youtube' ? { ...status, isValid: false, isValidating: false, error: data.detail || data.message || 'Unknown error' } : status
        ));
      }
    } catch (error) {
      addLog(`❌ YouTube validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTokenStatus(prev => prev.map(status => 
        status.platform === 'youtube' ? { ...status, isValid: false, isValidating: false, error: error instanceof Error ? error.message : 'Unknown error' } : status
      ));
    }
  };

  const validateTikTokToken = async () => {
    addLog('🔍 Validating TikTok token...');
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'tiktok' ? { ...status, isValidating: true } : status
    ));

    const userId = localStorage.getItem('tiktok_user_id');
    if (!userId) {
      addLog('❌ No TikTok user ID found');
      setTokenStatus(prev => prev.map(status => 
        status.platform === 'tiktok' ? { ...status, isValid: false, isValidating: false, error: 'Not authenticated' } : status
      ));
      return;
    }

    try {
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
          addLog('✅ TikTok token is valid');
          setTokenStatus(prev => prev.map(status => 
            status.platform === 'tiktok' ? { ...status, isValid: true, isValidating: false, error: undefined } : status
          ));
        } else if (data.token_valid === false) {
          addLog('⚠️ TikTok token is invalid/expired');
          setTokenStatus(prev => prev.map(status => 
            status.platform === 'tiktok' ? { ...status, isValid: false, isValidating: false, error: 'Token invalid/expired' } : status
          ));
        } else {
          addLog('⚠️ Could not determine TikTok token validity');
          setTokenStatus(prev => prev.map(status => 
            status.platform === 'tiktok' ? { ...status, isValid: null, isValidating: false } : status
          ));
        }
      } else {
        addLog(`❌ TikTok validation failed: ${data.detail || data.message || 'Unknown error'}`);
        setTokenStatus(prev => prev.map(status => 
          status.platform === 'tiktok' ? { ...status, isValid: false, isValidating: false, error: data.detail || data.message || 'Unknown error' } : status
        ));
      }
    } catch (error) {
      addLog(`❌ TikTok validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTokenStatus(prev => prev.map(status => 
        status.platform === 'tiktok' ? { ...status, isValid: false, isValidating: false, error: error instanceof Error ? error.message : 'Unknown error' } : status
      ));
    }
  };

  const logoutInstagram = async () => {
    addLog('🚪 Logging out from Instagram...');
    const w = window as any;
    if (w.FB) {
      await new Promise<void>((resolve) => {
        w.FB.getLoginStatus((response: any) => {
          if (response.status === 'connected') {
            w.FB.logout(() => {
              localStorage.removeItem('instagram_user_id');
              localStorage.removeItem('instagram_username');
              localStorage.removeItem('instagram_long_lived_token');
              localStorage.removeItem('instagram_page_id');
              localStorage.removeItem('facebook_user_id');
              localStorage.removeItem('instagram_account_type');
              addLog('✅ Instagram logged out');
              checkAllStatuses();
              resolve();
            });
          } else {
            localStorage.removeItem('instagram_user_id');
            localStorage.removeItem('instagram_username');
            localStorage.removeItem('instagram_long_lived_token');
            localStorage.removeItem('instagram_page_id');
            localStorage.removeItem('facebook_user_id');
            localStorage.removeItem('instagram_account_type');
            addLog('✅ Instagram local state cleared');
            checkAllStatuses();
            resolve();
          }
        });
      });
    } else {
      localStorage.removeItem('instagram_user_id');
      localStorage.removeItem('instagram_username');
      localStorage.removeItem('instagram_long_lived_token');
      localStorage.removeItem('instagram_page_id');
      localStorage.removeItem('facebook_user_id');
      localStorage.removeItem('instagram_account_type');
      addLog('✅ Instagram local state cleared (SDK not loaded)');
      checkAllStatuses();
    }
  };

  const logoutYouTube = async () => {
    addLog('🚪 Logging out from YouTube...');
    const userId = localStorage.getItem('youtube_user_id');
    if (userId) {
      try {
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
          addLog('✅ YouTube logged out');
        } else {
          addLog(`⚠️ Logout warning: ${data.detail || data.message || 'Unknown error'}`);
        }
      } catch (error) {
        addLog(`⚠️ Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    addLog('✅ YouTube local state cleared');
    checkAllStatuses();
  };

  const logoutTikTok = async () => {
    addLog('🚪 Logging out from TikTok...');
    const userId = localStorage.getItem('tiktok_user_id');
    if (userId) {
      try {
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
          addLog('✅ TikTok logged out');
        } else {
          addLog(`⚠️ Logout warning: ${data.detail || data.message || 'Unknown error'}`);
        }
      } catch (error) {
        addLog(`⚠️ Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Clear localStorage
    sessionStorage.setItem('tiktok_explicit_logout', 'true');
    localStorage.removeItem('tiktok_user_id');
    localStorage.removeItem('tiktok_display_name');
    localStorage.removeItem('tiktok_avatar_url');
    localStorage.removeItem('tiktok_follower_count');
    addLog('✅ TikTok local state cleared');
    checkAllStatuses();
  };

  const validateAllTokens = async () => {
    addLog('🔍 Validating all tokens...');
    await Promise.all([
      tokenStatus.find(s => s.platform === 'instagram' && s.isAuthenticated) ? validateInstagramToken() : Promise.resolve(),
      tokenStatus.find(s => s.platform === 'youtube' && s.isAuthenticated) ? validateYouTubeToken() : Promise.resolve(),
      tokenStatus.find(s => s.platform === 'tiktok' && s.isAuthenticated) ? validateTikTokToken() : Promise.resolve(),
    ]);
    addLog('✅ All validations complete');
  };

  const logoutAll = async () => {
    addLog('🚪 Logging out from all platforms...');
    await Promise.all([
      tokenStatus.find(s => s.platform === 'instagram' && s.isAuthenticated) ? logoutInstagram() : Promise.resolve(),
      tokenStatus.find(s => s.platform === 'youtube' && s.isAuthenticated) ? logoutYouTube() : Promise.resolve(),
      tokenStatus.find(s => s.platform === 'tiktok' && s.isAuthenticated) ? logoutTikTok() : Promise.resolve(),
    ]);
    addLog('✅ All platforms logged out');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Get all localStorage items related to auth for a platform
  const getLocalStorageItems = (platform: string): Array<{ key: string; value: string }> => {
    const allKeys: string[] = [];
    const items: Array<{ key: string; value: string }> = [];
    
    // Get all keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    // Filter by platform prefix
    const platformPrefixes: { [key: string]: string[] } = {
      instagram: ['instagram_', 'facebook_'],
      youtube: ['youtube_'],
      tiktok: ['tiktok_']
    };
    
    const prefixes = platformPrefixes[platform] || [];
    allKeys.forEach(key => {
      if (prefixes.some(prefix => key.startsWith(prefix))) {
        const value = localStorage.getItem(key) || '';
        items.push({ key, value });
      }
    });
    
    return items.sort((a, b) => a.key.localeCompare(b.key));
  };

  const clearLocalStorageItem = (key: string) => {
    localStorage.removeItem(key);
    addLog(`🗑️ Cleared localStorage key: ${key}`);
    checkAllStatuses(true); // Silent refresh
  };

  const clearPlatformLocalStorage = (platform: string) => {
    const items = getLocalStorageItems(platform);
    items.forEach(item => localStorage.removeItem(item.key));
    addLog(`🗑️ Cleared all ${platform} localStorage items (${items.length} items)`);
    checkAllStatuses(true); // Silent refresh
  };

  const getStatusIcon = (status: TokenStatus) => {
    if (status.isValidating) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    if (!status.isAuthenticated) {
      return <XCircle className="w-5 h-5 text-gray-400" />;
    }
    if (status.isValid === true) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (status.isValid === false) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-5 h-5" />;
      case 'youtube':
        return <Youtube className="w-5 h-5" />;
      case 'tiktok':
        return <Music className="w-5 h-5" />;
      default:
        return <Key className="w-5 h-5" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'youtube':
        return 'YouTube';
      case 'tiktok':
        return 'TikTok';
      default:
        return platform;
    }
  };

  return (
    <>
        <div className="flex items-center justify-end mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => checkAllStatuses()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </button>
            <button
              onClick={() => {
                const authenticatedCount = tokenStatus.filter(s => s.isAuthenticated).length;
                if (authenticatedCount === 0) {
                  addLog('ℹ️ No platforms are authenticated. Connect platforms first to validate tokens.');
                } else {
                  validateAllTokens();
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Validate All
            </button>
            <button
              onClick={() => {
                const authenticatedCount = tokenStatus.filter(s => s.isAuthenticated).length;
                if (authenticatedCount === 0) {
                  addLog('ℹ️ No platforms are authenticated. Nothing to logout.');
                } else {
                  logoutAll();
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Logout All
            </button>
          </div>
        </div>

        {/* Token Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {tokenStatus.map((status) => (
            <div
              key={status.platform}
              className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(status.platform)}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {getPlatformName(status.platform)}
                  </span>
                </div>
                {getStatusIcon(status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${
                    status.isAuthenticated ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {status.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>

                {status.userId && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">User ID:</span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                      {status.userId}
                    </span>
                  </div>
                )}

                {status.username && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {status.platform === 'youtube' ? 'Channel:' : 'Username:'}
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                      {status.username}
                    </span>
                  </div>
                )}

                {status.isValid !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Token:</span>
                    <span className={`font-medium ${
                      status.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                )}

                {status.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                    <span className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                      <Clock className="w-3 h-3" />
                      {new Date(status.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {status.scopes && status.scopes.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Scopes:</span>
                    <div className="flex flex-wrap gap-1">
                      {status.scopes.slice(0, 3).map((scope, idx) => (
                        <span key={idx} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {scope}
                        </span>
                      ))}
                      {status.scopes.length > 3 && (
                        <span className="text-xs text-gray-500">+{status.scopes.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {status.error && (
                  <div className={`text-xs truncate ${
                    status.error.includes('No') || status.error.includes('not found') 
                      ? 'text-gray-500 dark:text-gray-400' 
                      : status.error.includes('Token') || status.error.includes('Page ID') || status.error.includes('present') || status.error.includes('available')
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {status.error}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {status.isAuthenticated && (
                  <>
                    <button
                      onClick={() => {
                        if (status.platform === 'instagram') validateInstagramToken();
                        if (status.platform === 'youtube') validateYouTubeToken();
                        if (status.platform === 'tiktok') validateTikTokToken();
                      }}
                      disabled={status.isValidating}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {status.isValidating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      Validate
                    </button>
                    <button
                      onClick={() => {
                        if (status.platform === 'instagram') logoutInstagram();
                        if (status.platform === 'youtube') logoutYouTube();
                        if (status.platform === 'tiktok') logoutTikTok();
                      }}
                      className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* localStorage Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">localStorage Info</h3>
            </div>
            <button
              onClick={() => setShowLocalStorage(!showLocalStorage)}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors flex items-center gap-2"
            >
              {showLocalStorage ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showLocalStorage ? 'Hide' : 'Show'} localStorage
            </button>
          </div>

          {showLocalStorage && (
            <div className="space-y-4">
              {(['instagram', 'youtube', 'tiktok'] as const).map((platform) => {
                const items = getLocalStorageItems(platform);
                return (
                  <div key={platform} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(platform)}
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{platform}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({items.length} items)</span>
                      </div>
                      {items.length > 0 && (
                        <button
                          onClick={() => clearPlatformLocalStorage(platform)}
                          className="px-2 py-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      )}
                    </div>
                    {items.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">No localStorage items found</div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => {
                          const isToken = item.key.includes('token') || item.key.includes('access') || item.key.includes('refresh');
                          const displayValue = showTokenValues || !isToken
                            ? item.value.length > 50 
                              ? `${item.value.substring(0, 50)}...` 
                              : item.value
                            : '••••••••';
                          
                          return (
                            <div key={item.key} className="flex items-start justify-between gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 mb-1">
                                  {item.key}
                                </div>
                                <div className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                  {isToken && !showTokenValues ? (
                                    <button
                                      onClick={() => setShowTokenValues(true)}
                                      className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      {displayValue} (click to reveal)
                                    </button>
                                  ) : (
                                    <span>{displayValue}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => clearLocalStorageItem(item.key)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                                title="Clear this item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {showTokenValues && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowTokenValues(false)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
                  >
                    <EyeOff className="w-3 h-3" />
                    Hide token values
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Debug Logs</h3>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="bg-black rounded p-3 h-64 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Refresh Status" to start...</div>
            ) : (
              logs.map((log, index) => {
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
    </>
  );
}

