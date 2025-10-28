'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, AlertTriangle } from 'lucide-react';

function YouTubeCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage('Authentication failed');
          setError(error);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Authentication failed');
          setError('No authorization code received');
          return;
        }

        // Exchange code for tokens
        const response = await fetch('/api/youtube/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Authentication successful! You can close this window.');
          
          // Send success message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'YOUTUBE_AUTH_SUCCESS',
              authData: data.authData
            }, window.location.origin);
          }
        } else {
          setStatus('error');
          setMessage('Authentication failed');
          setError(data.error);
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'YOUTUBE_AUTH_ERROR',
              error: data.error
            }, window.location.origin);
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage('Authentication failed');
        setError(error instanceof Error ? error.message : 'Unknown error');
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'YOUTUBE_AUTH_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
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
                  <span className="text-sm text-red-800">Failed to connect to YouTube</span>
                </div>
              </div>
            )}
            <button
              onClick={() => window.close()}
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

export default function YouTubeCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    }>
      <YouTubeCallbackContent />
    </Suspense>
  );
}