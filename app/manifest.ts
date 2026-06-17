import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bloom — Cycle Companion',
    short_name: 'Bloom',
    description: 'Your intelligent cycle companion — track periods, symptoms, and get personalized insights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#2D0F3D',
    theme_color: '#6E3482',
    orientation: 'portrait',
    categories: ['health', 'lifestyle', 'medical'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
