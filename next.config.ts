import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Vercel: sem output standalone, sem serverExternalPackages
  // A Vercel gerencia o empacotamento e empacotamento nativo automaticamente
  turbopack: {},
}

export default nextConfig
