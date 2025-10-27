'use client';

import { useState, useEffect } from 'react';
import { X, Instagram, CheckCircle, AlertCircle, Loader2, Upload, Eye } from 'lucide-react';

interface SessionInfo {
  user_id: string;
  username: string;
  page_id: string;
  has_access_token: boolean;
  access_token_preview: string;
  account_type: string;
  followers: number;
  media_count: number;
}

interface AuthInfo {
  instagram_user_id: string;
  page_id: string;
  page_access_token_length: number;
  session_stored: boolean;
  total_active_sessions: number;
}

interface InstagramTestPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstagramTestPopup({ isOpen, onClose }: InstagramTestPopupProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  // Get auth URL when component opens
  useEffect(() => {
    if (isOpen && !authUrl) {
      getAuthUrl();
    }
  }, [isOpen, authUrl]);

  // Listen for popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
        const { code } = event.data;
        handleAuthCode(code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getAuthUrl = async () => {
    try {
      setStatus('loading');
      setMessage('Getting Instagram auth URL...');
      
      const response = await fetch('/api/instagram/graph/auth-url');
      const data = await response.json();
      
      if (data.success) {
        setAuthUrl(data.data.auth_url);
        setStatus('idle');
        setMessage('Ready to test Instagram login');
      } else {
        throw new Error(data.error || 'Failed to get auth URL');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to get auth URL');
      setMessage('Failed to get auth URL');
    }
  };

  const openAuthPopup = () => {
    if (!authUrl) return;
    
    const popup = window.open(
      authUrl,
      'instagram-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    setPopupWindow(popup);
    setStatus('loading');
    setMessage('Complete Instagram login in popup window...');
    
    // Check if popup is closed
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setPopupWindow(null);
        if (status === 'loading') {
          setStatus('idle');
          setMessage('Login cancelled or popup closed');
        }
      }
    }, 1000);
  };

  const handleAuthCode = async (code: string) => {
    try {
      setStatus('loading');
      setMessage('Processing Instagram authentication...');
      
      const response = await fetch('/api/instagram/graph/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('Successfully connected to Instagram!');
        
        if (data.session_info) {
          setSessionInfo(data.session_info);
        }
        if (data.auth_info) {
          setAuthInfo(data.auth_info);
        }
        
        // Store account info
        localStorage.setItem('instagram_account_info', JSON.stringify(data.data));
        localStorage.setItem('instagram_username', data.data.username);
        localStorage.setItem('instagram_account_type', 'graph');
        
      } else {
        setStatus('error');
        setError(data.detail || 'Failed to connect to Instagram');
        setMessage('Authentication failed');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setMessage('Authentication failed');
    }
  };

  const testUpload = async () => {
    if (!sessionInfo) return;
    
    try {
      setStatus('loading');
      setMessage('Testing upload functionality...');
      
      const response = await fetch('/api/instagram/graph/upload-reel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: sessionInfo.user_id,
          video_url: 'https://example.com/test.mp4',
          caption: 'Test upload from popup component'
        }),
      });

      const data = await response.json();
      
      if (response.status === 422) {
        setStatus('success');
        setMessage('✅ Upload endpoint is accessible and properly structured!');
        setError('Expected error for invalid video URL - this confirms the endpoint works');
      } else if (data.success) {
        setStatus('success');
        setMessage('✅ Upload successful!');
      } else {
        setStatus('error');
        setError(data.detail || 'Upload failed');
        setMessage('Upload test failed');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Upload test failed');
      setMessage('Upload test failed');
    }
  };

  const checkSessions = () => {
    window.open('https://backrooms-e8nm.onrender.com/api/debug/sessions', '_blank');
  };

  const resetTest = () => {
    setStatus('idle');
    setMessage('Ready to test Instagram login');
    setError(null);
    setSessionInfo(null);
    setAuthInfo(null);
    setAuthUrl(null);
    if (popupWindow) {
      popupWindow.close();
      setPopupWindow(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Instagram className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-semibold text-gray-900">Instagram Test Popup</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="text-center">
            {status === 'idle' && (
              <div className="space-y-2">
                <Instagram className="h-12 w-12 text-pink-600 mx-auto" />
                <p className="text-gray-600">{message}</p>
              </div>
            )}
            
            {status === 'loading' && (
              <div className="space-y-2">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">{message}</p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-green-600 font-medium">{message}</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
                <p className="text-red-600 font-medium">{message}</p>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Session Info */}
          {sessionInfo && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Session Info
              </h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Username:</span> {sessionInfo.username}</p>
                <p><span className="font-medium">User ID:</span> {sessionInfo.user_id}</p>
                <p><span className="font-medium">Page ID:</span> {sessionInfo.page_id}</p>
                <p><span className="font-medium">Followers:</span> {sessionInfo.followers}</p>
                <p><span className="font-medium">Media Count:</span> {sessionInfo.media_count}</p>
                <p><span className="font-medium">Has Token:</span> {sessionInfo.has_access_token ? 'Yes ✓' : 'No ✗'}</p>
              </div>
            </div>
          )}

          {/* Auth Info */}
          {authInfo && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Auth Info
              </h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Session Stored:</span> {authInfo.session_stored ? 'Yes ✓' : 'No ✗'}</p>
                <p><span className="font-medium">Total Sessions:</span> {authInfo.total_active_sessions}</p>
                <p><span className="font-medium">Token Length:</span> {authInfo.page_access_token_length} chars</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            {status === 'idle' && authUrl && (
              <button
                onClick={openAuthPopup}
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <Instagram className="h-4 w-4" />
                Test Instagram Login
              </button>
            )}
            
            {status === 'success' && (
              <>
                <button
                  onClick={testUpload}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Test Upload
                </button>
                <button
                  onClick={checkSessions}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Check Sessions
                </button>
              </>
            )}
            
            <button
              onClick={resetTest}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Reset Test
            </button>
          </div>

          {/* Debug Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Auth URL:</strong> {authUrl ? 'Ready' : 'Not loaded'}</p>
            <p><strong>Popup Window:</strong> {popupWindow ? 'Open' : 'Closed'}</p>
            <p><strong>Status:</strong> {status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
