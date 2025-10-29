'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface AuthResult {
  success: boolean;
  code?: string;
  error?: string;
  errorDescription?: string;
}

const FreshInstagramCallbackContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = () => {
      try {
        console.log('[FRESH CALLBACK] Processing callback...');
        
        // Get URL parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const state = searchParams.get('state');

        console.log('[FRESH CALLBACK] URL params:', {
          code: code ? code.substring(0, 10) + '...' : null,
          error,
          errorDescription,
          state
        });

        if (error) {
          console.error('[FRESH CALLBACK] OAuth error:', error, errorDescription);
          setAuthResult({
            success: false,
            error: error,
            errorDescription: errorDescription || undefined
          });
        } else if (code) {
          console.log('[FRESH CALLBACK] OAuth code received:', code.substring(0, 10) + '...');
          setAuthResult({
            success: true,
            code: code
          });
        } else {
          console.error('[FRESH CALLBACK] No code or error received');
          setAuthResult({
            success: false,
            error: 'No authorization code received'
          });
        }

        setIsProcessing(false);

        // Send result back to parent window
        if (window.opener) {
          console.log('[FRESH CALLBACK] Sending result to parent window...');
          
          if (authResult?.success && code) {
            window.opener.postMessage({
              type: 'INSTAGRAM_AUTH_SUCCESS',
              code: code,
              state: state
            }, window.location.origin);
          } else {
            window.opener.postMessage({
              type: 'INSTAGRAM_AUTH_ERROR',
              error: authResult?.error || 'Unknown error',
              errorDescription: authResult?.errorDescription
            }, window.location.origin);
          }
        }

      } catch (error) {
        console.error('[FRESH CALLBACK] Processing error:', error);
        setAuthResult({
          success: false,
          error: error instanceof Error ? error.message : 'Callback processing failed'
        });
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, authResult?.error, authResult?.errorDescription, authResult?.success]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Fresh Instagram Authentication
          </h1>

          {isProcessing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Processing authentication...</span>
              </div>
              <div className="text-sm text-gray-500">
                Please wait while we complete your Instagram connection.
              </div>
            </div>
          ) : authResult ? (
            <div className="space-y-4">
              {authResult.success ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-semibold">Authentication Successful!</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Your Instagram account has been connected successfully.
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs text-green-700">
                      <div><strong>Code:</strong> {authResult.code?.substring(0, 20)}...</div>
                      <div><strong>Status:</strong> Ready for token exchange</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    This window will close automatically and return you to the main app.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-semibold">Authentication Failed</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    There was an error connecting your Instagram account.
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-xs text-red-700">
                      <div><strong>Error:</strong> {authResult.error}</div>
                      {authResult.errorDescription && (
                        <div><strong>Description:</strong> {authResult.errorDescription}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    This window will close automatically and return you to the main app.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-600 font-semibold">Unknown Status</span>
              </div>
              <div className="text-sm text-gray-600">
                Unable to determine authentication status.
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Information</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
              <div><strong>Processing:</strong> {isProcessing ? 'Yes' : 'No'}</div>
              <div><strong>Result:</strong> {authResult ? JSON.stringify(authResult) : 'None'}</div>
            </div>
          </div>

          {/* Manual Close Button */}
          <div className="mt-4">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Return to App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FreshInstagramCallback: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <FreshInstagramCallbackContent />
    </Suspense>
  );
};

export default FreshInstagramCallback;
