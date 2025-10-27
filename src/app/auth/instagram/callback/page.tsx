'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';

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

export default function InstagramCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Instagram authentication...');
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          setError(errorDescription || error);
          setMessage('Authentication failed');
          return;
        }

        if (!code) {
          setStatus('error');
          setError('No authorization code received');
          setMessage('Authentication failed');
          return;
        }

        setMessage('Exchanging code for access token...');

        // Exchange code for access token
        const response = await fetch('/api/instagram/graph/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        
        console.log('[CALLBACK] Full response:', data);

        if (data.success) {
          setStatus('success');
          setMessage('Successfully connected to Instagram!');
          
          // Store session and auth info for display
          if (data.session_info) {
            setSessionInfo(data.session_info);
            console.log('Session Info:', data.session_info);
          }
          if (data.auth_info) {
            setAuthInfo(data.auth_info);
            console.log('Auth Info:', data.auth_info);
          }
          
          // Store account info
          localStorage.setItem('instagram_account_info', JSON.stringify(data.data));
          localStorage.setItem('instagram_username', data.data.username);
          localStorage.setItem('instagram_account_type', 'graph');
          
          // Redirect to main page after a short delay
          setTimeout(() => {
            router.push('/');
          }, 5000); // Increased delay to show debug info
        } else {
          setStatus('error');
          setError(data.detail || 'Failed to connect to Instagram');
          setMessage('Authentication failed');
        }
      } catch (error) {
        console.error('Instagram callback error:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setMessage('Authentication failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">Connecting to Instagram</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Success!</h2>
            <p className="text-gray-600">{message}</p>
            
            {/* Session Info */}
            {sessionInfo && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-left mt-4">
                <h3 className="font-semibold text-blue-900 mb-2">Session Info:</h3>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Username:</span> {sessionInfo.username}</p>
                  <p><span className="font-medium">User ID:</span> {sessionInfo.user_id}</p>
                  <p><span className="font-medium">Page ID:</span> {sessionInfo.page_id}</p>
                  <p><span className="font-medium">Followers:</span> {sessionInfo.followers}</p>
                  <p><span className="font-medium">Media Count:</span> {sessionInfo.media_count}</p>
                  <p><span className="font-medium">Has Token:</span> {sessionInfo.has_access_token ? 'Yes ✓' : 'No ✗'}</p>
                  {sessionInfo.access_token_preview && (
                    <p><span className="font-medium">Token:</span> {sessionInfo.access_token_preview}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Auth Info */}
            {authInfo && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-left">
                <h3 className="font-semibold text-green-900 mb-2">Auth Info:</h3>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Session Stored:</span> {authInfo.session_stored ? 'Yes ✓' : 'No ✗'}</p>
                  <p><span className="font-medium">Total Sessions:</span> {authInfo.total_active_sessions}</p>
                  <p><span className="font-medium">Token Length:</span> {authInfo.page_access_token_length} chars</p>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-500">Redirecting you back to the app...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Failed</h2>
            <p className="text-gray-600">{message}</p>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => router.push('/')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Return to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}