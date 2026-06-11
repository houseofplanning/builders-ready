import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Builders Ready',
    short_name: 'Builders Ready',
    description: 'The client portal for UK builders.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F6F7',
    theme_color: '#0F4C5C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
