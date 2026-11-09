import renderImage from '../opengraph-image';

/** Next16 hashes metadata-image routes. Keep the documented share URL stable across builds. */
export function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return renderImage({ params });
}
