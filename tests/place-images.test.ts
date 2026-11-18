import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { play } from '../src/data/site';

// A place's photo is shown at three sizes. The card and the thumbnail are cropped
// by hand, so nothing makes them: this catches a new place that is missing one.
describe('place photos', () => {
  const withPhoto = play.places.filter((p) => p.photo);

  it.each(withPhoto.map((p) => [p.city, p.photo!] as const))('%s has its photo, card and thumbnail', (_city, photo) => {
    const sizes = [photo, photo.replace('/assets/places/', '/assets/places/cards/'), photo.replace('/assets/places/', '/assets/places/thumbs/')];
    const missing = sizes.filter((src) => !existsSync(`public${src}`));
    expect(missing).toEqual([]);
  });
});
