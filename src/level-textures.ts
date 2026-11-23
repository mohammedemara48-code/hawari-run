// Call only after level display objects are destroyed. Keep shared art intact.
interface TextureCache {
  getTextureKeys(): string[];
  remove(key: string): unknown;
}
export function releaseLevelTextures(textures: TextureCache) {
  for (const key of textures.getTextureKeys())
    if (/^lvl\d+-(?:t|q)-\d+$/.test(key)) textures.remove(key);
}
