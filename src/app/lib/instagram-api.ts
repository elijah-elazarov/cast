/**
 * Instagram API Utilities
 * Contains validation functions for Instagram content
 */

export class InstagramAPI {
  /**
   * Validate video file meets Instagram requirements
   */
  static validateVideoFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file type
    if (!file.type.startsWith('video/')) {
      errors.push('File must be a video');
    }

    // Check file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      errors.push('File size must be less than 100MB');
    }

    // Check file extension
    const allowedExtensions = ['.mp4', '.mov'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('File must be MP4 or MOV format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
