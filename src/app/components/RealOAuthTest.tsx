'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Instagram, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

export default function RealOAuthTest() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [authUrl, setAuthUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  // const [longLivedToken, setLongLivedToken] = useState('');
  // const [pagesData, setPagesData] = useState<Record<string, unknown> | null>(null);
  // const [igAccount, setIgAccount] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const handleOAuthFlow = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        setResults([{
          step: 'OAuth Error',
          success: false,
          message: `OAuth failed: ${error}`,
          error: error
        }]);
        return;
      }

      if (code) {
        // We have an authorization code - exchange it for access token
        await exchangeCodeForToken(code);
      } else {
        // No code yet - get OAuth URL
        await getOAuthUrl();
      }
    };

    handleOAuthFlow();
  }, [searchParams]);

  const getOAuthUrl = useCallback(async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      const response = await fetch('/api/instagram/graph/auth-url');
      const data = await response.json();
      
      if (data.success) {
        setAuthUrl(data.auth_url);
        setResults([{
          step: '1. OAuth URL Generated',
          success: true,
          message: 'Click the OAuth URL below to authorize with Instagram',
          data: { auth_url: data.auth_url }
        }]);
      } else {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }
    } catch (error) {
      setResults([{
        step: '1. OAuth URL Generation',
        success: false,
        message: 'Failed to get OAuth URL',
        error: String(error)
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exchangeCodeForToken = useCallback(async (code: string) => {
    setIsLoading(true);
    setResults(prev => [...prev, {
      step: '2. Token Exchange',
      success: false,
      message: 'Exchanging authorization code for access token...'
    }]);

    try {
      const response = await fetch('/api/instagram/graph/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.access_token) {
        setAccessToken(data.data.access_token);
        setResults(prev => [...prev, {
          step: '2. Token Exchange',
          success: true,
          message: 'Access token obtained successfully!',
          data: {
            access_token: data.data.access_token.substring(0, 20) + '...',
            token_type: data.data.token_type || 'Bearer',
            expires_in: data.data.expires_in
          }
        }]);
        
        // Continue with long-lived token
        await getLongLivedToken(data.data.access_token);
      } else {
        throw new Error(data.detail?.message || 'Token exchange failed');
      }
    } catch (error) {
      setResults(prev => [...prev, {
        step: '2. Token Exchange',
        success: false,
        message: 'Token exchange failed',
        error: String(error)
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLongLivedToken = useCallback(async (token: string) => {
    setResults(prev => [...prev, {
      step: '3. Long-lived Token',
      success: false,
      message: 'Getting long-lived token...'
    }]);

    try {
      const response = await fetch('/api/instagram/graph/long-lived-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: token }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.access_token) {
        // setLongLivedToken(data.data.access_token);
        setResults(prev => [...prev, {
          step: '3. Long-lived Token',
          success: true,
          message: 'Long-lived token obtained successfully!',
          data: {
            access_token: data.data.access_token.substring(0, 20) + '...',
            expires_in: data.data.expires_in
          }
        }]);
        
        // Continue with Facebook pages
        await getFacebookPages(data.data.access_token);
      } else {
        throw new Error(data.detail?.message || 'Long-lived token exchange failed');
      }
    } catch (error) {
      setResults(prev => [...prev, {
        step: '3. Long-lived Token',
        success: false,
        message: 'Long-lived token exchange failed',
        error: String(error)
      }]);
    }
  }, []);

  const getFacebookPages = useCallback(async (token: string) => {
    setResults(prev => [...prev, {
      step: '4. Facebook Pages',
      success: false,
      message: 'Getting Facebook pages...'
    }]);

    try {
      const response = await fetch('/api/instagram/graph/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: token }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.data) {
        // setPagesData(data.data);
        setResults(prev => [...prev, {
          step: '4. Facebook Pages',
          success: true,
          message: `Found ${data.data.data.length} Facebook page(s)`,
          data: data.data
        }]);
        
        // Continue with Instagram account
        await getInstagramAccount(data.data);
      } else {
        throw new Error(data.detail?.message || 'Failed to get Facebook pages');
      }
    } catch (error) {
      setResults(prev => [...prev, {
        step: '4. Facebook Pages',
        success: false,
        message: 'Failed to get Facebook pages',
        error: String(error)
      }]);
    }
  }, []);

  const getInstagramAccount = useCallback(async (pages: Record<string, unknown>) => {
    setResults(prev => [...prev, {
      step: '5. Instagram Account',
      success: false,
      message: 'Getting Instagram Business account...'
    }]);

    try {
      // Find Instagram Business account from pages
      const pagesArray = pages.data as Array<Record<string, unknown>>;
      let igAccount = null;
      
      for (const page of pagesArray) {
        try {
          const response = await fetch('/api/instagram/graph/instagram-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              page_id: page.id,
              page_access_token: page.access_token 
            }),
          });
          
          const data = await response.json();
          
          if (data.success && data.data?.instagram_business_account) {
            igAccount = data.data;
            break;
          }
        } catch {
          continue; // Try next page
        }
      }
      
      if (igAccount) {
        // setIgAccount(igAccount);
        setResults(prev => [...prev, {
          step: '5. Instagram Account',
          success: true,
          message: 'Instagram Business account found!',
          data: igAccount
        }]);
      } else {
        throw new Error('No Instagram Business account found');
      }
    } catch (error) {
      setResults(prev => [...prev, {
        step: '5. Instagram Account',
        success: false,
        message: 'Failed to get Instagram Business account',
        error: String(error)
      }]);
    }
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <Instagram className="w-8 h-8 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Real Instagram OAuth Test</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        This test goes through the complete real OAuth flow to get actual access tokens and Instagram data.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-gray-600">Processing...</span>
        </div>
      )}

      {authUrl && !searchParams.get('code') && (
        <div className="mb-6">
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Authorize with Instagram
          </a>
          <p className="text-sm text-gray-500 mt-2">
            Click this button to go through the real Instagram authorization process
          </p>
        </div>
      )}

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <h3 className="font-semibold text-gray-900">{result.step}</h3>
            </div>
            <p className="text-gray-700 mb-2">{result.message}</p>
            {result.error && (
              <p className="text-red-600 text-sm">{result.error}</p>
            )}
            {result.data && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Data
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {accessToken && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🎉 Real Access Token Obtained!</h3>
          <p className="text-blue-700 text-sm">
            You now have a real access token that can be used to post to Instagram on behalf of the user.
          </p>
          <div className="mt-2 text-xs text-blue-600">
            Token: {accessToken.substring(0, 20)}...
          </div>
        </div>
      )}
    </div>
  );
}
