const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dmyxxnkqyzkvkxvpwild.supabase.co',
        pathname: '/storage/v1/object/public/expert-photos/**',
      },
    ],
  },
};

module.exports = nextConfig;
