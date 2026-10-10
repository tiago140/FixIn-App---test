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
    return [
      { source: '/c/:path*', headers: privado },
      { source: '/api/chamados/externo/:path*', headers: privado },
    ];
  },
};

module.exports = nextConfig;
