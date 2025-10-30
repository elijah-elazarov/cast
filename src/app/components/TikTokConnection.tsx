'use client';

import { useState, useEffect } from 'react';
import { Check, X, Music, AlertTriangle } from 'lucide-react';
// Use native img for TikTok avatars to avoid Next/Image domain restrictions and signed-URL issues

interface TikTokConnectionProps {
  onConnect: (connected: boolean) => void;
}

interface UserInfo {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

export default function TikTokConnection({ onConnect }: TikTokConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already connected on component mount
  useEffect(() => {
    const checkConnection = () => {
      const storedUserId = localStorage.getItem('tiktok_user_id');
      const storedDisplayName = localStorage.getItem('tiktok_display_name');
      
      if (storedUserId) {
        setIsConnected(true);
        setUserInfo({
          user_id: storedUserId,
          display_name: storedDisplayName || 'TikTok User',
          avatar_url: localStorage.getItem('tiktok_avatar_url') || ''
        });
        onConnect(true);
      }
    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get authorization URL from backend via Next.js API proxy
      const response = await fetch('/api/tiktok/auth-url', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        // Redirect to TikTok OAuth page
        window.location.href = data.auth_url;
      } else {
        setError('Failed to initialize TikTok connection');
      }
    } catch (err) {
      console.error('TikTok connect error:', err);
      setError('Failed to connect to TikTok. Please check if the backend service is running.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const userId = localStorage.getItem('tiktok_user_id');
      
      if (!userId) {
        // Just clear local state if no user ID
        setIsConnected(false);
        setUserInfo(null);
        onConnect(false);
        return;
      }

      // Call backend logout endpoint via Next.js API proxy
      const response = await fetch('/api/tiktok/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('tiktok_user_id');
        localStorage.removeItem('tiktok_display_name');
        localStorage.removeItem('tiktok_avatar_url');
        
        // Update state
        setIsConnected(false);
        setUserInfo(null);
        onConnect(false);
      } else {
        setError('Failed to disconnect from TikTok');
      }
    } catch (err) {
      console.error('TikTok disconnect error:', err);
      setError('Failed to disconnect from TikTok');
    }
  };

  // Check URL for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokConnected = params.get('tiktok_connected');
    const tiktokError = params.get('tiktok_error');
    const userId = params.get('tiktok_user_id');
    const displayName = params.get('tiktok_display_name');
    const avatarUrl = params.get('tiktok_avatar_url');

    if (tiktokConnected === 'true' && userId) {
      setIsConnected(true);
      setUserInfo({
        user_id: userId,
        display_name: decodeURIComponent(displayName || 'TikTok User'),
        avatar_url: decodeURIComponent(avatarUrl || '')
      });
      onConnect(true);
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (tiktokError) {
      setError(decodeURIComponent(tiktokError));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onConnect]);

  if (isConnected && userInfo) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-medium">Connected</span>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-3">
            {userInfo.avatar_url ? (
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={userInfo.avatar_url}
                alt={userInfo.display_name}
                width={40}
                height={40}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <Music className="w-10 h-10 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {userInfo.display_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                TikTok Account
              </p>
            </div>
          </div>
        </div>

      <button
        onClick={handleDisconnect}
        className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        <X className="w-4 h-4" />
        <span>Disconnect</span>
      </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
      >
        {isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Music className="w-4 h-4" />
            <span>Connect TikTok</span>
          </>
        )}
      </button>
      
      <div className="flex items-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-pink-600 dark:text-pink-400 mr-2 flex-shrink-0" />
        <p className="text-xs text-pink-800 dark:text-pink-300">
          TikTok Content Posting API w/ OAuth 2.0 auth.
        </p>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• Requires TikTok Developer App approval</p>
        <p>• Videos will be uploaded to your TikTok account</p>
        <p>• Uses official TikTok Content Posting API</p>
      </div>
    </div>
  );
}

