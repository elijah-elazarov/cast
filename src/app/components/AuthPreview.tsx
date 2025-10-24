'use client';

import { useState } from 'react';
import { Facebook, Instagram, Shield, Lock, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthPreviewProps {
  method: 'meta' | 'direct';
}

export default function AuthPreview({ method }: AuthPreviewProps) {
  const [currentPreview, setCurrentPreview] = useState(0);

  if (method === 'meta') {
    const metaSteps = [
      {
        title: 'Facebook Login',
        description: 'You\'ll see Facebook\'s official login page',
        component: (
          <div className="relative">
            {/* Simulated Facebook Login UI */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-lg">
              {/* Facebook Header */}
              <div className="text-center mb-6">
                <Facebook className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900">Log in to Facebook</h3>
                <p className="text-sm text-gray-600 mt-1">to continue to Cast</p>
              </div>

              {/* Mock Form Fields */}
              <div className="space-y-3">
                <div className="border border-gray-300 rounded px-3 py-2.5 bg-gray-50">
                  <span className="text-sm text-gray-400">Email or phone number</span>
                </div>
                <div className="border border-gray-300 rounded px-3 py-2.5 bg-gray-50">
                  <span className="text-sm text-gray-400">Password</span>
                </div>
                <button className="w-full bg-blue-600 text-white rounded-md py-2.5 font-semibold text-sm">
                  Log In
                </button>
              </div>

              {/* Footer */}
              <div className="text-center mt-4">
                <a className="text-xs text-blue-600">Forgot password?</a>
              </div>
            </div>

            {/* "Actual Facebook UI" badge */}
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Official Facebook</span>
            </div>
          </div>
        )
      },
      {
        title: 'Authorize Cast',
        description: 'Grant Cast permission to post on your behalf',
        component: (
          <div className="relative">
            {/* Simulated Facebook OAuth Permissions UI */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-lg">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <Facebook className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl">→</span>
                  <Instagram className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Cast</h3>
                <p className="text-sm text-gray-600">wants to access your Instagram Business account</p>
              </div>

              {/* Permissions List */}
              <div className="space-y-2 my-4">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Post Reels to Instagram</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Access basic account info</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Manage Instagram content</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-2 mt-4">
                <button className="w-full bg-blue-600 text-white rounded-md py-2.5 font-semibold text-sm">
                  Continue as Your Name
                </button>
                <button className="w-full border border-gray-300 text-gray-700 rounded-md py-2.5 font-semibold text-sm">
                  Cancel
                </button>
              </div>
            </div>

            {/* "Actual Facebook UI" badge */}
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Official OAuth</span>
            </div>
          </div>
        )
      },
      {
        title: 'Connected!',
        description: 'Redirected back to Cast - no passwords stored',
        component: (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Securely Connected!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your Instagram Business account is now linked via Meta OAuth
            </p>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-xs">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900">No passwords stored by Cast</span>
            </div>
          </div>
        )
      }
    ];

    return (
      <div className="space-y-4">
        {/* Preview Window */}
        <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
          {metaSteps[currentPreview].component}
        </div>

        {/* Step Info */}
        <div className="text-center">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
            Step {currentPreview + 1}: {metaSteps[currentPreview].title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {metaSteps[currentPreview].description}
          </p>
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center gap-2">
          {metaSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPreview(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentPreview
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Direct Login Preview
  console.log('Setting up directSteps array');
  
  const directSteps = [
    {
      title: 'Instagram Login Form',
      description: 'Native Instagram authentication via our secure backend',
      component: (
        <div className="relative">
          {/* DEBUG: Visible indicator */}
          <div className="absolute top-0 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded">
            Direct Login Preview
          </div>
          
          {/* Simulated Instagram-style Login UI */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 shadow-lg max-w-sm mx-auto">
            {/* Instagram Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ 
                background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                padding: '8px'
              }}>
                <Instagram className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Cast</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Powered by Instagram Auth</p>
            </div>

            {/* Mock Form Fields */}
            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Username or email"
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 text-sm bg-gray-50"
                  disabled
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2.5 text-sm bg-gray-50"
                  disabled
                />
              </div>
              <button 
                className="w-full text-white rounded-md py-2.5 font-semibold text-sm"
                style={{ background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}
                disabled
              >
                Log In
              </button>
            </div>
          </div>

          {/* "Handled by Instagram" badge */}
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Instagram Auth</span>
          </div>
        </div>
      )
    },
    {
      title: '2FA (If Enabled)',
      description: 'Instagram\'s own 2FA verification - all edge cases handled',
      component: (
        <div className="relative">
          {/* Simulated 2FA UI */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-lg max-w-sm mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mt-2">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* Mock 2FA Input */}
            <div className="flex gap-2 justify-center mb-4">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="w-10 h-12 border-2 border-purple-300 rounded-md bg-purple-50 flex items-center justify-center">
                  <span className="text-gray-400 font-mono text-lg">•</span>
                </div>
              ))}
            </div>

            {/* Additional Options */}
            <div className="space-y-2 text-center text-xs text-gray-600">
              <p>Didn&apos;t receive a code?</p>
              <div className="flex justify-center gap-4">
                <button className="text-purple-600 font-medium">Request new code</button>
                <button className="text-purple-600 font-medium">Use backup codes</button>
              </div>
            </div>
          </div>

          {/* Edge cases badge */}
          <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>All cases handled</span>
          </div>
        </div>
      )
    },
    {
      title: 'Secure Connection',
      description: 'Behind the scenes: Instagram validates everything',
      component: (
        <div className="space-y-4">
          {/* Security Features List */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 p-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Instagram Handles Everything:
            </h4>
            <div className="space-y-2">
              {[
                'Challenge responses (CAPTCHA, etc.)',
                'Suspicious login checks',
                'Phone number verification',
                'Email confirmations',
                'Rate limiting',
                'Device recognition',
                'Account security flags',
                'Session management'
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-purple-900 dark:text-purple-200">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Success State */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6 text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Connected Securely!</h3>
            <p className="text-xs text-gray-600">
              Instagram authenticated your account - ready to post
            </p>
          </div>
        </div>
      )
    }
  ];

  console.log('Returning direct login preview, currentPreview:', currentPreview);
  
  return (
    <div className="space-y-4">
      {/* DEBUG: Visible wrapper */}
      <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded text-center text-xs font-bold">
        DIRECT LOGIN AUTH PREVIEW (Step {currentPreview + 1} of {directSteps.length})
      </div>
      
      {/* Preview Window */}
      <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 min-h-[450px] flex items-center justify-center">
        {directSteps[currentPreview].component}
      </div>

      {/* Step Info */}
      <div className="text-center">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
          Step {currentPreview + 1}: {directSteps[currentPreview].title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {directSteps[currentPreview].description}
        </p>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2">
        {directSteps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPreview(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentPreview
                ? 'w-8 bg-gradient-to-r from-purple-600 to-pink-600'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      {/* Important Note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-900 dark:text-amber-200">
          <strong>Why this is reliable:</strong> We use Instagram&apos;s official authentication library, 
          so ALL Instagram auth edge cases (2FA, challenges, verifications) are automatically handled. 
          You see our UI, but Instagram does the authentication.
        </div>
      </div>
    </div>
  );
}

