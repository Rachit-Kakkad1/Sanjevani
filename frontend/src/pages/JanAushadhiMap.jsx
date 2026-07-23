import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Phone, Map as MapIcon, ChevronRight, Loader2, X,
  Info, LocateFixed, Star, Clock, Route, Search, Filter, Sparkles, CheckCircle2, ExternalLink,
  Car, Footprints, Bike, ArrowUpRight, Compass, ShieldCheck, CornerUpRight, School
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import useGeolocation from '../hooks/useGeolocation';
import {
  loadMapplsMapSDK, loadMapplsPlugins, loadLeafletSDK, searchNearbyStores,
  findNearestStore, haversineDistance, geocodeLocation, fetchRealRoadRoute, NATIONWIDE_JAN_AUSHADHI_STORES
} from '../services/mappls.service';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0 }
};

// Fixed Primary Origin: Swaminarayan University, Kalol, Gujarat
const SWAMINARAYAN_UNIVERSITY = {
  lat: 23.2137,
  lng: 72.4938,
  name: 'Swaminarayan University, Kalol, Gujarat'
};

const POPULAR_CITIES = [
  { name: 'Swaminarayan Univ', query: 'swaminarayan university' },
  { name: 'Chandkheda', query: 'Chandkheda' },
  { name: 'Delhi NCR', query: 'New Delhi' },
  { name: 'Mumbai', query: 'Mumbai' },
  { name: 'Bengaluru', query: 'Bengaluru' },
  { name: 'Hyderabad', query: 'Hyderabad' },
  { name: 'Chennai', query: 'Chennai' },
  { name: 'Kolkata', query: 'Kolkata' },
  { name: 'Pune', query: 'Pune' },
  { name: 'Ahmedabad', query: 'Ahmedabad' },
  { name: 'Jaipur', query: 'Jaipur' },
  { name: 'Lucknow', query: 'Lucknow' }
];

const formatDistance = (distKm) => {
  if (distKm === null || distKm === undefined || isNaN(distKm)) return '—';
  if (distKm < 1) {
    return `${Math.max(50, Math.round(distKm * 1000))} m`;
  }
  return `${distKm.toFixed(1)} km`;
};

export default function JanAushadhiMapPage({
  onLogout,currentPage
}) {
  const { location: userLocation, error: geoError, loading: geoLoading, isFallback, retry: retryGeo } = useGeolocation();

  // Primary origin location fixed to Swaminarayan University
  const [currentLocation, setCurrentLocation] = useState(SWAMINARAYAN_UNIVERSITY);
  const [locationLabel, setLocationLabel] = useState('Origin: Swaminarayan University');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // all | nearest | open | rated

  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [nearestStore, setNearestStore] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [mapEngine, setMapEngine] = useState(null); // 'mappls' | 'leaflet'
  const [searchStatus, setSearchStatus] = useState('Initializing MapmyIndia...');
  const [routeInfo, setRouteInfo] = useState(null);

  // ── In-App On-Website Navigation State ─────────────────────────
  const [isNavigatingInApp, setIsNavigatingInApp] = useState(false);
  const [travelMode, setTravelMode] = useState('driving'); // driving | walking | cycling
  const [turnInstructions, setTurnInstructions] = useState([]);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);

  // Initialize Map Engine with Swaminarayan University as center
  const initMap = useCallback(async (lat, lng) => {
    if (!mapRef.current) return;
    setIsLoading(true);
    setSearchStatus('Loading MapmyIndia (Mappls)...');

    // 1. Try Mappls SDK with 2.5s timeout race
    let mapplsLoaded = false;
    try {
      await Promise.race([
        loadMapplsMapSDK(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Mappls SDK timeout')), 2500))
      ]);
      await loadMapplsPlugins();

      if (window.mappls && window.mappls.Map) {
        setSearchStatus('Rendering MapmyIndia map...');
        const map = new window.mappls.Map('mappls-map-container', {
          center: { lat: SWAMINARAYAN_UNIVERSITY.lat, lng: SWAMINARAYAN_UNIVERSITY.lng },
          zoom: 13,
          zoomControl: true,
          hybrid: false,
        });

        mapplsLoaded = await new Promise((resolve) => {
          let done = false;
          const onLoad = () => {
            if (done) return;
            done = true;
            mapInstance.current = map;
            setMapEngine('mappls');
            loadStoresForLocation(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, map, 'mappls');
            resolve(true);
          };

          if (map.on) map.on('load', onLoad);
          else if (map.addListener) map.addListener('load', onLoad);
          
          setTimeout(onLoad, 600);

          // Failsafe timeout if Mappls Map load event never fires (common on unauthorized deployed domains)
          setTimeout(() => {
            if (!done) {
              done = true;
              console.warn('Mappls Map load event timed out on this domain, switching to Leaflet map engine');
              resolve(false);
            }
          }, 2500);
        });

        if (mapplsLoaded) return;
      }
    } catch (e) {
      console.warn('Mappls SDK unavailable or timed out, falling back to Leaflet engine:', e.message);
    }

    // 2. Leaflet Fallback Engine (Runs reliably on all production environments)
    try {
      setSearchStatus('Loading interactive map...');
      const L = await loadLeafletSDK();

      if (!leafletMapInstance.current) {
        const map = L.map('mappls-map-container', {
          center: [SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng],
          zoom: 13,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; MapmyIndia / OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        leafletMapInstance.current = map;
      } else {
        leafletMapInstance.current.setView([SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng], 13);
      }

      setMapEngine('leaflet');
      loadStoresForLocation(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, leafletMapInstance.current, 'leaflet');
    } catch (err) {
      console.error('Map init error:', err);
      setSearchStatus('Map loaded with store view');
      loadStoresForLocation(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, null, 'none');
    }
  }, []);

  useEffect(() => {
    if (!mapInstance.current && !leafletMapInstance.current) {
      initMap(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng);
    }
  }, [initMap]);

  // ── Load & Plot Stores (Distance measured from Swaminarayan University) ──
  const loadStoresForLocation = async (originLat, originLng, mapObj, engineType) => {
    setSearchStatus('Searching PMBJP Jan Aushadhi Kendras...');
    try {
      // Search stores near Swaminarayan University & Chandkheda / Gujarat
      const results = await searchNearbyStores(mapObj, originLat, originLng);
      setStores(results);

      const nearest = findNearestStore(results, SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng);
      if (nearest) {
        setNearestStore(nearest.store);
        setSelectedStore(nearest.store);
      }

      plotMarkers(results, SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, nearest?.store, engineType || mapEngine);
      if (nearest?.store) {
        calculateRoute(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, nearest.store, travelMode, engineType || mapEngine);
      }

      setSearchStatus(`Found ${results.length} Jan Aushadhi Kendras from Swaminarayan University`);
    } catch (err) {
      console.error('Failed to load stores:', err);
      const fallback = NATIONWIDE_JAN_AUSHADHI_STORES.map(s => ({
        ...s,
        distance: haversineDistance(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, s.lat, s.lng)
      })).sort((a, b) => a.distance - b.distance);

      setStores(fallback);
      if (fallback.length > 0) {
        setNearestStore(fallback[0]);
        setSelectedStore(fallback[0]);
        plotMarkers(fallback, SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, fallback[0], engineType || mapEngine);
        calculateRoute(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, fallback[0], travelMode, engineType || mapEngine);
      }
      setSearchStatus(`Loaded ${fallback.length} generic stores`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filter Store List ───────────────────────────────────────────
  useEffect(() => {
    let list = [...stores];

    if (activeFilter === 'nearest') {
      list = list.filter(s => {
        const d = haversineDistance(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, s.lat, s.lng);
        return d <= 15; // Within 15km of Swaminarayan University
      });
    } else if (activeFilter === 'open') {
      list = list.filter(s => (s.hours && (s.hours.includes('24') || s.hours.includes('Open'))));
    } else if (activeFilter === 'rated') {
      list = list.filter(s => (s.rating && s.rating >= 4.8));
    }

    setFilteredStores(list);
  }, [stores, activeFilter]);

  // ── Plot Markers on Map (Swaminarayan University Origin Pin) ─────
  const plotMarkers = (storesList, originLat, originLng, nearestStoreObj, engine) => {
    const activeEngine = engine || mapEngine;

    // Clear previous markers
    markersRef.current.forEach(m => {
      if (m.remove) m.remove();
      if (m.removeFrom) m.removeFrom(leafletMapInstance.current);
    });
    markersRef.current = [];

    // Mappls Engine Markers
    if (activeEngine === 'mappls' && mapInstance.current && window.mappls) {
      try {
        const originMarker = new window.mappls.Marker({
          map: mapInstance.current,
          position: { lat: SWAMINARAYAN_UNIVERSITY.lat, lng: SWAMINARAYAN_UNIVERSITY.lng },
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          width: 46, height: 46,
          popupHtml: `<div style="padding:10px;font-family:Inter,sans-serif;font-weight:700;color:#1e40af;background:#fff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">
            🏫 <b>Swaminarayan University</b><br/>
            <span style="font-size:11px;color:#4b5563">Starting Origin Point</span>
          </div>`
        });
        markersRef.current.push(originMarker);

        storesList.forEach(store => {
          const isNearest = nearestStoreObj?.id === store.id;
          const dist = haversineDistance(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, store.lat, store.lng);

          const marker = new window.mappls.Marker({
            map: mapInstance.current,
            position: { lat: store.lat, lng: store.lng },
            icon: isNearest ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            width: isNearest ? 44 : 32,
            height: isNearest ? 44 : 32,
            popupHtml: `<div style="padding:10px;font-family:Inter,sans-serif;max-width:220px;background:#fff;border-radius:10px;color:#1a1a1a">
              <b style="color:#065f46;font-size:13px">${store.placeName}</b>
              <p style="font-size:11px;color:#6b7280;margin:4px 0">${store.placeAddress}</p>
              <div style="font-size:11px;color:#0284c7;font-weight:700">${formatDistance(dist)} from Swaminarayan Univ</div>
            </div>`
          });

          if (marker.addListener) {
            marker.addListener('click', () => handleSelectStore(store));
          }
          markersRef.current.push(marker);
        });
      } catch (e) {
        console.error('Mappls marker plotting error:', e);
      }
      return;
    }

    // Leaflet Engine Markers
    if (activeEngine === 'leaflet' && leafletMapInstance.current && window.L) {
      const L = window.L;
      try {
        // Prominent Swaminarayan University Origin Campus Marker
        const originIcon = L.divIcon({
          className: 'custom-origin-marker',
          html: `<div style="background:#4f46e5;color:#fff;padding:6px 12px;border-radius:16px;font-size:11px;font-weight:900;border:2.5px solid #fff;box-shadow:0 4px 15px rgba(79,70,229,0.7);display:flex;align-items:center;gap:6px;white-space:nowrap">🏫 Swaminarayan Univ</div>`,
          iconSize: [160, 32],
          iconAnchor: [80, 16]
        });

        const originMarker = L.marker([SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng], { icon: originIcon })
          .addTo(leafletMapInstance.current)
          .bindPopup(`<div style="padding:4px;font-family:Inter,sans-serif">
            <b style="color:#4f46e5;font-size:13px">🏫 Swaminarayan University</b>
            <p style="font-size:11px;color:#6b7280;margin:2px 0">Starting Origin Point for All Routes</p>
          </div>`);
        markersRef.current.push(originMarker);

        storesList.forEach(store => {
          const isNearest = nearestStoreObj?.id === store.id;
          const dist = haversineDistance(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, store.lat, store.lng);

          const storeIcon = L.divIcon({
            className: 'custom-store-marker',
            html: `<div style="background:${isNearest ? '#10b981' : '#0284c7'};color:#fff;width:${isNearest ? '32px' : '26px'};height:${isNearest ? '32px' : '26px'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.25)">💊</div>`,
            iconSize: [isNearest ? 32 : 26, isNearest ? 32 : 26],
            iconAnchor: [isNearest ? 16 : 13, isNearest ? 16 : 13]
          });

          const m = L.marker([store.lat, store.lng], { icon: storeIcon })
            .addTo(leafletMapInstance.current)
            .bindPopup(`<div style="padding:4px;font-family:Inter,sans-serif">
              <b style="color:#065f46;font-size:13px">${store.placeName}</b>
              <p style="font-size:11px;color:#6b7280;margin:3px 0">${store.placeAddress}</p>
              <div style="font-size:11px;color:#0284c7;font-weight:700">${formatDistance(dist)} from Swaminarayan Univ</div>
            </div>`);

          m.on('click', () => handleSelectStore(store));
          markersRef.current.push(m);
        });
      } catch (e) {
        console.error('Leaflet marker plotting error:', e);
      }
    }
  };

  // ── Calculate Real Road Network Route (ALWAYS starting from Swaminarayan University) ──
  const calculateRoute = async (userLat, userLng, store, mode = 'driving', engine = null, fitFullRoute = false) => {
    setIsRouteLoading(true);

    // ALWAYS use Swaminarayan University as the starting origin!
    const originLat = SWAMINARAYAN_UNIVERSITY.lat;
    const originLng = SWAMINARAYAN_UNIVERSITY.lng;

    const routeData = await fetchRealRoadRoute(originLat, originLng, store.lat, store.lng, mode);
    setIsRouteLoading(false);

    setRouteInfo({
      distance: routeData.distanceKm,
      duration: routeData.durationMins,
      mode
    });

    if (routeData.steps && routeData.steps.length > 0) {
      setTurnInstructions(routeData.steps);
    }

    const activeEngine = engine || mapEngine;

    // Render dual glowing polyline route starting from Swaminarayan University
    if (activeEngine === 'leaflet' && leafletMapInstance.current && window.L) {
      const L = window.L;
      if (routeLineRef.current) {
        if (Array.isArray(routeLineRef.current)) {
          routeLineRef.current.forEach(l => l.remove());
        } else if (routeLineRef.current.remove) {
          routeLineRef.current.remove();
        }
      }

      // Outer glow polyline layer
      const shadowLine = L.polyline(routeData.coordinates, {
        color: '#047857',
        weight: 10,
        opacity: 0.3,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(leafletMapInstance.current);

      // Core crisp polyline layer
      const coreLine = L.polyline(routeData.coordinates, {
        color: '#10b981',
        weight: 6,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: mode === 'walking' ? '8, 10' : undefined
      }).addTo(leafletMapInstance.current);

      routeLineRef.current = [shadowLine, coreLine];

      if (fitFullRoute) {
        // Fit map bounds tightly around full route geometry only if user clicked "Full Route"
        const bounds = L.latLngBounds(routeData.coordinates);
        leafletMapInstance.current.fitBounds(bounds, { padding: [60, 60] });
      } else {
        // DEFAULT: Stay zoomed in close to the store! (Zoom level 15)
        leafletMapInstance.current.setView([store.lat, store.lng], 15, { animate: true });
      }
    } else if (activeEngine === 'mappls' && mapInstance.current) {
      mapInstance.current.setCenter({ lat: store.lat, lng: store.lng });
      mapInstance.current.setZoom(15);
    }
  };

  const handleFitFullRoute = () => {
    if (selectedStore && leafletMapInstance.current) {
      calculateRoute(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, selectedStore, travelMode, null, true);
    }
  };

  const handleFocusStore = () => {
    if (selectedStore && leafletMapInstance.current) {
      leafletMapInstance.current.setView([selectedStore.lat, selectedStore.lng], 15, { animate: true });
    }
  };

  // ── Start In-App Navigation (Website Only) ──────────────────────
  const startInAppNavigation = (storeToNav = null) => {
    const targetStore = storeToNav || selectedStore;
    if (!targetStore) return;

    setIsNavigatingInApp(true);
    calculateRoute(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, targetStore, travelMode);
  };

  // ── Mode Switch Handler ─────────────────────────────────────────
  const handleTravelModeChange = (mode) => {
    setTravelMode(mode);
    if (selectedStore) {
      calculateRoute(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, selectedStore, mode);
    }
  };

  // ── Exit In-App Navigation ──────────────────────────────────────
  const exitInAppNavigation = () => {
    setIsNavigatingInApp(false);
  };

  // ── Handle Store Selection ─────────────────────────────────────
  const handleSelectStore = (store) => {
    setSelectedStore(store);
    calculateRoute(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, store, travelMode);

    if (mapEngine === 'mappls' && mapInstance.current) {
      mapInstance.current.setCenter({ lat: store.lat, lng: store.lng });
      mapInstance.current.setZoom(15);
    }
  };

  // ── Search Location (City / Landmark / Pincode) ───────────────
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchStatus(`Locating "${searchQuery}"...`);

    const result = await geocodeLocation(searchQuery);
    setIsSearching(false);

    if (result) {
      if (mapEngine === 'mappls' && mapInstance.current) {
        mapInstance.current.setCenter({ lat: result.lat, lng: result.lng });
        mapInstance.current.setZoom(13);
      } else if (mapEngine === 'leaflet' && leafletMapInstance.current) {
        leafletMapInstance.current.setView([result.lat, result.lng], 13);
      }

      loadStoresForLocation(result.lat, result.lng);
    } else {
      setSearchStatus(`Location "${searchQuery}" not found. Try another city.`);
    }
  };

  const handleCityClick = (city) => {
    setSearchQuery(city.query);
    setIsSearching(true);
    setSearchStatus(`Loading stores in ${city.name}...`);

    geocodeLocation(city.query).then(result => {
      setIsSearching(false);
      if (result) {
        if (mapEngine === 'mappls' && mapInstance.current) {
          mapInstance.current.setCenter({ lat: result.lat, lng: result.lng });
          mapInstance.current.setZoom(13);
        } else if (mapEngine === 'leaflet' && leafletMapInstance.current) {
          leafletMapInstance.current.setView([result.lat, result.lng], 13);
        }

        loadStoresForLocation(result.lat, result.lng);
      }
    });
  };

  const handleResetLocation = () => {
    setSearchQuery('');
    setIsNavigatingInApp(false);
    setLocationLabel('Origin: Swaminarayan University');

    if (mapEngine === 'mappls' && mapInstance.current) {
      mapInstance.current.setCenter({ lat: SWAMINARAYAN_UNIVERSITY.lat, lng: SWAMINARAYAN_UNIVERSITY.lng });
      mapInstance.current.setZoom(13);
    } else if (mapEngine === 'leaflet' && leafletMapInstance.current) {
      leafletMapInstance.current.setView([SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng], 13);
    }

    loadStoresForLocation(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng);
  };

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants}
      className="min-h-screen bg-background text-text-main transition-colors duration-300">
      <Helmet>
        <title>Jan Aushadhi Routes from Swaminarayan University | Sanjeevani</title>
        <meta name="description" content="Direct real road routes from Swaminarayan University to Pradhan Mantri Bhartiya Janaushadhi Kendras." />
      </Helmet>
      <Navbar
        onLogout={onLogout} currentPage={currentPage}
      />

      <main className="pt-20 h-screen flex flex-col md:flex-row overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-full md:w-[440px] bg-card border-r border-border flex flex-col z-10 shadow-2xl transition-colors duration-300">
          
          {/* Header & Search */}
          <div className="p-5 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold flex items-center gap-2 text-text-main">
                <MapIcon className="text-primary" size={22} /> Jan Aushadhi Finder
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles size={11} /> MapmyIndia Powered
              </span>
            </div>

            {/* Location Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search city, area, pincode (e.g. Chandkheda, Kalol)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-background border border-border rounded-xl text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <Search className="absolute left-3 top-3 text-text-muted" size={16} />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-text-muted hover:text-text-main">
                  <X size={16} />
                </button>
              ) : null}
            </form>

            {/* Popular City Quick-Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              <span className="text-text-muted text-[11px] font-medium shrink-0">Cities:</span>
              {POPULAR_CITIES.slice(0, 6).map((city, i) => (
                <button
                  key={i}
                  onClick={() => handleCityClick(city)}
                  className="px-2.5 py-1 rounded-lg bg-secondary/10 hover:bg-primary hover:text-white transition-all whitespace-nowrap text-text-main font-medium border border-border"
                >
                  {city.name}
                </button>
              ))}
            </div>

            {/* Fixed Origin Status Banner */}
            <div className="flex items-center justify-between text-xs px-3 py-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 truncate pr-2">
                <School className="text-indigo-600 shrink-0" size={16} />
                <span className="truncate font-bold text-xs">Origin: Swaminarayan University</span>
              </div>
              <button
                onClick={handleResetLocation}
                className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline shrink-0 flex items-center gap-1 text-[11px]"
              >
                <LocateFixed size={12} /> Reset Origin
              </button>
            </div>
          </div>

          {/* If In-App Navigation is Active — Show Turn Instructions */}
          {isNavigatingInApp ? (
            <div className="p-4 border-b border-border bg-emerald-500/10 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Compass className="animate-spin text-emerald-600" size={15} /> Route from Swaminarayan Univ
                </span>
                <button
                  onClick={exitInAppNavigation}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-all"
                >
                  Exit Nav
                </button>
              </div>

              {/* Travel Mode Toggle */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border mb-3">
                <button
                  onClick={() => handleTravelModeChange('driving')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${travelMode === 'driving' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                >
                  <Car size={14} /> Drive
                </button>
                <button
                  onClick={() => handleTravelModeChange('walking')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${travelMode === 'walking' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                >
                  <Footprints size={14} /> Walk
                </button>
                <button
                  onClick={() => handleTravelModeChange('cycling')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${travelMode === 'cycling' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                >
                  <Bike size={14} /> Cycle
                </button>
              </div>

              {/* Turn-by-Turn Road Steps */}
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                {turnInstructions.map((step) => (
                  <div key={step.id} className="p-2.5 bg-background rounded-xl border border-border text-xs flex items-start gap-2">
                    <span className="text-base leading-none">{step.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-text-main leading-snug">{step.text}</p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{step.dist}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Filter Tabs */
            <div className="px-5 py-3 border-b border-border flex items-center gap-2 overflow-x-auto bg-background/50 text-xs">
              <Filter size={13} className="text-text-muted shrink-0" />
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeFilter === 'all' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
              >
                All ({stores.length})
              </button>
              <button
                onClick={() => setActiveFilter('nearest')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeFilter === 'nearest' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
              >
                Near Univ (&lt;15km)
              </button>
              <button
                onClick={() => setActiveFilter('open')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeFilter === 'open' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
              >
                24/7 Open
              </button>
              <button
                onClick={() => setActiveFilter('rated')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeFilter === 'rated' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}
              >
                Top Rated ★
              </button>
            </div>
          )}

          {/* Search Status Bar */}
          {(isLoading || isSearching || geoLoading || isRouteLoading) && (
            <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-3">
              <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={16} />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {isRouteLoading ? 'Calculating route from Swaminarayan University...' : searchStatus}
              </span>
            </div>
          )}

          {/* Store List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredStores.length === 0 && !isLoading ? (
              <div className="text-center py-16 px-4">
                <MapPin className="mx-auto text-primary/30 mb-3" size={48} />
                <h4 className="text-text-main font-bold">No Kendras found</h4>
                <p className="text-text-muted text-xs mt-1">Try clearing filters or search another city above.</p>
                <button
                  onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                  className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow"
                >
                  Show All Kendras
                </button>
              </div>
            ) : (
              filteredStores.map((store, idx) => {
                const isNearest = nearestStore?.id === store.id;
                const isSelected = selectedStore?.id === store.id;
                const rawDistKm = haversineDistance(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng, store.lat, store.lng);
                const distText = formatDistance(rawDistKm);

                return (
                  <motion.div
                    key={store.id || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleSelectStore(store)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary to-secondary text-white border-primary shadow-xl scale-[1.01]'
                        : isNearest
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-text-main hover:border-emerald-500'
                        : 'bg-background border-border text-text-main hover:border-primary/40'
                    }`}
                  >
                    {isNearest && (
                      <div className={`absolute top-0 right-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'} text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1`}>
                        <Star size={10} fill="currentColor" /> CLOSEST TO UNIV
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-1.5 pr-20">
                      <h3 className="font-semibold text-sm leading-tight">{store.placeName}</h3>
                    </div>

                    <p className={`text-xs mb-3 leading-relaxed ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                      {store.placeAddress}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-current/10">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-white' : 'text-primary'}`}>
                          <Route size={13} /> {distText} from Univ
                        </span>
                        {store.hours && (
                          <span className={`flex items-center gap-1 text-[11px] ${isSelected ? 'text-white/70' : 'text-text-muted'}`}>
                            <Clock size={11} /> {store.hours}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStore(store);
                          startInAppNavigation(store);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all ${isSelected ? 'bg-white text-primary hover:bg-white/90' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      >
                        <Compass size={12} /> Road Route
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Route & In-App Navigation Action Bar */}
          <AnimatePresence>
            {selectedStore && routeInfo && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="p-5 bg-gradient-to-br from-primary to-secondary text-white border-t border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-300" /> From Swaminarayan University to:
                    </span>
                    <h4 className="font-bold text-base leading-tight mt-0.5 text-white truncate max-w-[220px]">
                      {selectedStore.placeName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black">{routeInfo.distance} <span className="text-sm font-normal opacity-80">km</span></div>
                    <div className="text-xs opacity-75 flex items-center justify-end gap-1">
                      <Clock size={12} /> ~{routeInfo.duration} mins ({routeInfo.mode || 'driving'})
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => startInAppNavigation()}
                  className="w-full mb-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/30"
                >
                  <Compass size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
                  {isNavigatingInApp ? 'Active Route from Swaminarayan Univ' : '🧭 Start Navigation from Swaminarayan Univ'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {selectedStore.phone && (
                    <a
                      href={`tel:${selectedStore.phone}`}
                      className="py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-white backdrop-blur border border-white/10"
                    >
                      <Phone size={13} /> Call Store
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${SWAMINARAYAN_UNIVERSITY.lat},${SWAMINARAYAN_UNIVERSITY.lng}&destination=${selectedStore.lat},${selectedStore.lng}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                    className={`py-2 px-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-white/80 ${!selectedStore.phone ? 'col-span-2' : ''}`}
                  >
                    Open Google Maps <ExternalLink size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Map Container ── */}
        <div className="flex-1 relative bg-muted/20">
          <div id="mappls-map-container" ref={mapRef} className="w-full h-full min-h-[400px]" />

          {/* Loading Overlay */}
          {(isLoading || geoLoading) && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-20">
              <div className="glass-card p-8 rounded-3xl flex flex-col items-center max-w-xs text-center border border-border shadow-2xl">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse shadow-lg shadow-primary/30">
                    <School className="text-white" size={32} />
                  </div>
                  <Loader2 className="absolute -bottom-1 -right-1 animate-spin text-emerald-500" size={22} />
                </div>
                <h3 className="font-serif text-lg font-bold text-text-main">MapmyIndia Engine</h3>
                <p className="text-text-muted text-xs mt-1">Origin: Swaminarayan University</p>
              </div>
            </div>
          )}

          {/* Live Navigation Floating Header Banner */}
          {isNavigatingInApp && selectedStore && routeInfo && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-4 left-4 right-4 md:left-6 md:right-16 z-20 bg-gradient-to-r from-indigo-700 via-emerald-600 to-teal-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-white/20 backdrop-blur"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CornerUpRight size={22} className="text-white animate-bounce" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 flex items-center gap-1">
                    <School size={11} /> Origin: Swaminarayan University
                  </span>
                  <h4 className="font-bold text-sm truncate">→ {selectedStore.placeName}</h4>
                  <p className="text-[11px] text-white/80 truncate">
                    {routeInfo.distance} km • ~{routeInfo.duration} mins ({travelMode})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleFocusStore}
                  title="Focus Zoom on Store"
                  className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-1"
                >
                  <MapPin size={13} /> Store View
                </button>
                <button
                  onClick={handleFitFullRoute}
                  title="Fit Full Route Bounds"
                  className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-1"
                >
                  <Route size={13} /> Full Route
                </button>
                <button
                  onClick={exitInAppNavigation}
                  className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all border border-red-400/30"
                >
                  Exit Nav
                </button>
              </div>
            </motion.div>
          )}

          {/* Map Floating Badges */}
          {!isNavigatingInApp && (
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
              {!isLoading && stores.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xl border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold bg-indigo-500/10 backdrop-blur"
                >
                  <School size={15} className="text-indigo-600" />
                  <span>Origin: Swaminarayan University ({filteredStores.length} Stores)</span>
                </motion.div>
              )}

              <span className="glass-card px-3 py-2 rounded-xl shadow-xl text-[11px] font-semibold text-text-muted border border-border">
                {mapEngine === 'mappls' ? '🗺️ MapmyIndia SDK' : '🗺️ MapmyIndia Tile View'}
              </span>
            </div>
          )}

          {/* Recenter to Swaminarayan University Floating Button */}
          <button
            onClick={handleResetLocation}
            title="Recenter to Swaminarayan University"
            className="absolute bottom-6 right-6 z-20 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold text-xs"
          >
            <School size={18} /> Swaminarayan Univ
          </button>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.8); }
        #mappls-map-container .leaflet-container { font-family: Inter, sans-serif; background: #f8fafc; }
      `}</style>
    </motion.div>
  );
}
