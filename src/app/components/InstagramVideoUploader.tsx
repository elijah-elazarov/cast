'use client';

import { useState } from 'react';
import { Upload, Instagram, Loader2, Check, AlertTriangle, Video, Image } from 'lucide-react';

interface AccountInfo {
  user_id: string;
  username: string;
  followers_count: number;
  media_count: number;
  profile_picture_url?: string;
  account_type: string;
}

interface InstagramVideoUploaderProps {
  isConnected: boolean;
  accountInfo?: AccountInfo;
}

export default function InstagramVideoUploader({ isConnected, accountInfo }: InstagramVideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadType, setUploadType] = useState<'reel' | 'story'>('reel');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };


  const handleUpload = async () => {
    if (!selectedFile || !isConnected || !accountInfo) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadMessage('Uploading video to Instagram...');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption);
      formData.append('user_id', accountInfo.user_id);

      // Upload directly to Instagram (no cloud storage needed)
      const response = await fetch(`/api/instagram/graph/upload-${uploadType}`, {
        method: 'POST',
        body: formData, // FormData automatically sets Content-Type to multipart/form-data
      });

      const data = await response.json();

      if (data.success) {
        setUploadStatus('success');
        setUploadMessage(`${uploadType === 'reel' ? 'Reel' : 'Story'} published successfully!`);
        
        // Reset form
        setSelectedFile(null);
        setCaption('');
        (document.getElementById('file-input') as HTMLInputElement).value = '';
      } else {
        throw new Error(data.detail || 'Failed to publish to Instagram');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
              <div className="h-12 w-12 text-gray-400 mx-auto mb-4 flex items-center justify-center">
                <Instagram className="h-12 w-12" />
              </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Instagram First</h3>
        <p className="text-gray-600">Please connect your Instagram account to upload content.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Instagram className="h-6 w-6 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Upload to Instagram</h3>
      </div>

      <div className="space-y-4">
        {/* Upload Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setUploadType('reel')}
              className={`flex items-center px-4 py-2 rounded-lg border ${
                uploadType === 'reel'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Video className="h-4 w-4 mr-2" />
              Reel
            </button>
            <button
              onClick={() => setUploadType('story')}
              className={`flex items-center px-4 py-2 rounded-lg border ${
                uploadType === 'story'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className="h-4 w-4 mr-2" />
              Story
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Video</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              id="file-input"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select video file'}
              </span>
            </label>
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={`Add a caption for your ${uploadType}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Upload Status */}
        {uploadStatus !== 'idle' && (
          <div className={`p-3 rounded-lg ${
            uploadStatus === 'success' ? 'bg-green-50 border border-green-200' :
            uploadStatus === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              {uploadStatus === 'success' && <Check className="h-5 w-5 text-green-600 mr-2" />}
              {uploadStatus === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />}
              {uploadStatus === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />}
              <span className={`text-sm ${
                uploadStatus === 'success' ? 'text-green-800' :
                uploadStatus === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {uploadMessage}
              </span>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <Instagram className="h-5 w-5" />
              <span>Publish {uploadType === 'reel' ? 'Reel' : 'Story'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
