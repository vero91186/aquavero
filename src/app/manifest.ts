import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AquaTrack AI',
    short_name: 'AquaTrack',
    description: 'Le suivi de ton aquarium : paramètres, population, matériel et conseils.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f2a22',
    theme_color: '#0f2a22',
    lang: 'fr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
