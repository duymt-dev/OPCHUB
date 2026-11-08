import type { MetadataRoute } from 'next';
import { colors } from '@opchub/ui';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OPC Hub',
    short_name: 'OPC Hub',
    start_url: '/dashboard',
    display: 'standalone',
    lang: 'vi',
    theme_color: colors.primary,
    background_color: colors.pageBg,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
