import { describe, expect, it } from 'vitest';
import {
  Color,
  createPropertyExpression,
  latest,
  validateStyleMin,
  type StylePropertySpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { buildGlobeStyle, COLORS, countryFill, countryLabelColor } from './globeStyle';
import type { CountryStatuses } from '../../domain/countryStatus';

/** Evaluates a colour expression for a country feature, the way MapLibre would. */
function colorFor(expression: unknown, iso: string): string {
  const parsed = createPropertyExpression(expression, 'paint.fill-color', latest.paint_fill['fill-color'] as StylePropertySpecification);
  if (parsed.result !== 'success') throw new Error(JSON.stringify(parsed.value));
  const feature = { type: 'Polygon', properties: { iso } } as never;
  return String(parsed.value.evaluate({ zoom: 2 }, feature));
}

const hex = (value: string) => String(Color.parse(value));

describe('globe style', () => {
  it('uses a white default land colour and different status colours', () => {
    expect(COLORS.land).toBe('#ffffff');
    expect(COLORS.visited).not.toBe(COLORS.wishlist);
    expect(COLORS.visited).not.toBe(COLORS.land);
    expect(COLORS.wishlist).not.toBe(COLORS.land);
  });

  it('is a valid MapLibre style with a globe projection and no remote tile sources', () => {
    const style = buildGlobeStyle('https://example.test/countries.geojson', 'https://example.test/labels.geojson');
    expect(validateStyleMin(style)).toEqual([]);
    expect(style.projection).toEqual({ type: 'globe' });
    expect(Object.values(style.sources).every((s) => s.type === 'geojson')).toBe(true);
    expect(style.layers.map((l) => l.id)).toEqual(['background', 'land', 'country-borders', 'ocean-labels', 'country-labels']);
  });

  it('paints countries green when visited, amber when wishlist-only and white otherwise', () => {
    const statuses: CountryStatuses = { visited: ['NO', 'ES'], wishlist: ['JP'] };
    const fill = countryFill(statuses);
    expect(colorFor(fill, 'NO')).toBe(hex(COLORS.visited));
    expect(colorFor(fill, 'ES')).toBe(hex(COLORS.visited));
    expect(colorFor(fill, 'JP')).toBe(hex(COLORS.wishlist));
    expect(colorFor(fill, 'FR')).toBe(hex(COLORS.land));
  });

  it('works with no destinations at all', () => {
    expect(colorFor(countryFill({ visited: [], wishlist: [] }), 'NO')).toBe(hex(COLORS.land));
  });

  it('tints labels to match their country', () => {
    const labels = countryLabelColor({ visited: ['NO'], wishlist: ['JP'] });
    expect(colorFor(labels, 'NO')).toBe(hex(COLORS.labelVisited));
    expect(colorFor(labels, 'JP')).toBe(hex(COLORS.labelWishlist));
    expect(colorFor(labels, 'FR')).toBe(hex(COLORS.label));
  });
});
