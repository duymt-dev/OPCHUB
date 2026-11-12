const locales = ['km', 'lo', 'my'];

function inspect(file, source) {
  const tags = [];
  for (const locale of locales) {
    const json = JSON.stringify({ locale }).slice(1, -1);
    const escaped = JSON.stringify(json).slice(1, -1);
    if (
      source.includes('intervalFormatTemplates') &&
      (source.includes(json) || source.includes(escaped))
    )
      tags.push(`${locale}-date`);
    if (
      source.includes('minimumGroupingDigits') &&
      source.includes(`locale:${JSON.stringify(locale)}`)
    )
      tags.push(`${locale}-number`);
  }
  if (!tags.length) return undefined;
  return { file, tags, locales: [...new Set(tags.map((tag) => tag.split('-')[0]))] };
}

/** Exact CLI classifier, with no source/result cache or asset suppression. */
export function classifyChunkPayloads(files, complete) {
  const assets = files.map(({ file, source }) => inspect(file, source)).filter(Boolean);
  const errors = assets
    .filter((asset) => asset.locales.length !== 1)
    .map((asset) => `mixed locale payload: ${asset.file}`);
  if (complete)
    for (const locale of locales)
      for (const kind of ['date', 'number']) {
        const tag = `${locale}-${kind}`;
        if (assets.filter((asset) => asset.tags.includes(tag)).length !== 1)
          errors.push(`missing/duplicate payload: ${tag}`);
      }
  return { assets, errors };
}
