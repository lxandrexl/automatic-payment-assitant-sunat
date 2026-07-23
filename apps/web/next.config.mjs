/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone solo en el build de Docker (Linux); en Windows local los symlinks
  // que genera fallan con EPERM. El Dockerfile setea NEXT_STANDALONE=1.
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  transpilePackages: ['@tributo/core'],
};

export default nextConfig;
