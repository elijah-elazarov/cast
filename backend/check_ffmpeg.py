#!/usr/bin/env python3
"""
Check if FFmpeg is available on the system
"""

import subprocess
import sys

def check_ffmpeg():
    """Check if FFmpeg is installed and working"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, 
                              text=True, 
                              timeout=10)
        
        if result.returncode == 0:
            print("✅ FFmpeg is installed and working")
            print(f"Version: {result.stdout.split('ffmpeg version')[1].split()[0]}")
            return True
        else:
            print("❌ FFmpeg command failed")
            print(f"Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ FFmpeg check timed out")
        return False
    except FileNotFoundError:
        print("❌ FFmpeg not found in PATH")
        return False
    except Exception as e:
        print(f"❌ Error checking FFmpeg: {e}")
        return False

if __name__ == "__main__":
    print("Checking FFmpeg installation...")
    success = check_ffmpeg()
    sys.exit(0 if success else 1)
