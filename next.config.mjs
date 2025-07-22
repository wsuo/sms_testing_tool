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
        destination: 'https://wxapp.agrochainhub.com/admin-api/:path*',
      },
    ]
  },
}

export default nextConfig
