'use client';

import { useState } from 'react';
import { Instagram, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export default function InstagramTestComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  // const [accessToken, setAccessToken] = useState('');

  const runInstagramTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    const testResults: TestResult[] = [];

    try {
      // Step 1: Test OAuth URL generation
      testResults.push({
        step: '1. Generate OAuth URL',
        success: false,
        message: 'Testing OAuth URL generation...'
      });

      const authUrlResponse = await fetch('/api/instagram/graph/auth-url');
      const authUrlData = await authUrlResponse.json();
      
      if (authUrlData.success && authUrlData.auth_url) {
        testResults[0] = {
          step: '1. Generate OAuth URL',
          success: true,
          message: 'OAuth URL generated successfully',
          data: authUrlData.auth_url
        };
      } else {
        testResults[0] = {
          step: '1. Generate OAuth URL',
          success: false,
          message: 'Failed to generate OAuth URL'
        };
        setResults([...testResults]);
        setIsLoading(false);
        return;
      }

      // Step 2: Test token exchange (simulated)
      testResults.push({
        step: '2. Token Exchange',
        success: false,
        message: 'Testing token exchange...'
      });

      // Token exchange requires real OAuth flow - skip for testing
      testResults[1] = {
        step: '2. Token Exchange',
        success: true,
        message: 'Token exchange (skipped - requires real OAuth flow)',
        data: {
          note: 'This step requires clicking the OAuth URL and completing Instagram authorization',
          oauth_url: 'Use the OAuth URL from step 1 to get a real authorization code'
        }
      };

      // Step 3: Test long-lived token exchange
      testResults.push({
        step: '3. Long-lived Token',
        success: false,
        message: 'Testing long-lived token exchange...'
      });

      // Long-lived token exchange (skipped - requires access token from OAuth)
      testResults[2] = {
        step: '3. Long-lived Token',
        success: true,
        message: 'Long-lived token (skipped - requires access token from OAuth)',
        data: {
          note: 'This step requires completing the OAuth flow first',
          process: 'OAuth → Access Token → Long-lived Token'
        }
      };

      // Step 4: Test Facebook pages retrieval
      testResults.push({
        step: '4. Get Facebook Pages',
        success: false,
        message: 'Testing Facebook pages retrieval...'
      });

      // Test Facebook pages retrieval - requires real access token
      testResults[3] = {
        step: '4. Get Facebook Pages',
        success: false,
        message: 'Facebook pages retrieval requires real access token from OAuth flow',
        data: {
          note: 'This step requires completing the OAuth flow first to get a real access token',
          process: 'OAuth → Access Token → Facebook Pages'
        }
      };

      // Step 5: Test Instagram Business Account detection
      testResults.push({
        step: '5. Instagram Business Account',
        success: false,
        message: 'Instagram Business Account detection requires real Facebook pages data'
      });

      testResults[4] = {
        step: '5. Instagram Business Account',
        success: false,
        message: 'Instagram Business Account detection requires real access token and Facebook pages',
        data: {
          note: 'This step requires completing the OAuth flow and getting Facebook pages first',
          process: 'OAuth → Access Token → Facebook Pages → Instagram Business Account'
        }
      };

      // Step 6: Test Instagram user info
      testResults.push({
        step: '6. Instagram User Info',
        success: false,
        message: 'Instagram user info retrieval requires real Instagram Business Account'
      });

      testResults[5] = {
        step: '6. Instagram User Info',
        success: false,
        message: 'Instagram user info retrieval requires real Instagram Business Account',
        data: {
          note: 'This step requires completing the full OAuth flow and getting Instagram Business Account first',
          process: 'OAuth → Access Token → Facebook Pages → Instagram Business Account → User Info'
        }
      };

    } catch (error) {
      testResults.push({
        step: 'Error',
        success: false,
        message: `Test failed: ${error}`
      });
    }

    setResults([...testResults]);
    setIsLoading(false);
  };

  const openOAuthUrl = () => {
    const authUrlData = results.find(r => r.step === '1. Generate OAuth URL')?.data;
    if (authUrlData && typeof authUrlData === 'object' && 'auth_url' in authUrlData) {
      const authUrl = authUrlData.auth_url as string;
      window.open(authUrl, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Instagram className="w-8 h-8 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Instagram Graph API Test
        </h2>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-6">
        This component tests the Instagram Graph API integration following the approach from the{' '}
        <a 
          href="https://vdelacou.medium.com/posting-to-instagram-programmatically-cc69bf1effa8" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Medium article
        </a>
        . It shows what each step requires and guides you through the real OAuth process.
        All steps require real access tokens from the OAuth flow - no mock data.
      </p>

      <div className="space-y-4">
        <button
          onClick={runInstagramTest}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Instagram Graph API Test'
          )}
        </button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Results
            </h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {result.step}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {result.message}
                    </p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          View Data
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.some(r => r.step === '1. Generate OAuth URL' && r.success) && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Next Steps
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              The OAuth URL has been generated. Click the button below to test the actual OAuth flow:
            </p>
            <button
              onClick={openOAuthUrl}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            >
              Open OAuth URL in New Tab
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Note
          </h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            This is a test component that simulates the Instagram Graph API flow. 
            For real implementation, you would need to complete the OAuth flow and use actual access tokens.
          </p>
        </div>
      </div>
    </div>
  );
}
