import { useCallback, useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './maplibreSetup';
import { Earth, Map as MapIcon, Minus, Plus, RotateCcw } from 'lucide-react';
import type { Destination } from '../../domain/types';
import { countryName } from '../../domain/countries';
import type { CountryStatuses } from '../../domain/countryStatus';
import { buildGlobeStyle, countryFill, countryLabelColor, MAX_ZOOM } from './globeStyle';
import { prefersReducedMotion } from '../../utils/motion';
import { listPhotos, PHOTOS_CHANGED_EVENT } from '../../domain/photos';
import { createMarkerThumbnailURL } from '../../domain/photoThumbnails';

export interface PickedPoint {
  longitude: number;
  latitude: number;
  countryCode: string | null;
  country: string | null;
}

export interface FocusRequest {
  longitude: number;
  latitude: number;
  /** Changes on every request so the same place can be focused twice. */
  nonce: number;
}

interface TravelGlobeProps {
  destinations: readonly Destination[];
  /** Photo markers are hidden in fictional, read-only demo mode. */
  isDemo: boolean;
  /** Which countries are visited / wishlist-only — drives the polygon colours. */
  countryStatuses: CountryStatuses;
  selectedId: string | null;
  focusRequest: FocusRequest | null;
  /** Increment to fly back to the world overview (e.g. when switching collections). */
  overviewRequest: number;
  pickMode: boolean;
  onSelect: (id: string) => void;
  onPick: (point: PickedPoint) => void;
  onBackgroundClick: () => void;
}

type MapStatus = 'loading' | 'ready' | 'error';

const INITIAL_CENTER: [number, number] = [12, 28];
const dataUrl = (file: string) => new URL(`${import.meta.env.BASE_URL}data/${file}`, window.location.href).href;
const COUNTRIES_URL = dataUrl('countries.geojson');
const LABELS_URL = dataUrl('country-labels.geojson');

/** Pick a zoom that makes the globe nearly fill the smaller side of the viewport. */
function overviewZoom(el: HTMLElement): number {
  const size = Math.max(240, Math.min(el.clientWidth, el.clientHeight));
  return Math.max(0, Math.min(2.6, Math.log2((size * 0.9 * Math.PI) / 512)));
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function markerLabel(d: Destination): string {
  return `${d.city}, ${d.country} — ${d.status === 'visited' ? 'visited' : 'on your wishlist'}`;
}

function createMarkerElement(): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'gm';
  el.innerHTML =
    '<span class="gm__pulse" aria-hidden="true"></span>' +
    '<span class="gm__dot" aria-hidden="true">' +
    '<svg class="gm__check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' +
    '</span>';
  // A photo is optional: normal markers remain visible until a preview loads.
  const image = document.createElement('img');
  image.className = 'gm__photo';
  image.alt = ''; // The button itself has the accessible city/country label.
  image.setAttribute('aria-hidden', 'true');
  image.decoding = 'async';
  image.hidden = true;
  el.appendChild(image);
  return el;
}

export function TravelGlobe({
  destinations,
  isDemo,
  countryStatuses,
  selectedId,
  focusRequest,
  overviewRequest,
  pickMode,
  onSelect,
  onPick,
  onBackgroundClick,
}: TravelGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const spinningRef = useRef(false);
  const [webgl] = useState(supportsWebGL);
  const [status, setStatus] = useState<MapStatus>(webgl ? 'loading' : 'error');
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [photoRevision, setPhotoRevision] = useState(0);

  useEffect(() => {
    const onPhotosChanged = () => setPhotoRevision((revision) => revision + 1);
    window.addEventListener(PHOTOS_CHANGED_EVENT, onPhotosChanged);
    return () => window.removeEventListener(PHOTOS_CHANGED_EVENT, onPhotosChanged);
  }, []);

  // Keep the latest callbacks in a ref so map listeners (registered once) never go stale.
  const handlers = useRef({ onSelect, onPick, onBackgroundClick, pickMode });
  useEffect(() => {
    handlers.current = { onSelect, onPick, onBackgroundClick, pickMode };
  });

  // Create the map once; destroy it on unmount (also handles React StrictMode's double mount).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webgl) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: buildGlobeStyle(COUNTRIES_URL, LABELS_URL),
        center: INITIAL_CENTER,
        zoom: overviewZoom(container),
        minZoom: 0,
        maxZoom: MAX_ZOOM,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      queueMicrotask(() => setStatus('error'));
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    // Development-only handle for inspecting the map from browser devtools.
    if (import.meta.env.DEV) (window as unknown as { __globeMap?: MapLibreMap }).__globeMap = map;

    // Gentle idle rotation until the user takes over.
    spinningRef.current = !prefersReducedMotion();
    const spin = () => {
      if (!spinningRef.current || map.getZoom() > 3) return;
      const center = map.getCenter();
      center.lng -= 8;
      map.easeTo({ center, duration: 4000, easing: (t: number) => t });
    };
    const stopSpin = () => {
      spinningRef.current = false;
    };
    map.on('mousedown', stopSpin);
    map.on('touchstart', stopSpin);
    map.on('wheel', stopSpin);
    map.on('dragstart', stopSpin);
    map.on('moveend', spin);
    container.addEventListener('keydown', stopSpin);

    // Interactive as soon as the bundled country shapes are in — label glyphs can stream in later.
    let ready = false;
    const markReady = () => {
      if (ready) return;
      ready = true;
      setStatus('ready');
      spin();
      // On small screens start with the attribution collapsed behind its (i) button.
      if (window.matchMedia('(max-width: 900px)').matches) {
        container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      }
    };
    map.on('load', markReady);
    map.on('sourcedata', (event) => {
      if (event.sourceId === 'countries' && event.isSourceLoaded) markReady();
    });
    map.on('error', (event) => {
      // Labels are optional; only the country shapes are essential.
      if ((event as { sourceId?: string }).sourceId === 'countries') setStatus('error');
    });
    map.on('click', (event) => {
      const h = handlers.current;
      if (!h.pickMode) {
        h.onBackgroundClick();
        return;
      }
      const feature = map.queryRenderedFeatures(event.point, { layers: ['land'] })[0];
      const iso = typeof feature?.properties?.iso === 'string' ? feature.properties.iso : null;
      const polygonName = typeof feature?.properties?.name === 'string' ? feature.properties.name : null;
      // Prefer our normalized name; fall back to Natural Earth's for regions outside the ISO list.
      const name = iso && countryName(iso) !== iso ? countryName(iso) : polygonName;
      h.onPick({
        longitude: event.lngLat.wrap().lng,
        latitude: event.lngLat.lat,
        countryCode: iso,
        country: name,
      });
    });

    const markers = markersRef.current;
    return () => {
      container.removeEventListener('keydown', stopSpin);
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [webgl]);

  // Country colours follow the saved destinations: green visited, amber wishlist-only, white otherwise.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    map.setPaintProperty('land', 'fill-color', countryFill(countryStatuses));
    map.setPaintProperty('country-labels', 'text-color', countryLabelColor(countryStatuses));
  }, [countryStatuses, status]);

  // Sync DOM markers with the (filtered) destinations: add, move, restyle, remove.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const ids = new Set(destinations.map((d) => d.id));
    for (const [id, { marker }] of markers) {
      if (!ids.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    for (const d of destinations) {
      let entry = markers.get(d.id);
      if (!entry) {
        const el = createMarkerElement();
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          handlers.current.onSelect(d.id);
        });
        const marker = new Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat([d.longitude, d.latitude]).addTo(map);
        entry = { marker, el };
        markers.set(d.id, entry);
      } else {
        entry.marker.setLngLat([d.longitude, d.latitude]);
      }
      const { el } = entry;
      el.classList.toggle('gm--visited', d.status === 'visited');
      el.classList.toggle('gm--wishlist', d.status === 'wishlist');
      el.classList.toggle('gm--selected', d.id === selectedId);
      el.setAttribute('aria-label', markerLabel(d));
      el.setAttribute('aria-pressed', String(d.id === selectedId));
      el.title = `${d.city}, ${d.country}`;
    }
  }, [destinations, selectedId]);

  // Show the oldest saved journal photo as a small round marker on visited destinations.
  // Object URLs are revoked whenever the list changes, photos change, or the component unmounts.
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    const markers = markersRef.current;

    // Reset immediately so removing photos or changing to wishlist reverts to a plain dot.
    for (const { el } of markers.values()) {
      el.classList.remove('gm--photo');
      const image = el.querySelector<HTMLImageElement>('.gm__photo');
      if (image) { image.hidden = true; image.removeAttribute('src'); }
    }

    if (!isDemo) {
      for (const d of destinations) {
        if (d.status !== 'visited') continue;
        void (async () => {
          try {
            const photos = await listPhotos(d.id);
            if (cancelled || photos.length === 0) return;
            const url = await createMarkerThumbnailURL(photos[0].blob);
            if (cancelled) { URL.revokeObjectURL(url); return; }
            const entry = markers.get(d.id);
            const image = entry?.el.querySelector<HTMLImageElement>('.gm__photo');
            if (!entry || !image) { URL.revokeObjectURL(url); return; }
            urls.push(url);
            image.src = url;
            image.hidden = false;
            entry.el.classList.add('gm--photo');
          } catch {
            // IndexedDB may be unavailable: preserve the original marker as fallback.
          }
        })();
      }
    }

    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
      for (const { el } of markers.values()) {
        el.classList.remove('gm--photo');
        const image = el.querySelector<HTMLImageElement>('.gm__photo');
        if (image) { image.hidden = true; image.removeAttribute('src'); }
      }
    };
  }, [destinations, isDemo, photoRevision]);

  // Fly to a requested place along the shortest path (handles the date line).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    spinningRef.current = false;
    const currentLng = map.getCenter().lng;
    const lng = focusRequest.longitude + 360 * Math.round((currentLng - focusRequest.longitude) / 360);
    // On phones the passport (top) and details card (bottom) cover the map, so aim between them.
    const container = map.getContainer();
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    map.flyTo({
      center: [lng, focusRequest.latitude],
      padding: narrow
        ? { top: container.clientHeight * 0.3, bottom: container.clientHeight * 0.4, left: 0, right: 0 }
        : { top: 0, bottom: 0, left: 0, right: 0 },
      zoom: Math.max(map.getZoom(), 3.2),
      duration: prefersReducedMotion() ? 0 : 2200,
      curve: 1.5,
    });
  }, [focusRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = pickMode ? 'crosshair' : '';
    // Hold the globe still while the user is aiming for a spot.
    if (pickMode) {
      spinningRef.current = false;
      map.stop();
    }
  }, [pickMode, status]);

  const zoomBy = (delta: number) => {
    spinningRef.current = false;
    mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() ?? 1) + delta, duration: prefersReducedMotion() ? 0 : 400 });
  };

  const resetView = useCallback(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;
    spinningRef.current = false;
    map.flyTo({ center: INITIAL_CENTER, zoom: overviewZoom(container), duration: prefersReducedMotion() ? 0 : 1800 });
  }, []);

  useEffect(() => {
    if (overviewRequest > 0) resetView();
  }, [overviewRequest, resetView]);

  const toggleProjection = () => {
    const next = projection === 'globe' ? 'mercator' : 'globe';
    mapRef.current?.setProjection({ type: next });
    setProjection(next);
  };

  return (
    <div className={`globe ${pickMode ? 'globe--picking' : ''}`}>
      <div ref={containerRef} className="globe__map" aria-label="Interactive travel globe" role="region" />

      {status === 'loading' && (
        <div className="globe__overlay" role="status">
          <span className="spinner" aria-hidden="true" />
          Unfolding the map…
        </div>
      )}
      {status === 'error' && (
        <div className="globe__overlay globe__overlay--error" role="alert">
          <strong>The interactive globe couldn’t start.</strong>
          <span>
            {webgl
              ? 'The country map data failed to load. Try reloading the page.'
              : 'Your browser has WebGL turned off or unsupported.'}{' '}
            Your journey list and passport still work.
          </span>
        </div>
      )}

      {status === 'ready' && (
        <div className="globe__controls" role="group" aria-label="Map controls">
          <button type="button" className="icon-btn ctl-zoom" onClick={() => zoomBy(1)} aria-label="Zoom in" title="Zoom in">
            <Plus size={18} />
          </button>
          <button type="button" className="icon-btn ctl-zoom" onClick={() => zoomBy(-1)} aria-label="Zoom out" title="Zoom out">
            <Minus size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={resetView} aria-label="Return to world overview" title="World overview">
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleProjection}
            aria-label={projection === 'globe' ? 'Switch to flat map' : 'Switch to globe'}
            title={projection === 'globe' ? 'Flat map' : 'Globe'}
          >
            {projection === 'globe' ? <MapIcon size={17} /> : <Earth size={17} />}
          </button>
        </div>
      )}
    </div>
  );
}
