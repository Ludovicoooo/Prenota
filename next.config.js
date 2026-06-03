// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  
  reactStrictMode: process.env.NODE_ENV !== 'production',
  
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  experimental: {
    forceSwcTransforms: true,
  },
};

module.exports = nextConfig;