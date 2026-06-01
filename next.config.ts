/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ottimizzazioni per Vercel
  output: 'standalone',
  // Silenzia warning sui lockfile
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
