'use client';

import { useState, useEffect } from 'react';
import { Key, Instagram, Youtube, Music, CheckCircle, XCircle, Loader2, RefreshCw, LogOut, AlertCircle, Clock } from 'lucide-react';

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

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Initialize: Check which platforms are authenticated
  useEffect(() => {
    checkAllStatuses();
  }, []);

  const checkAllStatuses = () => {
    addLog('🔍 Checking token status for all platforms...');
    
    // Instagram
    const instagramToken = localStorage.getItem('instagram_long_lived_token');
    const instagramUserId = localStorage.getItem('instagram_user_id');
    const instagramUsername = localStorage.getItem('instagram_username');
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'instagram' 
        ? { ...status, isAuthenticated: !!instagramToken, userId: instagramUserId || undefined, username: instagramUsername || undefined }
        : status
    ));

    // YouTube
    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const youtubeAccessToken = localStorage.getItem('youtube_access_token');
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'youtube' 
        ? { ...status, isAuthenticated: !!youtubeUserId, userId: youtubeUserId || undefined }
        : status
    ));

    // TikTok
    const tiktokUserId = localStorage.getItem('tiktok_user_id');
    const tiktokDisplayName = localStorage.getItem('tiktok_display_name');
    
    setTokenStatus(prev => prev.map(status => 
      status.platform === 'tiktok' 
        ? { ...status, isAuthenticated: !!tiktokUserId, userId: tiktokUserId || undefined, username: tiktokDisplayName || undefined }
        : status
    ));

    addLog('✅ Status check complete');
  };

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
              onClick={checkAllStatuses}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </button>
            <button
              onClick={validateAllTokens}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              disabled={tokenStatus.every(s => !s.isAuthenticated)}
            >
              <CheckCircle className="w-4 h-4" />
              Validate All
            </button>
            <button
              onClick={logoutAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              disabled={tokenStatus.every(s => !s.isAuthenticated)}
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
                    <span className="text-gray-600 dark:text-gray-400">Username:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
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

                {status.error && (
                  <div className="text-xs text-red-600 dark:text-red-400 truncate">
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
          <div className="bg-black rounded p-3 h-64 overflow-y-auto font-mono text-sm text-green-400">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Refresh Status" to start...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
    </>
  );
}

