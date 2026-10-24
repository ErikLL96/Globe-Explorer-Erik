import type { FeatureCollection, Point } from 'geojson';
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import type { CountryStatuses } from '../../domain/countryStatus';

/**
 * Globe Explorer's own MapLibre style: a clean, white travel atlas.
 *
 * Everything geographic comes from bundled Natural Earth data — country polygons and
 * one hand-placed label point per country — so there are no terrain, road or place
 * layers to compete with the travel colours. Only the label font glyphs are fetched
 * (from OpenFreeMap); if they fail the map still works, just without names.
 */
export const COLORS = {
  // White land on a very pale ocean makes status-filled countries stand out.
  ocean: '#eef4f8',
  land: '#ffffff',
  border: '#bac7d2',
  // Distinct status colours: green for visited, amber for wishlist.
  visited: '#43be8b',
  wishlist: '#ffbd6a',
  label: '#415368',
  labelVisited: '#0c6746',
  labelWishlist: '#8c470d',
  labelHalo: 'rgba(255, 255, 255, 0.9)',
  oceanLabel: '#6e90aa',
  oceanLabelHalo: 'rgba(255, 255, 255, 0.9)',
};

const OPENFREEMAP = 'https://tiles.openfreemap.org';
export const NE_ATTRIBUTION =
  '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>';
const FONT_ATTRIBUTION =
  'Labels: Noto Sans via <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>';

/** Deepest zoom: the 1:50m country shapes look coarse beyond this. */
export const MAX_ZOOM = 7;

/** Approximate ocean label positions (well-known geography, not user data). */
const OCEANS: [name: string, lng: number, lat: number][] = [
  ['North Atlantic Ocean', -40, 33],
  ['South Atlantic Ocean', -15, -24],
  ['North Pacific Ocean', -150, 30],
  ['South Pacific Ocean', -125, -28],
  ['Indian Ocean', 78, -18],
  ['Arctic Ocean', 0, 84],
  ['Southern Ocean', 60, -60],
];

const oceanLabels: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: OCEANS.map(([name, lng, lat]) => ({
    type: 'Feature',
    properties: { name },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  })),
};

/**
 * A colour per country status: visited wins over wishlist, everything else is neutral.
 * Matches the `iso` property of the country polygons and label points.
 */
export function statusColor(
  statuses: CountryStatuses,
  colors: { visited: string; wishlist: string; none: string },
): ExpressionSpecification {
  return [
    'case',
    ['in', ['get', 'iso'], ['literal', [...statuses.visited]]], colors.visited,
    ['in', ['get', 'iso'], ['literal', [...statuses.wishlist]]], colors.wishlist,
    colors.none,
  ];
}

export function countryFill(statuses: CountryStatuses): ExpressionSpecification {
  return statusColor(statuses, { visited: COLORS.visited, wishlist: COLORS.wishlist, none: COLORS.land });
}

export function countryLabelColor(statuses: CountryStatuses): ExpressionSpecification {
  return statusColor(statuses, { visited: COLORS.labelVisited, wishlist: COLORS.labelWishlist, none: COLORS.label });
}

const NO_STATUS: CountryStatuses = { visited: [], wishlist: [] };

export function buildGlobeStyle(countriesUrl: string, labelsUrl: string): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: `${OPENFREEMAP}/fonts/{fontstack}/{range}.pbf`,
    // A neutral off-white atmosphere matches the new minimalist map.
    sky: {
      'sky-color': '#f6f9fc',
      'horizon-color': '#ffffff',
      'fog-color': '#ffffff',
      'sky-horizon-blend': 0.5,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.95,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.75, 4, 0.4, 6, 0],
    },
    sources: {
      countries: { type: 'geojson', data: countriesUrl, attribution: NE_ATTRIBUTION },
      'country-labels': { type: 'geojson', data: labelsUrl, attribution: FONT_ATTRIBUTION },
      'ocean-labels': { type: 'geojson', data: oceanLabels },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': COLORS.ocean } },
      // Every country, coloured by travel status (updated from the destinations at runtime).
      { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': countryFill(NO_STATUS) } },
      {
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': COLORS.border,
          'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 3, 0.75, 7, 1.3],
        },
      },
      {
        id: 'ocean-labels',
        type: 'symbol',
        source: 'ocean-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Italic'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 11, 4, 15],
          'text-letter-spacing': 0.18,
          'text-line-height': 1.35,
          'text-max-width': 6,
        },
        paint: {
          'text-color': COLORS.oceanLabel,
          'text-halo-color': COLORS.oceanLabelHalo,
          'text-halo-width': 1,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 1, 5, 0],
        },
      },
      {
        id: 'country-labels',
        type: 'symbol',
        source: 'country-labels',
        // Natural Earth label rank: large countries first, smaller ones as you zoom in.
        filter: ['<=', ['get', 'rank'], ['step', ['zoom'], 2, 1.4, 3, 2.6, 4, 3.4, 5, 4.2, 10]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9.5, 2, 11, 4, 13, 6, 14.5],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.08,
          'text-max-width': 7,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: {
          'text-color': countryLabelColor(NO_STATUS),
          'text-halo-color': COLORS.labelHalo,
          'text-halo-width': 1.2,
        },
      },
    ],
  };
}
