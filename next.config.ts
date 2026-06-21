import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Roda como servidor Node.js persistente (Hostinger, Railway, EasyPanel, etc.)
  // NÃO usar output: 'export' — o app tem rotas de API dinâmicas
  output: 'standalone',

  // Módulos nativos que não devem ser empacotados pelo bundler
  serverExternalPackages: ['sharp', 'opentype.js'],

  // Turbopack config vazio para silenciar aviso de webpack
  turbopack: {},

  // Desabilita verificação de imagem de domínios externos no <Image>
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
