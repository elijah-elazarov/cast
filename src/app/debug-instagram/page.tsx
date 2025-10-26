'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DebugInstagramPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');

  const testInstagramStatus = async () => {
    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const response = await fetch('https://backrooms-e8nm.onrender.com/api/debug/instagram/status');
      const data = await response.json();
      
      setResults(data);
      setStatus(data.success ? 'success' : 'error');
      if (!data.success) {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to test Instagram status');
    }
  };

  const testAccessToken = async () => {
    if (!accessToken.trim()) {
      setError('Please enter an access token');
      return;
    }

    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const response = await fetch('https://backrooms-e8nm.onrender.com/api/debug/instagram/test-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      
      const data = await response.json();
      
      setResults(data);
      setStatus(data.success ? 'success' : 'error');
      if (!data.success) {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to test access token');
    }
  };

  const getOAuthUrl = async () => {
    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/instagram/meta/auth-url');
      const data = await response.json();
      
      if (data.success) {
        setResults({
          success: true,
          message: 'OAuth URL generated successfully',
          auth_url: data.data.auth_url,
          state: data.data.state
        });
        setStatus('success');
      } else {
        setStatus('error');
        setError(data.detail || 'Failed to get OAuth URL');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to get OAuth URL');
    }
  };

  const reset = () => {
    setStatus('idle');
    setResults(null);
    setError(null);
    setAccessToken('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Instagram Debug Console</h1>
          
          <div className="space-y-6">
            {/* Test 1: Instagram Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Test 1: Instagram API Status</h2>
              <p className="text-gray-600 mb-4">Check if Instagram Graph API is properly configured</p>
              <button
                onClick={testInstagramStatus}
                disabled={status === 'loading'}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test Instagram Status
              </button>
            </div>

            {/* Test 2: OAuth URL Generation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Test 2: OAuth URL Generation</h2>
              <p className="text-gray-600 mb-4">Test if OAuth URL can be generated (frontend proxy test)</p>
              <button
                onClick={getOAuthUrl}
                disabled={status === 'loading'}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test OAuth URL
              </button>
            </div>

            {/* Test 3: Access Token Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Test 3: Access Token Test</h2>
              <p className="text-gray-600 mb-4">Test a specific access token and get detailed information</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <input
                    type="text"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Enter access token to test..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={testAccessToken}
                  disabled={status === 'loading' || !accessToken.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Test Access Token
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-center">
              <button
                onClick={reset}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Reset All Tests
              </button>
            </div>

            {/* Results Display */}
            {status !== 'idle' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                  {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  Test Results
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  </div>
                )}

                {results && (
                  <div className="bg-gray-50 rounded-md p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li><strong>Test 1:</strong> Click "Test Instagram Status" to check if your backend is properly configured</li>
                <li><strong>Test 2:</strong> Click "Test OAuth URL" to verify the frontend proxy is working</li>
                <li><strong>Test 3:</strong> Get an access token by completing the OAuth flow, then paste it here to test</li>
                <li>Check the results to see exactly what's working and what's not</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
