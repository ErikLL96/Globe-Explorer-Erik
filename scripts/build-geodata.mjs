/**
 * Builds the geographic data bundled with Globe Explorer.
 *
 *   node scripts/build-geodata.mjs [countries.geojson] [populated_places.geojson]
 *
 * Without arguments the two Natural Earth source files are downloaded from the
 * official natural-earth-vector repository (public domain data).
 *
 * Outputs:
 *   public/data/countries.geojson  – 1:50m country polygons, trimmed to { iso, name }
 *   public/data/country-labels.geojson – one label point per country (Natural Earth's
 *                                    hand-placed LABEL_X/LABEL_Y), with its label rank
 *   src/data/cities.generated.json – curated cities with coordinates taken from
 *                                    Natural Earth populated places (never hand-typed)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const COUNTRIES_URL = `${NE_BASE}/ne_50m_admin_0_countries.geojson`;
const PLACES_URL = `${NE_BASE}/ne_10m_populated_places_simple.geojson`;

/**
 * Curated destinations: [display name, ISO 3166-1 alpha-2, Natural Earth name if it differs].
 * Coordinates are looked up in Natural Earth; the build fails if a city is not found.
 */
const CURATED = [
  // Europe
  ['Oslo', 'NO'], ['Bergen', 'NO'], ['Tromsø', 'NO', 'Tromso'], ['Stockholm', 'SE'],
  ['Copenhagen', 'DK', 'Kobenhavn'], ['Helsinki', 'FI'], ['Reykjavík', 'IS', 'Reykjavik'],
  ['London', 'GB'], ['Edinburgh', 'GB'], ['Dublin', 'IE'], ['Paris', 'FR'], ['Nice', 'FR'],
  ['Amsterdam', 'NL'], ['Brussels', 'BE'], ['Berlin', 'DE'], ['Munich', 'DE'],
  ['Vienna', 'AT'], ['Zürich', 'CH', 'Zurich'], ['Prague', 'CZ'], ['Budapest', 'HU'],
  ['Kraków', 'PL', 'Krakow'], ['Warsaw', 'PL'], ['Rome', 'IT'], ['Florence', 'IT'],
  ['Venice', 'IT'], ['Barcelona', 'ES'], ['Madrid', 'ES'], ['Seville', 'ES'],
  ['Córdoba', 'ES', 'Cordoba'], ['Lisbon', 'PT'], ['Porto', 'PT'], ['Athens', 'GR'],
  ['Split', 'HR'], ['Dubrovnik', 'HR'], ['Istanbul', 'TR'], ['Tallinn', 'EE'], ['Riga', 'LV'],
  ['Valletta', 'MT'], ['Kyiv', 'UA', 'Kiev'],
  // Asia
  ['Tokyo', 'JP'], ['Kyoto', 'JP'], ['Osaka', 'JP'], ['Seoul', 'KR'], ['Beijing', 'CN'],
  ['Shanghai', 'CN'], ['Hong Kong', 'HK'], ['Bangkok', 'TH'], ['Chiang Mai', 'TH'],
  ['Hanoi', 'VN'], ['Ho Chi Minh City', 'VN'], ['Siem Reap', 'KH'], ['Singapore', 'SG'],
  ['Kuala Lumpur', 'MY'], ['Denpasar', 'ID'], ['Jakarta', 'ID'], ['Manila', 'PH'],
  ['Mumbai', 'IN'], ['New Delhi', 'IN'], ['Jaipur', 'IN'], ['Kathmandu', 'NP'],
  ['Colombo', 'LK'], ['Malé', 'MV', 'Male'], ['Dubai', 'AE'], ['Abu Dhabi', 'AE'],
  ['Doha', 'QA'], ['Amman', 'JO'], ['Tbilisi', 'GE'], ['Almaty', 'KZ'],
  ['Samarkand', 'UZ'], ['Ulaanbaatar', 'MN'],
  // Africa
  ['Cairo', 'EG'], ['Marrakesh', 'MA'], ['Tunis', 'TN'], ['Cape Town', 'ZA'],
  ['Johannesburg', 'ZA'], ['Nairobi', 'KE'], ['Zanzibar', 'TZ'], ['Dar es Salaam', 'TZ'],
  ['Accra', 'GH'], ['Lagos', 'NG'], ['Dakar', 'SN'], ['Addis Ababa', 'ET'], ['Kigali', 'RW'],
  ['Windhoek', 'NA'], ['Antananarivo', 'MG'], ['Port Louis', 'MU'],
  // North & Central America, Caribbean
  ['New York', 'US'], ['San Francisco', 'US'], ['Los Angeles', 'US'], ['Chicago', 'US'],
  ['Miami', 'US'], ['New Orleans', 'US'], ['Seattle', 'US'], ['Honolulu', 'US'],
  ['Anchorage', 'US'], ['San Jose', 'US'], ['Toronto', 'CA'], ['Vancouver', 'CA'],
  ['Montréal', 'CA', 'Montreal'], ['Québec City', 'CA', 'Quebec'], ['Mexico City', 'MX'],
  ['Cancún', 'MX', 'Cancun'], ['Oaxaca', 'MX'], ['Havana', 'CU'], ['San Juan', 'PR'],
  ['Panama City', 'PA'], ['San José', 'CR', 'San Jose'],
  // South America
  ['Bogotá', 'CO', 'Bogota'], ['Cartagena', 'CO'], ['Medellín', 'CO', 'Medellin'],
  ['Quito', 'EC'], ['Lima', 'PE'], ['Cusco', 'PE', 'Cusco'], ['La Paz', 'BO'],
  ['Santiago', 'CL'], ['Buenos Aires', 'AR'], ['Córdoba', 'AR', 'Cordoba'],
  ['Ushuaia', 'AR'], ['Rio de Janeiro', 'BR'], ['São Paulo', 'BR', 'Sao Paulo'],
  ['Montevideo', 'UY'],
  // Oceania (several near the international date line)
  ['Sydney', 'AU'], ['Melbourne', 'AU'], ['Perth', 'AU'], ['Cairns', 'AU'],
  ['Auckland', 'NZ'], ['Wellington', 'NZ'], ['Queenstown', 'NZ'], ['Suva', 'FJ'],
  ['Apia', 'WS'], ["Nuku'alofa", 'TO', 'Nukualofa'], ['Papeete', 'PF'],
];

async function loadJson(pathOrUrl) {
  if (pathOrUrl.startsWith('http')) {
    console.log(`Downloading ${pathOrUrl}`);
    const res = await fetch(pathOrUrl);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${pathOrUrl}`);
    return res.json();
  }
  return JSON.parse(await readFile(pathOrUrl, 'utf8'));
}

const round = (n) => Math.round(n * 100) / 100;

/** Shorter map labels where Natural Earth's NAME is too long for the globe. */
const LABEL_OVERRIDES = { 'United States of America': 'United States' };

function isoCode(p) {
  const iso = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2;
  return iso === '-99' ? `NE-${p.ADM0_A3}` : iso;
}

/** Round a ring to ~1 km precision and drop consecutive duplicate points. */
function simplifyRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
}

function simplifyGeometry(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const kept = polygons
    .map((poly) => poly.map(simplifyRing).filter(Boolean))
    .filter((poly) => poly.length > 0);
  return kept.length === 1
    ? { type: 'Polygon', coordinates: kept[0] }
    : { type: 'MultiPolygon', coordinates: kept };
}

function slug(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const normalizeName = (s) => slug(s ?? '');

async function main() {
  const [countriesSrc = COUNTRIES_URL, placesSrc = PLACES_URL] = process.argv.slice(2);
  const countries = await loadJson(countriesSrc);
  const places = await loadJson(placesSrc);

  // Countries: keep only what the app needs. ISO_A2_EH fixes Natural Earth's -99 for France/Norway.
  const features = countries.features.map((f) => {
    const p = f.properties;
    return {
      type: 'Feature',
      properties: { iso: isoCode(p), name: p.NAME },
      geometry: simplifyGeometry(f.geometry),
    };
  });
  const countriesOut = {
    type: 'FeatureCollection',
    attribution: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com',
    features,
  };
  await mkdir(resolve(ROOT, 'public/data'), { recursive: true });
  await writeFile(resolve(ROOT, 'public/data/countries.geojson'), JSON.stringify(countriesOut));
  console.log(`Wrote ${features.length} country features`);

  // Country labels: one point each, so islands and tile edges never repeat a name.
  const labels = countries.features
    .filter((f) => Number.isFinite(f.properties.LABEL_X) && Number.isFinite(f.properties.LABEL_Y))
    .map((f) => {
      const p = f.properties;
      return {
        type: 'Feature',
        properties: { iso: isoCode(p), name: LABEL_OVERRIDES[p.NAME] ?? p.NAME, rank: p.LABELRANK },
        geometry: { type: 'Point', coordinates: [round(p.LABEL_X), round(p.LABEL_Y)] },
      };
    })
    .sort((a, b) => a.properties.rank - b.properties.rank);
  await writeFile(
    resolve(ROOT, 'public/data/country-labels.geojson'),
    JSON.stringify({ type: 'FeatureCollection', attribution: countriesOut.attribution, features: labels }),
  );
  console.log(`Wrote ${labels.length} country labels`);

  // Cities: match by ASCII name + ISO code, preferring the most populous match.
  const cities = [];
  const missing = [];
  for (const [display, iso, neName = display] of CURATED) {
    const wanted = normalizeName(neName);
    const matches = places.features.filter((f) => {
      const p = f.properties;
      const sameName = [p.name, p.nameascii, p.namealt].some((n) => normalizeName(n) === wanted);
      return sameName && p.iso_a2 === iso;
    });
    if (matches.length === 0) {
      missing.push(`${display} (${iso})`);
      continue;
    }
    matches.sort((a, b) => b.properties.pop_max - a.properties.pop_max);
    const p = matches[0].properties;
    cities.push({
      id: `${iso.toLowerCase()}-${slug(display)}`,
      city: display,
      countryCode: iso,
      latitude: Math.round(p.latitude * 10000) / 10000,
      longitude: Math.round(p.longitude * 10000) / 10000,
    });
  }
  if (missing.length) throw new Error(`Cities not found in Natural Earth: ${missing.join(', ')}`);
  const ids = new Set(cities.map((c) => c.id));
  if (ids.size !== cities.length) throw new Error('Duplicate city ids generated');

  await writeFile(resolve(ROOT, 'src/data/cities.generated.json'), `${JSON.stringify(cities, null, 2)}\n`);
  console.log(`Wrote ${cities.length} curated cities`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
