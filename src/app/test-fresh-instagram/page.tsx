'use client';

import React, { useState } from 'react';
import FreshInstagramAuth from '@/app/components/FreshInstagramAuth';

const FreshInstagramTestPage: React.FC = () => {
  const [showComponent, setShowComponent] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Fresh Instagram Component Test
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Testing the brand new Instagram authentication component built from scratch
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowComponent(!showComponent)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
            >
              {showComponent ? 'Hide Component' : 'Show Component'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              Refresh Page
            </button>
          </div>
        </div>

        {showComponent && (
          <div className="space-y-8">
            {/* Fresh Component */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Fresh Instagram Auth Component
                </h2>
                <p className="text-gray-600">
                  This is the brand new component built from scratch using Facebook's manual OAuth flow
                </p>
              </div>
              
              <FreshInstagramAuth />
            </div>

            {/* Comparison Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                What's Different About This Component?
              </h3>
              <div className="space-y-2 text-sm text-yellow-700">
                <div>• Built from scratch using Facebook's official manual OAuth flow documentation</div>
                <div>• Implements proper token exchange with <code>grant_type=authorization_code</code></div>
                <div>• Includes long-lived token generation for 60-day expiration</div>
                <div>• Direct Instagram Graph API calls without backend proxy</div>
                <div>• Clean error handling and user feedback</div>
                <div>• Popup-based authentication flow for better UX</div>
                <div>• Comprehensive debugging and session information display</div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                Technical Implementation Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <h4 className="font-semibold mb-2">OAuth Flow:</h4>
                  <ul className="space-y-1">
                    <li>• Generate auth URL with proper parameters</li>
                    <li>• Open popup window for authentication</li>
                    <li>• Handle callback with code exchange</li>
                    <li>• Exchange code for short-lived token</li>
                    <li>• Convert to long-lived token (60 days)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">API Endpoints:</h4>
                  <ul className="space-y-1">
                    <li>• Facebook OAuth dialog</li>
                    <li>• Graph API token exchange</li>
                    <li>• Long-lived token generation</li>
                    <li>• User Instagram account lookup</li>
                    <li>• Media posting test functionality</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Testing Instructions */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                Testing Instructions
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                <div>1. Click "Connect Instagram Account" to start the authentication flow</div>
                <div>2. Complete the Instagram login in the popup window</div>
                <div>3. Verify that session information is displayed correctly</div>
                <div>4. Test the posting functionality to ensure full integration</div>
                <div>5. Check browser console for detailed debug information</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreshInstagramTestPage;
