import type { Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';

export async function csvDownload(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) throw new Error('CSV download has no local file');
  return readFile(path, 'utf8');
}
