export interface ChunkSource {
  file: string;
  source: string;
}
export function classifyChunkPayloads(
  files: readonly ChunkSource[],
  complete: boolean,
): {
  assets: { file: string; tags: string[]; locales: string[] }[];
  errors: string[];
};
