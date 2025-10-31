'use client';

import { useState, useEffect } from 'react';
import { Check, X, YoutubeIcon, AlertTriangle } from 'lucide-react';

interface YouTubeConnectionProps {
  onConnect: (connected: boolean, channelInfo?: ChannelInfo) => void;
}

interface ChannelInfo {
  user_id: string;
  channel_title: string;
  subscriber_count: number;
}

export default function YouTubeConnection({ onConnect }: YouTubeConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already connected on component mount
  // DISABLED: Auto-login removed - users must manually click "Connect" button
  // useEffect(() => {
  //   const checkConnection = () => {
  //     const storedUserId = localStorage.getItem('youtube_user_id');
  //     
  //     if (storedUserId) {
  //       setIsConnected(true);
  //       onConnect(true);
  //     }
  //   };
  //
  //   checkConnection();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []); // Only run once on mount

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get authorization URL from backend via Next.js API proxy
      // Include ngrok-skip-browser-warning header to bypass ngrok interstitial
      const response = await fetch('/api/youtube/auth-url', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        // Redirect to Google OAuth page
        window.location.href = data.data.auth_url;
      } else {
        setError('Failed to initialize YouTube connection');
      }
    } catch (err) {
      console.error('YouTube connect error:', err);
      setError('Failed to connect to YouTube. Please check if the backend service is running.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const userId = localStorage.getItem('youtube_user_id');
    
    if (userId) {
      try {
        // Use Next.js API proxy to avoid mixed content issues
        await fetch('/api/youtube/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ user_id: userId }),
        });
      } catch (err) {
        console.error('YouTube logout error:', err);
      }
    }
    
    // Clear stored credentials
    localStorage.removeItem('youtube_user_id');
    localStorage.removeItem('youtube_channel_title');
    
    setIsConnected(false);
    onConnect(false);
    setError(null);
    setChannelInfo(null);
  };

  // Check for OAuth callback success/error from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const youtubeConnected = urlParams.get('youtube_connected');
    const youtubeError = urlParams.get('youtube_error');

    if (youtubeConnected === 'true') {
      // Reload channel info
      const userId = localStorage.getItem('youtube_user_id');
      const channelTitle = localStorage.getItem('youtube_channel_title');
      
      if (userId && channelTitle) {
        const info = {
          user_id: userId,
          channel_title: channelTitle,
          subscriber_count: 0, // Can be fetched later if needed
        };
        setChannelInfo(info);
        setIsConnected(true);
        onConnect(true, info);
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (youtubeError) {
      setError('YouTube authorization failed. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              Connected to YouTube
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {channelInfo && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {channelInfo.channel_title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {channelInfo.subscriber_count.toLocaleString()} subscribers
            </p>
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your YouTube channel is connected and ready for publishing Shorts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
      >
        {isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Connecting...
          </>
        ) : (
          <>
            <YoutubeIcon className="w-4 h-4 mr-2" />
            Connect YouTube
          </>
        )}
      </button>
      
      <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          YouTube Data API v3 w/ OAuth 2.0 auth.
        </p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• Official YouTube API support</p>
        <p>• OAuth 2.0 secure authentication</p>
        <p>• Uploads videos as Shorts automatically</p>
      </div>
    </div>
  );
}

