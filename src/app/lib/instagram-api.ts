/**
 * Instagram API Utilities
 * Contains validation functions for Instagram content
 */

export class InstagramAPI {
  /**
   * Validate video file meets Instagram requirements
   * Based on Instagram Graph API specifications
   */
  static validateVideoFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file type
    if (!file.type.startsWith('video/')) {
      errors.push('File must be a video');
    }

    // Check file size (Instagram allows up to 100MB, but we limit to 4MB for Vercel)
    if (file.size > 4 * 1024 * 1024) {
      errors.push('File size must be less than 4MB (due to server limits)');
    }

    // Check file extension (Instagram supports MOV and MP4)
    const allowedExtensions = ['.mp4', '.mov'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('File must be MP4 or MOV format (Instagram requirement)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get Instagram video requirements info
   */
  static getVideoRequirements(): string[] {
    return [
      'Format: MP4 or MOV',
      'Duration: 3-60 seconds',
      'Aspect Ratio: 4:5 to 1.91:1',
      'Frame Rate: 23-60 FPS',
      'Audio: AAC codec, max 48kHz',
      'Video: H.264 or HEVC codec',
      'File Size: Up to 4MB (server limit)',
      'Account: Business or Creator only'
    ];
  }
}
