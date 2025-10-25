'use client';

import InstagramTestComponent from '../components/InstagramTestComponent';
import RealInstagramTest from '../components/RealInstagramTest';

export default function TestInstagramPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Instagram Graph API Test Suite
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Test the Instagram Graph API integration following the approach from the{' '}
            <a 
              href="https://vdelacou.medium.com/posting-to-instagram-programmatically-cc69bf1effa8" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              Medium article
            </a>
            . This will help debug and verify the OAuth flow and API calls.
          </p>
        </div>
        
        <div className="space-y-8">
          <RealInstagramTest />
          <InstagramTestComponent />
        </div>
        
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="text-blue-500 hover:text-blue-600 underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
