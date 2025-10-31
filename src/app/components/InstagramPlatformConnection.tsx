'use client';

import { useState, useEffect } from 'react';
import { Instagram, Check, AlertCircle } from 'lucide-react';

interface InstagramPlatformConnectionProps {
  onConnect: (connected: boolean) => void;
}

interface AccountInfo {
  username: string;
  followers_count: number;
  media_count: number;
  account_type: string;
}

export default function InstagramPlatformConnection({ onConnect }: InstagramPlatformConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Don't auto-connect on mount - require manual connection
  // useEffect(() => {
  //   const checkConnection = () => {
  //     const storedUsername = localStorage.getItem('instagram_username');
  //     const storedAccountType = localStorage.getItem('instagram_account_type');
  //     
  //     if (storedUsername && storedAccountType === 'platform') {
  //       setIsConnected(true);
  //       onConnect(true);
  //       
  //       // Get stored account info
  //       const followersCount = localStorage.getItem('instagram_followers_count');
  //       const mediaCount = localStorage.getItem('instagram_media_count');
  //       
  //       setAccountInfo({
  //         username: storedUsername,
  //         followers_count: followersCount ? parseInt(followersCount) : 0,
  //         media_count: mediaCount ? parseInt(mediaCount) : 0,
  //         account_type: 'BUSINESS'
  //       });
  //     }
  //   };

  //   checkConnection();
  // }, [onConnect]);

  // Check for OAuth callback success/error from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramConnected = urlParams.get('instagram_connected');
    const instagramError = urlParams.get('instagram_error');

    if (instagramConnected === 'true') {
      // Connection was successful, account info should be in localStorage
      const username = localStorage.getItem('instagram_username');
      const followersCount = localStorage.getItem('instagram_followers_count');
      const mediaCount = localStorage.getItem('instagram_media_count');
      
      if (username) {
        setIsConnected(true);
        setAccountInfo({
          username,
          followers_count: followersCount ? parseInt(followersCount) : 0,
          media_count: mediaCount ? parseInt(mediaCount) : 0,
          account_type: 'BUSINESS'
        });
        setShowSuccessAnimation(true);
        onConnect(true);
        
        // Clean up URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } else if (instagramError) {
      setError(`Instagram connection failed: ${instagramError}`);
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [onConnect]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get Instagram Platform OAuth URL
      const response = await fetch('/api/instagram/platform/auth-url');
      const data = await response.json();

      if (data.success) {
        // Open Instagram OAuth in a small popup window
        const popup = window.open(
          data.auth_url,
          'instagram-platform-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        );
        
        if (!popup) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Listen for messages from the popup
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'INSTAGRAM_PLATFORM_OAUTH_SUCCESS') {
            clearInterval(checkClosed);
            popup.close();
            setIsConnecting(false);
            setIsConnected(true);
            onConnect(true);
            setShowSuccessAnimation(true);
            window.removeEventListener('message', messageHandler);
          } else if (event.data.type === 'INSTAGRAM_PLATFORM_OAUTH_ERROR') {
            clearInterval(checkClosed);
            popup.close();
            setIsConnecting(false);
            setError(event.data.error || 'Instagram Platform connection failed');
            window.removeEventListener('message', messageHandler);
          }
        };

        window.addEventListener('message', messageHandler);

        // Monitor the popup for completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            setIsConnecting(false);
            // Check if connection was successful by looking at localStorage
            setTimeout(() => {
              const username = localStorage.getItem('instagram_username');
              if (username) {
                setIsConnected(true);
                onConnect(true);
                setShowSuccessAnimation(true);
              }
            }, 1000);
          }
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to get Instagram auth URL');
      }
    } catch (err) {
      console.error('Instagram connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Instagram');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear stored data
      localStorage.removeItem('instagram_user_id');
      localStorage.removeItem('instagram_username');
      localStorage.removeItem('instagram_account_type');
      localStorage.removeItem('instagram_followers_count');
      localStorage.removeItem('instagram_media_count');
      
      setIsConnected(false);
      setAccountInfo(null);
      onConnect(false);
    } catch (err) {
      console.error('Instagram disconnect error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          {showSuccessAnimation && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-pulse">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-medium">Instagram connected successfully!</span>
            </div>
          )}
          
          {accountInfo && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Instagram className="w-6 h-6 text-pink-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  @{accountInfo.username}
                </span>
                <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                  {accountInfo.account_type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                <div>
                  <span className="font-medium">Media:</span> {accountInfo.media_count}
                </div>
                <div>
                  <span className="font-medium">Followers:</span> {accountInfo.followers_count}
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Disconnect Instagram
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </>
          ) : (
            <>
              <Instagram className="w-5 h-5" />
              Connect Instagram (Direct)
            </>
          )}
        </button>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p className="mb-1">✨ <strong>Instagram Platform OAuth</strong></p>
        <p>Direct Instagram authentication - no Facebook pages required!</p>
        <p>Uses <code>api.instagram.com/oauth/authorize</code></p>
      </div>
    </div>
  );
}
