'use client';

import { useState, useRef } from 'react';
import { Upload, Video, X, Send, AlertCircle } from 'lucide-react';
import { InstagramAPI } from '../lib/instagram-api';

interface VideoUploaderProps {
  connectedAccounts: {
    instagram: boolean;
    youtube: boolean;
    tiktok: boolean;
  };
}

export default function VideoUploader({ connectedAccounts }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Use Instagram API validation
      const validation = InstagramAPI.validateVideoFile(file);
      
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Use Instagram API validation
      const validation = InstagramAPI.validateVideoFile(file);
      
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const uploadPromises = [];

      // Upload to Instagram if connected
      if (connectedAccounts.instagram) {
        const accountType = localStorage.getItem('instagram_account_type');
        const accountInfoStr = localStorage.getItem('instagram_account_info');
        
        // Try to get user_id from account_info first (for Graph API)
        let instagramUserId = null;
        if (accountInfoStr) {
          try {
            const accountInfo = JSON.parse(accountInfoStr);
            instagramUserId = accountInfo.user_id || accountInfo.userId;
          } catch (e) {
            console.error('Failed to parse account_info:', e);
          }
        }
        
        // Fallback to old localStorage key
        if (!instagramUserId) {
          instagramUserId = localStorage.getItem('instagram_user_id');
        }
        
        if (instagramUserId) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('caption', caption);
          formData.append('user_id', instagramUserId);

          // Use Graph API endpoint for new connections, fallback to old endpoint
          const endpoint = accountType === 'graph' ? '/api/instagram/graph/upload-reel' : '/api/instagram/upload-reel';
          
          uploadPromises.push(
            fetch(endpoint, {
              method: 'POST',
              headers: {
                'ngrok-skip-browser-warning': 'true',
              },
              body: formData,
            }).then(async (res) => {
              const data = await res.json();
              return { platform: 'Instagram', success: data.success, data };
            })
          );
        }
      }

      // Upload to YouTube if connected
      if (connectedAccounts.youtube) {
        const youtubeUserId = localStorage.getItem('youtube_user_id');
        console.log('YouTube upload - user_id from localStorage:', youtubeUserId);
        if (youtubeUserId) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('title', caption || 'My YouTube Short');
          formData.append('description', caption);
          formData.append('user_id', youtubeUserId);

          uploadPromises.push(
            fetch('/api/youtube/upload-short', {
              method: 'POST',
              headers: {
                'ngrok-skip-browser-warning': 'true',
              },
              body: formData,
            }).then(async (res) => {
              const data = await res.json();
              return { platform: 'YouTube', success: data.success, data };
            }).catch(async (err) => {
              console.error('YouTube upload error:', err);
              return { platform: 'YouTube', success: false, error: err.message };
            })
          );
        } else {
          console.error('YouTube user_id not found in localStorage');
        }
      }

      // Upload to TikTok if connected
      if (connectedAccounts.tiktok) {
        const tiktokUserId = localStorage.getItem('tiktok_user_id');
        console.log('TikTok upload - user_id from localStorage:', tiktokUserId);
        if (tiktokUserId) {
          // Prefer Cloudinary processing like YouTube flow
          try {
            const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_TIKTOK;

            let processedUrl: string | null = null;
            if (CLOUD_NAME && UPLOAD_PRESET) {
              // Upload original to Cloudinary
              const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
              const cloudForm = new FormData();
              cloudForm.append('file', selectedFile);
              cloudForm.append('upload_preset', UPLOAD_PRESET);
              const vRes = await fetch(uploadUrl, { method: 'POST', body: cloudForm });
              const vJson = await vRes.json();
              if (!vRes.ok) throw new Error(`Cloudinary upload failed: ${JSON.stringify(vJson)}`);
              // TikTok vertical transform (1080x1920)
              processedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_1080,h_1920,f_mp4,q_auto:best/${vJson.public_id}.mp4`;
            }

            const formData = new FormData();
            if (processedUrl) {
              formData.append('video_url', processedUrl);
            } else {
              formData.append('video', selectedFile);
            }
            formData.append('title', caption || 'My TikTok Video');
            formData.append('description', caption);
            formData.append('user_id', tiktokUserId);

            uploadPromises.push(
              fetch('/api/tiktok/upload-video', {
                method: 'POST',
                headers: {
                  'ngrok-skip-browser-warning': 'true',
                },
                body: formData,
              }).then(async (res) => {
                const data = await res.json();
                return { platform: 'TikTok', success: data.success, data };
              }).catch(async (err) => {
                console.error('TikTok upload error:', err);
                return { platform: 'TikTok', success: false, error: err.message };
              })
            );
          } catch (e) {
            console.error('Cloudinary pre-processing for TikTok failed, falling back to raw upload:', e);
            const formData = new FormData();
            formData.append('video', selectedFile);
            formData.append('title', caption || 'My TikTok Video');
            formData.append('description', caption);
            formData.append('user_id', tiktokUserId);
            uploadPromises.push(
              fetch('/api/tiktok/upload-video', {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' },
                body: formData,
              }).then(async (res) => {
                const data = await res.json();
                return { platform: 'TikTok', success: data.success, data };
              }).catch(async (err) => {
                console.error('TikTok upload error:', err);
                return { platform: 'TikTok', success: false, error: err.message };
              })
            );
          }
        } else {
          console.error('TikTok user_id not found in localStorage');
        }
      }

      if (uploadPromises.length === 0) {
        setError('No platform connected. Please connect at least one account.');
        setIsUploading(false);
        return;
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Process results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        const platforms = successful.map(r => r.platform).join(' and ');
        setSuccess(`Video uploaded successfully to ${platforms}!`);
      }

      if (failed.length > 0) {
        const platforms = failed.map(r => r.platform).join(' and ');
        setError(`Failed to upload to ${platforms}.`);
      }

      setIsUploading(false);
      setSelectedFile(null);
      setCaption('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('[Upload] Exception caught:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Video className="w-12 h-12 text-purple-500" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{selectedFile.type || 'video/mp4'}</span>
                  <span>•</span>
                  <span>{selectedFile.lastModified ? new Date(selectedFile.lastModified).toLocaleDateString() : 'Unknown date'}</span>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Drop your video here
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  or click to browse files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && selectedFile && (
          <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>Uploading {selectedFile.name}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatFileSize(selectedFile.size)}</span>
              <span>{selectedFile.type || 'video/mp4'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Caption Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Caption (optional)
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption for your Reel..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          rows={3}
          maxLength={2200}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {caption.length}/2200 characters
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Send className="w-5 h-5 text-green-500 mr-2" />
          <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Uploading...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {(() => {
              const platforms = [];
              if (connectedAccounts.instagram) platforms.push('Instagram');
              if (connectedAccounts.youtube) platforms.push('YouTube');
              if (connectedAccounts.tiktok) platforms.push('TikTok');
              
              if (platforms.length === 0) return 'Upload';
              if (platforms.length === 1) return `Upload to ${platforms[0]}`;
              if (platforms.length === 2) return `Upload to ${platforms.join(' & ')}`;
              return 'Upload to All Platforms';
            })()}
          </>
        )}
      </button>

      {/* Requirements */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          Video Requirements:
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Format: MP4 or MOV</li>
          <li>• Max file size: 100MB</li>
          <li>• Max duration: 90 seconds</li>
          <li>• Recommended aspect ratio: 9:16</li>
          <li>• Max resolution: 1920x1080</li>
        </ul>
      </div>
    </div>
  );
}
