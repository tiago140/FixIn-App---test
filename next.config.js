/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // Páginas com link pessoal (chamados): não indexar, não vazar o endereço por "referrer" e não guardar em cache.
    const privado = [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    const geral = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    ];
    return [
      { source: '/:path*', headers: geral },
      { source: '/c/:path*', headers: privado },
      { source: '/api/chamados/externo/:path*', headers: privado },
    ];
  },
};

module.exports = nextConfig;
