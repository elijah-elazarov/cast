'use client';

import { useState } from 'react';
import { Instagram, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default function RealInstagramTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [authUrl, setAuthUrl] = useState('');

  const runRealTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    const testResults: TestResult[] = [];

    try {
      // Step 1: Test OAuth URL generation (real API call)
      testResults.push({
        step: '1. Generate OAuth URL',
        success: false,
        message: 'Testing OAuth URL generation...'
      });

      const authUrlResponse = await fetch('/api/instagram/graph/auth-url');
      const authUrlData = await authUrlResponse.json();
      
      if (authUrlData.success && authUrlData.auth_url) {
        setAuthUrl(authUrlData.auth_url);
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
          message: 'Failed to generate OAuth URL',
          error: authUrlData.error || 'Unknown error'
        };
        setResults([...testResults]);
        setIsLoading(false);
        return;
      }

      // Step 2: Test backend health
      testResults.push({
        step: '2. Backend Health Check',
        success: false,
        message: 'Testing backend connectivity...'
      });

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
        const healthResponse = await fetch(`${backendUrl}/health`);
        
        if (healthResponse.ok) {
          testResults[1] = {
            step: '2. Backend Health Check',
            success: true,
            message: 'Backend is healthy and accessible',
            data: { status: 'OK', url: backendUrl }
          };
        } else {
          testResults[1] = {
            step: '2. Backend Health Check',
            success: false,
            message: 'Backend health check failed',
            error: `Status: ${healthResponse.status}`
          };
        }
      } catch (error) {
        testResults[1] = {
          step: '2. Backend Health Check',
          success: false,
          message: 'Backend health check failed',
          error: String(error)
        };
      }

      // Step 3: Test Instagram Graph API endpoint
      testResults.push({
        step: '3. Instagram Graph API Endpoint',
        success: false,
        message: 'Testing Instagram Graph API endpoint...'
      });

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
        const apiResponse = await fetch(`${backendUrl}/api/instagram/graph/auth-url`);
        const apiData = await apiResponse.json();
        
        if (apiData.success) {
          testResults[2] = {
            step: '3. Instagram Graph API Endpoint',
            success: true,
            message: 'Instagram Graph API endpoint is working',
            data: apiData
          };
        } else {
          testResults[2] = {
            step: '3. Instagram Graph API Endpoint',
            success: false,
            message: 'Instagram Graph API endpoint failed',
            error: apiData.error || 'Unknown error'
          };
        }
      } catch (error) {
        testResults[2] = {
          step: '3. Instagram Graph API Endpoint',
          success: false,
          message: 'Instagram Graph API endpoint failed',
          error: String(error)
        };
      }

      // Step 4: Test environment variables
      testResults.push({
        step: '4. Environment Check',
        success: false,
        message: 'Checking environment configuration...'
      });

      const envCheck = {
        frontendUrl: window.location.origin,
        backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com',
        hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL
      };

      testResults[3] = {
        step: '4. Environment Check',
        success: true,
        message: 'Environment configuration checked',
        data: envCheck
      };

    } catch (error) {
      testResults.push({
        step: 'Error',
        success: false,
        message: `Test failed: ${error}`,
        error: String(error)
      });
    }

    setResults([...testResults]);
    setIsLoading(false);
  };

  const openOAuthUrl = () => {
    if (authUrl) {
      window.open(authUrl, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Instagram className="w-8 h-8 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Real Instagram Graph API Test
        </h2>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-6">
        This component tests the actual Instagram Graph API integration by making real API calls
        to your backend. It will help identify any issues with the OAuth flow and API connectivity.
      </p>

      <div className="space-y-4">
        <button
          onClick={runRealTest}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running Real Tests...
            </>
          ) : (
            'Run Real Instagram Graph API Test'
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
                    {result.error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Error: {result.error}
                      </p>
                    )}
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

        {authUrl && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              OAuth URL Generated
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Click the button below to test the actual OAuth flow:
            </p>
            <div className="flex gap-2">
              <button
                onClick={openOAuthUrl}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open OAuth URL
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(authUrl)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
              >
                Copy URL
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Real API Test
          </h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            This component makes real API calls to test the actual Instagram Graph API integration.
            It will help identify any issues with your backend configuration and OAuth flow.
          </p>
        </div>
      </div>
    </div>
  );
}
