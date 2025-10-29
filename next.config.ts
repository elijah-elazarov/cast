import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube channel thumbnails
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // TikTok avatars (common CDNs)
      { protocol: "https", hostname: "p16-sign-va.tiktokcdn.com" },
      { protocol: "https", hostname: "p16-amd-va.tiktokcdn.com" },
      { protocol: "https", hostname: "p16.tiktokcdn.com" },
      // Instagram/Facebook profile images
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "scontent-**.cdninstagram.com" as unknown as string },
      // Cloudinary assets used across the app
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
