'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, AlertTriangle } from 'lucide-react';

function TikTokCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          setStatus('error');
          setMessage('Authentication failed');
          setError(errorDescription || 'TikTok authorization was denied or failed.');
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'TIKTOK_AUTH_ERROR',
              error: errorDescription || 'TikTok authorization was denied or failed.'
            }, window.location.origin);
            
            setTimeout(() => {
              window.close();
            }, 2000);
          }
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Authentication failed');
          setError('No authorization code received from TikTok.');
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'TIKTOK_AUTH_ERROR',
              error: 'No authorization code received from TikTok.'
            }, window.location.origin);
            
            setTimeout(() => {
              window.close();
            }, 2000);
          }
          return;
        }

        // Exchange code for tokens via Next.js API proxy
        const response = await fetch('/api/tiktok/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorDetail = data.error || data.detail || data.message || 'Failed to complete TikTok authorization';
          console.error('TikTok login API error:', { status: response.status, data });
          throw new Error(errorDetail);
        }

        setStatus('success');
        setMessage('Authentication successful! You can close this window.');

        // Send success message to parent window
        // Wrap the response in the expected format for TikTokBackendResponse
        if (window.opener) {
          window.opener.postMessage({
            type: 'TIKTOK_AUTH_SUCCESS',
            authData: {
              success: true,
              data: {
                user_id: data.user_id || data.open_id,
                display_name: data.display_name || 'TikTok User',
                avatar_url: data.avatar_url,
                follower_count: data.follower_count,
                following_count: data.following_count,
                video_count: data.video_count,
                like_count: data.likes_count || data.like_count,
                is_verified: data.is_verified
              },
              message: 'Authentication successful'
            }
          }, window.location.origin);
          
          setTimeout(() => {
            window.close();
          }, 1500);
        }

      } catch (err) {
        setStatus('error');
        setMessage('Authentication failed');
        const errorMsg = err instanceof Error ? err.message : 'Failed to complete TikTok authorization.';
        setError(errorMsg);
        console.error('TikTok callback error:', err);
        console.error('Full error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'TIKTOK_AUTH_ERROR',
            error: errorMsg
          }, window.location.origin);
          
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      }
    };

    handleAuth();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Authenticating...</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-green-600 text-2xl">✓</div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              You can close this window and return to the main application.
            </p>
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
                  <span className="text-sm text-red-800">Failed to connect to TikTok</span>
                </div>
              </div>
            )}
            <button
              onClick={() => window.close()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TikTokCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    }>
      <TikTokCallbackContent />
    </Suspense>
  );
}

