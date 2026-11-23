import { describe, expect, it } from 'vitest';
import { addLandmarkMusic } from '../src/landmark-music';
import type { Track } from '../src/audio';
describe('original landmark score', () => {
  const tracks: Track[] = [];
  addLandmarkMusic(tracks);
  it('gives all12levels and3bosses different melodies and names', () => {
    expect(tracks).toHaveLength(15);
    expect(new Set(tracks.map((t) => t.name)).size).toBe(15);
    expect(new Set(tracks.map((t) => JSON.stringify(t.melody))).size).toBe(15);
    expect(tracks.filter((t) => t.boss)).toHaveLength(3);
  });
  it('keeps each world musical color in its boss theme', () => {
    for (let group = 0; group < 3; group++) {
      const level = tracks[group * 4],
        boss = tracks[12 + group];
      expect(boss.maqam).toBe(level.maqam);
      expect(boss.timbre).toBe(level.timbre);
      expect(boss.bpm).toBeGreaterThan(level.bpm);
    }
  });
});
