'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, X, AlertTriangle } from 'lucide-react';

function TikTokCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'TikTok authorization was denied or failed.');
        setTimeout(() => {
          router.push('/?tiktok_error=' + encodeURIComponent(errorDescription || 'Authorization failed'));
        }, 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received from TikTok.');
        setTimeout(() => {
          router.push('/?tiktok_error=' + encodeURIComponent('No authorization code'));
        }, 2000);
        return;
      }

      try {
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
          throw new Error(data.error || 'Failed to complete TikTok authorization');
        }

        // Store user info in localStorage
        localStorage.setItem('tiktok_user_id', data.user_id);
        localStorage.setItem('tiktok_display_name', data.display_name || 'TikTok User');
        if (data.avatar_url) {
          localStorage.setItem('tiktok_avatar_url', data.avatar_url);
        }

        setStatus('success');

        // Redirect back to main page with success params
        setTimeout(() => {
          router.push(
            `/?tiktok_connected=true&tiktok_user_id=${data.user_id}` +
            `&tiktok_display_name=${encodeURIComponent(data.display_name || 'TikTok User')}` +
            `&tiktok_avatar_url=${encodeURIComponent(data.avatar_url || '')}`
          );
        }, 2000);

      } catch (err) {
        setStatus('error');
        const errorMsg = err instanceof Error ? err.message : 'Failed to complete TikTok authorization.';
        setError(errorMsg);
        console.error('TikTok callback error:', err);
        setTimeout(() => {
          router.push('/?tiktok_error=' + encodeURIComponent(errorMsg));
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connecting to TikTok...
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we complete the authorization process.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-3">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Successfully Connected!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your TikTok account has been connected successfully.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting you back to the dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Authentication Failed</h2>
              <p className="text-gray-600">Authentication failed</p>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm text-red-800">Failed to connect to TikTok</span>
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
    </div>
  );
}

export default function TikTokCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    }>
      <TikTokCallbackContent />
    </Suspense>
  );
}

