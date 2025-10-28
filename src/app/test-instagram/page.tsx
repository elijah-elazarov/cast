'use client';

import { useState } from 'react';
import { Instagram, Play, Settings } from 'lucide-react';
import InstagramTestPopup from '../components/InstagramTestPopup';

export default function TestInstagramPage() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram className="h-8 w-8 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-900">Instagram Test Center</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Test Instagram authentication, session storage, and upload functionality 
            without leaving this page. All tests run in a popup window.
          </p>
        </div>

        {/* Test Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Authentication Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Instagram className="h-6 w-6 text-pink-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Authentication Test</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Test the complete Instagram OAuth flow including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-6">
              <li>• OAuth code exchange</li>
              <li>• Long-lived token generation</li>
              <li>• Instagram account detection</li>
              <li>• Session storage</li>
            </ul>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Authentication Test
            </button>
          </div>

          {/* Upload Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Test</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Test Instagram content publishing including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-6">
              <li>• Reel upload endpoint</li>
              <li>• Story upload endpoint</li>
              <li>• Session validation</li>
              <li>• Error handling</li>
            </ul>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Upload Test
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Instagram className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Popup Window</h3>
              <p className="text-sm text-gray-600">
                All tests run in a popup window without page navigation
              </p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Results</h3>
              <p className="text-sm text-gray-600">
                See session info, auth details, and test results instantly
              </p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Play className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Complete Flow</h3>
              <p className="text-sm text-gray-600">
                Test authentication, session storage, and upload in one flow
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">How to Use</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Click &quot;Start Authentication Test&quot; to open the popup</li>
            <li>2. Complete Instagram login in the popup window</li>
            <li>3. View session info and auth details in the popup</li>
            <li>4. Test upload functionality with the stored session</li>
            <li>5. Check sessions endpoint to verify storage</li>
          </ol>
        </div>
      </div>

      {/* Popup Component */}
      <InstagramTestPopup 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
      />
    </div>
  );
}
