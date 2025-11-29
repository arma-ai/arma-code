/** @type {import('next').NextConfig} */
const nextConfig = {
  // Увеличиваем лимит размера тела запроса для загрузки файлов (50 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;

