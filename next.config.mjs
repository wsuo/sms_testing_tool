/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/admin-api/:path*',
        destination: 'http://your-admin-backend.com/admin-api/:path*', // Replace with your actual backend URL
      },
    ]
  },
}

export default nextConfig
