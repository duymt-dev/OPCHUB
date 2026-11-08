import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { colors } from '@opchub/ui';
import { fetchPublicStore, fetchStoreOgLogo } from '@/lib/server-api';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'OPC Hub';
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await fetchPublicStore(slug);
  if (!store) return new Response(null, { status: 404 });
  const [font, logo] = await Promise.all([
    readFile(join(process.cwd(), 'src/assets/fonts/NotoSans-Regular.ttf')),
    fetchStoreOgLogo(slug),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 72,
        background: colors.primaryBg,
        color: colors.text,
        fontFamily: 'Noto Sans',
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori renders raw image bytes, not a DOM Next Image.
        <img
          src={logo}
          width={96}
          height={96}
          alt=""
          style={{ objectFit: 'contain', marginBottom: 24 }}
        />
      ) : null}
      <div style={{ display: 'flex', fontSize: 56, lineHeight: 1.2 }}>
        {store.name.slice(0, 60)}
      </div>
      <div style={{ display: 'flex', fontSize: 30, marginTop: 28 }}>
        {[store.field, store.province].filter(Boolean).join(' · ')}
      </div>
      <div style={{ display: 'flex', fontSize: 26, marginTop: 40, color: colors.primary }}>
        opchub.community
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Noto Sans', data: font, weight: 400, style: 'normal' }] },
  );
}
