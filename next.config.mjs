/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Suppress webpack cache serialization warnings in development
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: 'error',
      }
    }
    return config
  },
}

export default nextConfig
