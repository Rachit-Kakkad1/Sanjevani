/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🗺️ Jan Aushadhi Store & Healthcare Locator — Production v3.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dual Map Engine (Zero-Downtime):
 *   Primary  → MapmyIndia Mappls SDK v3.0 (2.5s race timeout)
 *   Fallback → Leaflet.js + OpenStreetMap (automatic failover)
 *
 * Features:
 *   • Live GPS detection with campus fallback
 *   • City / pincode / landmark search with autocomplete pills
 *   • 3-tier store data cascade (Mappls → Backend → Embedded)
 *   • Real road routing via OSRM with turn-by-turn navigation
 *   • Distance radius slider (1–50 km)
 *   • Glassmorphic dark UI with framer-motion micro-animations
 *   • External navigation (Google Maps / Mappls app deep link)
 *   • Call, Share, Directions action buttons
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Phone, Map as MapIcon, ChevronRight, Loader2, X,
  LocateFixed, Star, Clock, Route, Search, Filter, Sparkles, CheckCircle2,
  ExternalLink, Car, Footprints, Bike, Compass, ShieldCheck, CornerUpRight,
  School, Share2, SlidersHorizontal, ChevronDown, ChevronUp, Zap, BadgePercent,
  Navigation2
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import useGeolocation from '../hooks/useGeolocation';
import {
  loadMapplsMapSDK, loadMapplsPlugins, loadLeafletSDK, searchNearbyStores,
  findNearestStore, haversineDistance, geocodeLocation, fetchRealRoadRoute,
  NATIONWIDE_JAN_AUSHADHI_STORES
} from '../services/mappls.service';


// ─── Constants ─────────────────────────────────────────────────
const SWAMINARAYAN_UNIVERSITY = {
  lat: 23.2137,
  lng: 72.4938,
  name: 'Swaminarayan University, Kalol, Gujarat'
};

const POPULAR_CITIES = [
  { name: 'Swaminarayan Univ', query: 'swaminarayan university', icon: '🏫' },
  { name: 'Chandkheda', query: 'Chandkheda', icon: '📍' },
  { name: 'Delhi NCR', query: 'New Delhi', icon: '🏛️' },
  { name: 'Mumbai', query: 'Mumbai', icon: '🌊' },
  { name: 'Bengaluru', query: 'Bengaluru', icon: '💻' },
  { name: 'Hyderabad', query: 'Hyderabad', icon: '🕌' },
  { name: 'Chennai', query: 'Chennai', icon: '🏖️' },
  { name: 'Kolkata', query: 'Kolkata', icon: '🌉' },
  { name: 'Pune', query: 'Pune', icon: '⛰️' },
  { name: 'Ahmedabad', query: 'Ahmedabad', icon: '🏗️' },
  { name: 'Jaipur', query: 'Jaipur', icon: '🏰' },
  { name: 'Lucknow', query: 'Lucknow', icon: '🕐' },
];

const formatDistance = (distKm) => {
  if (distKm === null || distKm === undefined || isNaN(distKm)) return '—';
  if (distKm < 1) return `${Math.max(50, Math.round(distKm * 1000))} m`;
  return `${distKm.toFixed(1)} km`;
};

const isStoreOpen = (hours) => {
  if (!hours) return false;
  if (hours.includes('24') || hours.toLowerCase().includes('open')) return true;
  // Simple heuristic: most stores are open during daytime
  const hour = new Date().getHours();
  return hour >= 8 && hour <= 21;
};


// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function JanAushadhiMapPage() {
  const { location: userLocation, error: geoError, loading: geoLoading, isFallback } = useGeolocation();

  // ── Core State ──────────────────────────────────────────────
  const [currentLocation, setCurrentLocation] = useState(SWAMINARAYAN_UNIVERSITY);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [radiusKm, setRadiusKm] = useState(50);
  const [showRadiusSlider, setShowRadiusSlider] = useState(false);

  // ── Store State ─────────────────────────────────────────────
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [nearestStore, setNearestStore] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  // ── Map State ───────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [mapEngine, setMapEngine] = useState(null);
  const [searchStatus, setSearchStatus] = useState('Initializing MapmyIndia...');

  // ── Navigation State ────────────────────────────────────────
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigatingInApp, setIsNavigatingInApp] = useState(false);
  const [travelMode, setTravelMode] = useState('driving');
  const [turnInstructions, setTurnInstructions] = useState([]);
  const [showTurnPanel, setShowTurnPanel] = useState(true);

  // ── Sidebar State ───────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Refs ────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const searchInputRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // MAP INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  const initMap = useCallback(async () => {
    if (!mapRef.current) return;
    setIsLoading(true);
    setSearchStatus('Loading MapmyIndia (Mappls SDK v3.0)...');

    const centerLat = SWAMINARAYAN_UNIVERSITY.lat;
    const centerLng = SWAMINARAYAN_UNIVERSITY.lng;

    // ── Try Mappls SDK with 2.5s race timeout ──
    let mapplsLoaded = false;
    try {
      await Promise.race([
        loadMapplsMapSDK(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Mappls SDK timeout (2.5s)')), 2500))
      ]);
      await loadMapplsPlugins();

      if (window.mappls && window.mappls.Map) {
        setSearchStatus('Rendering MapmyIndia vector map...');
        const map = new window.mappls.Map('mappls-map-container', {
          center: { lat: centerLat, lng: centerLng },
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
            loadStoresForLocation(centerLat, centerLng, map, 'mappls');
            resolve(true);
          };

          if (map.on) map.on('load', onLoad);
          else if (map.addListener) map.addListener('load', onLoad);
          setTimeout(onLoad, 600);

          // Domain authorization failsafe
          setTimeout(() => {
            if (!done) {
              done = true;
              console.warn('[Map] Mappls load event timed out — switching to Leaflet');
              resolve(false);
            }
          }, 2500);
        });

        if (mapplsLoaded) return;
      }
    } catch (e) {
      console.warn('[Map] Mappls SDK unavailable, falling back to Leaflet:', e.message);
    }

    // ── Leaflet + OpenStreetMap Fallback ──
    try {
      setSearchStatus('Loading interactive map (OpenStreetMap)...');
      const L = await loadLeafletSDK();

      if (!leafletMapInstance.current) {
        const map = L.map('mappls-map-container', {
          center: [centerLat, centerLng],
          zoom: 13,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; MapmyIndia / OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        leafletMapInstance.current = map;
      } else {
        leafletMapInstance.current.setView([centerLat, centerLng], 13);
      }

      setMapEngine('leaflet');
      loadStoresForLocation(centerLat, centerLng, leafletMapInstance.current, 'leaflet');
    } catch (err) {
      console.error('[Map] Both engines failed:', err);
      setSearchStatus('Map loaded with store list view');
      loadStoresForLocation(centerLat, centerLng, null, 'none');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance.current && !leafletMapInstance.current) {
      initMap();
    }
  }, [initMap]);

  // ═══════════════════════════════════════════════════════════
  // STORE LOADING & FILTERING
  // ═══════════════════════════════════════════════════════════

  const loadStoresForLocation = async (originLat, originLng, mapObj, engineType) => {
    setSearchStatus('Searching PMBJP Jan Aushadhi Kendras...');
    try {
      const results = await searchNearbyStores(mapObj, originLat, originLng);
      setStores(results);

      const nearest = findNearestStore(results, currentLocation.lat, currentLocation.lng);
      if (nearest) {
        setNearestStore(nearest.store);
        setSelectedStore(nearest.store);
      }

      plotMarkers(results, currentLocation.lat, currentLocation.lng, nearest?.store, engineType || mapEngine);
      if (nearest?.store) {
        calculateRoute(currentLocation.lat, currentLocation.lng, nearest.store, travelMode, engineType || mapEngine);
      }

      setSearchStatus(`Found ${results.length} Jan Aushadhi Kendras`);
    } catch (err) {
      console.error('[Map] Store loading failed, using fallback:', err);
      const fallback = NATIONWIDE_JAN_AUSHADHI_STORES.map(s => ({
        ...s,
        distance: haversineDistance(currentLocation.lat, currentLocation.lng, s.lat, s.lng)
      })).sort((a, b) => a.distance - b.distance);

      setStores(fallback);
      if (fallback.length > 0) {
        setNearestStore(fallback[0]);
        setSelectedStore(fallback[0]);
        plotMarkers(fallback, currentLocation.lat, currentLocation.lng, fallback[0], engineType || mapEngine);
        calculateRoute(currentLocation.lat, currentLocation.lng, fallback[0], travelMode, engineType || mapEngine);
      }
      setSearchStatus(`Loaded ${fallback.length} generic stores`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Apply Filters ──
  useEffect(() => {
    let list = [...stores];
    const originLat = currentLocation.lat;
    const originLng = currentLocation.lng;

    // Radius filter
    list = list.filter(s => {
      const d = s.distance ?? haversineDistance(originLat, originLng, s.lat, s.lng);
      return d <= radiusKm;
    });

    // Category filter
    if (activeFilter === 'nearest') {
      list = list.filter(s => {
        const d = s.distance ?? haversineDistance(originLat, originLng, s.lat, s.lng);
        return d <= 15;
      });
    } else if (activeFilter === 'open') {
      list = list.filter(s => s.hours && (s.hours.includes('24') || s.hours.includes('Open')));
    } else if (activeFilter === 'rated') {
      list = list.filter(s => s.rating && s.rating >= 4.8);
    }

    setFilteredStores(list);
  }, [stores, activeFilter, radiusKm, currentLocation]);

  // ═══════════════════════════════════════════════════════════
  // MAP MARKERS
  // ═══════════════════════════════════════════════════════════

  const plotMarkers = (storesList, originLat, originLng, nearestStoreObj, engine) => {
    const activeEngine = engine || mapEngine;

    // Clear previous markers
    markersRef.current.forEach(m => {
      try {
        if (m.remove) m.remove();
        if (m.removeFrom && leafletMapInstance.current) m.removeFrom(leafletMapInstance.current);
      } catch { /* ignore */ }
    });
    markersRef.current = [];

    // ── Mappls Engine Markers ──
    if (activeEngine === 'mappls' && mapInstance.current && window.mappls) {
      try {
        const originMarker = new window.mappls.Marker({
          map: mapInstance.current,
          position: { lat: originLat, lng: originLng },
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          width: 46, height: 46,
          popupHtml: `<div style="padding:12px;font-family:Inter,sans-serif;font-weight:700;color:#6366f1;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12)">
            🏫 <b>Swaminarayan University</b><br/>
            <span style="font-size:11px;color:#6b7280">Starting Point</span>
          </div>`
        });
        markersRef.current.push(originMarker);

        storesList.forEach(store => {
          const isNearest = nearestStoreObj?.id === store.id;
          const dist = haversineDistance(originLat, originLng, store.lat, store.lng);

          const marker = new window.mappls.Marker({
            map: mapInstance.current,
            position: { lat: store.lat, lng: store.lng },
            icon: isNearest
              ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
              : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            width: isNearest ? 44 : 32,
            height: isNearest ? 44 : 32,
            popupHtml: `<div style="padding:12px;font-family:Inter,sans-serif;max-width:240px;background:#fff;border-radius:12px;color:#1a1a1a;box-shadow:0 8px 24px rgba(0,0,0,0.12)">
              <b style="color:#059669;font-size:13px">${store.placeName}</b>
              <p style="font-size:11px;color:#6b7280;margin:4px 0">${store.placeAddress}</p>
              <div style="font-size:11px;color:#0284c7;font-weight:700">${formatDistance(dist)} away</div>
            </div>`
          });

          if (marker.addListener) {
            marker.addListener('click', () => handleSelectStore(store));
          }
          markersRef.current.push(marker);
        });
      } catch (e) {
        console.error('[Map] Mappls marker error:', e);
      }
      return;
    }

    // ── Leaflet Engine Markers ──
    if (activeEngine === 'leaflet' && leafletMapInstance.current && window.L) {
      const L = window.L;
      try {
        // Origin marker
        const originIcon = L.divIcon({
          className: 'custom-origin-marker',
          html: `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;border:2.5px solid #fff;box-shadow:0 4px 20px rgba(99,102,241,0.6);display:flex;align-items:center;gap:6px;white-space:nowrap;letter-spacing:0.3px">🏫 Swaminarayan Univ</div>`,
          iconSize: [170, 34],
          iconAnchor: [85, 17]
        });

        const originMarker = L.marker([originLat, originLng], { icon: originIcon })
          .addTo(leafletMapInstance.current)
          .bindPopup(`<div style="padding:6px;font-family:Inter,sans-serif">
            <b style="color:#6366f1;font-size:13px">🏫 Swaminarayan University</b>
            <p style="font-size:11px;color:#6b7280;margin:3px 0">Starting Point for All Routes</p>
          </div>`);
        markersRef.current.push(originMarker);

        // Store markers
        storesList.forEach(store => {
          const isNearest = nearestStoreObj?.id === store.id;
          const dist = haversineDistance(originLat, originLng, store.lat, store.lng);
          const open = isStoreOpen(store.hours);

          const storeIcon = L.divIcon({
            className: 'custom-store-marker',
            html: `<div style="position:relative">
              <div style="background:${isNearest ? 'linear-gradient(135deg,#10b981,#059669)' : open ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'linear-gradient(135deg,#6b7280,#4b5563)'};color:#fff;width:${isNearest ? '36px' : '30px'};height:${isNearest ? '36px' : '30px'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isNearest ? '16px' : '14px'};border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:all 0.2s">💊</div>
              ${isNearest ? '<div style="position:absolute;top:-8px;right:-8px;background:#10b981;color:#fff;font-size:8px;font-weight:900;padding:2px 4px;border-radius:6px;border:1.5px solid #fff">★</div>' : ''}
            </div>`,
            iconSize: [isNearest ? 36 : 30, isNearest ? 36 : 30],
            iconAnchor: [isNearest ? 18 : 15, isNearest ? 18 : 15]
          });

          const m = L.marker([store.lat, store.lng], { icon: storeIcon })
            .addTo(leafletMapInstance.current)
            .bindPopup(`<div style="padding:8px;font-family:Inter,sans-serif;max-width:240px">
              <b style="color:#059669;font-size:13px">${store.placeName}</b>
              <p style="font-size:11px;color:#6b7280;margin:4px 0">${store.placeAddress}</p>
              <div style="display:flex;gap:8px;margin-top:6px">
                <span style="font-size:11px;color:#0284c7;font-weight:700">📍 ${formatDistance(dist)}</span>
                <span style="font-size:11px;color:${open ? '#059669' : '#dc2626'};font-weight:600">${open ? '🟢 Open' : '🔴 Closed'}</span>
              </div>
            </div>`);

          m.on('click', () => handleSelectStore(store));
          markersRef.current.push(m);
        });
      } catch (e) {
        console.error('[Map] Leaflet marker error:', e);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ROUTING
  // ═══════════════════════════════════════════════════════════

  const calculateRoute = async (userLat, userLng, store, mode = 'driving', engine = null, fitFullRoute = false) => {
    setIsRouteLoading(true);
    const originLat = currentLocation.lat;
    const originLng = currentLocation.lng;

    const routeData = await fetchRealRoadRoute(originLat, originLng, store.lat, store.lng, mode);
    setIsRouteLoading(false);

    setRouteInfo({
      distance: routeData.distanceKm,
      duration: routeData.durationMins,
      mode
    });

    if (routeData.steps?.length > 0) {
      setTurnInstructions(routeData.steps);
    }

    const activeEngine = engine || mapEngine;

    // Draw polyline on Leaflet
    if (activeEngine === 'leaflet' && leafletMapInstance.current && window.L) {
      const L = window.L;

      // Clear old route lines
      if (routeLineRef.current) {
        if (Array.isArray(routeLineRef.current)) {
          routeLineRef.current.forEach(l => { try { l.remove(); } catch { /* ignore */ } });
        } else if (routeLineRef.current.remove) {
          routeLineRef.current.remove();
        }
      }

      // Glow shadow layer
      const shadowLine = L.polyline(routeData.coordinates, {
        color: '#6366f1',
        weight: 12,
        opacity: 0.2,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(leafletMapInstance.current);

      // Core route line
      const coreLine = L.polyline(routeData.coordinates, {
        color: mode === 'walking' ? '#f59e0b' : mode === 'cycling' ? '#10b981' : '#6366f1',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: mode === 'walking' ? '8, 12' : mode === 'cycling' ? '12, 6' : undefined
      }).addTo(leafletMapInstance.current);

      routeLineRef.current = [shadowLine, coreLine];

      if (fitFullRoute) {
        const bounds = L.latLngBounds(routeData.coordinates);
        leafletMapInstance.current.fitBounds(bounds, { padding: [60, 60] });
      } else {
        leafletMapInstance.current.setView([store.lat, store.lng], 15, { animate: true });
      }
    } else if (activeEngine === 'mappls' && mapInstance.current) {
      mapInstance.current.setCenter({ lat: store.lat, lng: store.lng });
      mapInstance.current.setZoom(15);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    calculateRoute(currentLocation.lat, currentLocation.lng, store, travelMode);

    if (mapEngine === 'mappls' && mapInstance.current) {
      mapInstance.current.setCenter({ lat: store.lat, lng: store.lng });
      mapInstance.current.setZoom(15);
    }
  };

  const handleFitFullRoute = () => {
    if (selectedStore) {
      calculateRoute(currentLocation.lat, currentLocation.lng, selectedStore, travelMode, null, true);
    }
  };

  const handleFocusStore = () => {
    if (selectedStore && leafletMapInstance.current) {
      leafletMapInstance.current.setView([selectedStore.lat, selectedStore.lng], 16, { animate: true });
    }
  };

  const startInAppNavigation = (storeToNav = null) => {
    const targetStore = storeToNav || selectedStore;
    if (!targetStore) return;
    setIsNavigatingInApp(true);
    setShowTurnPanel(true);
    calculateRoute(currentLocation.lat, currentLocation.lng, targetStore, travelMode);
  };

  const handleTravelModeChange = (mode) => {
    setTravelMode(mode);
    if (selectedStore) {
      calculateRoute(currentLocation.lat, currentLocation.lng, selectedStore, mode);
    }
  };

  const exitInAppNavigation = () => {
    setIsNavigatingInApp(false);
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchStatus(`Locating "${searchQuery}"...`);

    const result = await geocodeLocation(searchQuery);
    setIsSearching(false);

    if (result) {
      setCurrentLocation({ lat: result.lat, lng: result.lng, name: result.name });

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
        setCurrentLocation({ lat: result.lat, lng: result.lng, name: result.name });

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
    setCurrentLocation(SWAMINARAYAN_UNIVERSITY);

    if (mapEngine === 'mappls' && mapInstance.current) {
      mapInstance.current.setCenter({ lat: SWAMINARAYAN_UNIVERSITY.lat, lng: SWAMINARAYAN_UNIVERSITY.lng });
      mapInstance.current.setZoom(13);
    } else if (mapEngine === 'leaflet' && leafletMapInstance.current) {
      leafletMapInstance.current.setView([SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng], 13);
    }

    loadStoresForLocation(SWAMINARAYAN_UNIVERSITY.lat, SWAMINARAYAN_UNIVERSITY.lng);
  };

  const handleShare = (store) => {
    if (navigator.share) {
      navigator.share({
        title: store.placeName,
        text: `${store.placeName}\n${store.placeAddress}\n${store.phone || ''}`,
        url: `https://www.google.com/maps?q=${store.lat},${store.lng}`
      }).catch(() => { /* user cancelled */ });
    } else {
      navigator.clipboard?.writeText(`${store.placeName}\n${store.placeAddress}\nhttps://www.google.com/maps?q=${store.lat},${store.lng}`);
    }
  };


  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.4 } }}
      exit={{ opacity: 0 }}
      className="h-screen overflow-hidden bg-background text-text-main transition-colors duration-300 flex flex-col"
    >
      <Helmet>
        <title>Jan Aushadhi Store Locator | Sanjeevani</title>
        <meta name="description" content="Find nearby PMBJP Jan Aushadhi Kendras offering generic medicines at up to 90% lower cost. Real road routing & turn-by-turn directions." />
      </Helmet>
      <Navbar />

      <main className="pt-20 flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

        {/* ═══════════════════════════════════════════════════
            SIDEBAR
        ═══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`${sidebarCollapsed ? 'w-0 md:w-0 overflow-hidden' : 'w-full md:w-[440px]'} bg-card/80 backdrop-blur-xl border-r border-border flex flex-col z-10 shadow-2xl transition-all duration-300`}
        >
          {/* ── Header & Search ── */}
          <div className="p-5 border-b border-border/50 space-y-3">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold flex items-center gap-2.5 text-text-main">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MapIcon className="text-white" size={16} />
                </div>
                Jan Aushadhi Finder
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Zap size={10} /> {mapEngine === 'mappls' ? 'MapmyIndia' : 'Live Map'}
              </span>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative group">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search city, area, or pincode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 text-sm bg-background/80 border border-border/50 rounded-2xl text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all shadow-sm"
              />
              <Search className="absolute left-4 top-3.5 text-text-muted/50 group-focus-within:text-emerald-500 transition-colors" size={16} />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-text-muted/50 hover:text-text-main transition-colors p-0.5 rounded-lg hover:bg-background">
                  <X size={16} />
                </button>
              ) : null}
            </form>

            {/* City Quick-Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {POPULAR_CITIES.slice(0, 7).map((city, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCityClick(city)}
                  className="px-3 py-1.5 rounded-xl bg-background/60 hover:bg-emerald-500 hover:text-white transition-all whitespace-nowrap text-text-main text-[11px] font-semibold border border-border/40 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center gap-1"
                >
                  <span className="text-xs">{city.icon}</span> {city.name}
                </motion.button>
              ))}
            </div>

            {/* Origin Banner */}
            <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/15">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 truncate pr-2">
                <School className="text-indigo-500 shrink-0" size={15} />
                <span className="truncate font-bold">
                  {currentLocation.name || 'Swaminarayan University'}
                </span>
              </div>
              <button
                onClick={handleResetLocation}
                className="text-indigo-500 font-bold hover:underline shrink-0 flex items-center gap-1 text-[11px] hover:text-indigo-400 transition-colors"
              >
                <LocateFixed size={12} /> Reset
              </button>
            </div>

            {/* Radius Slider */}
            <div>
              <button
                onClick={() => setShowRadiusSlider(!showRadiusSlider)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted hover:text-text-main transition-colors"
              >
                <SlidersHorizontal size={12} />
                Radius: {radiusKm} km
                {showRadiusSlider ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {showRadiusSlider && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mt-2 px-1">
                      <span className="text-[10px] text-text-muted font-medium">1 km</span>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                        className="flex-1 h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-[10px] text-text-muted font-medium">50 km</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Navigation Turn Panel (Active Route - Left Sidebar) ── */}
          {isNavigatingInApp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-5 border-b border-border/50 bg-card/40 backdrop-blur-md space-y-3.5"
            >
              {/* Header Row (Matching Screenshot 1) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation2 size={16} className="text-emerald-500 font-bold animate-pulse" />
                  <span className="font-extrabold text-emerald-500 tracking-widest uppercase text-xs">
                    TURN-BY-TURN ROUTE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTurnPanel(!showTurnPanel)}
                    className="p-1 text-text-muted hover:text-text-main transition-colors"
                  >
                    <ChevronUp size={16} className={`transition-transform duration-200 ${showTurnPanel ? '' : 'rotate-180'}`} />
                  </button>
                  <button
                    onClick={exitInAppNavigation}
                    className="px-3.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-full border border-red-500/20 transition-all"
                  >
                    Exit
                  </button>
                </div>
              </div>

              {/* Mode Selector Pills (Matching Screenshot 1) */}
              <div className="flex items-center gap-1.5 p-1 bg-background/60 rounded-full border border-border/30">
                {[
                  { mode: 'driving', icon: Car, label: 'Drive' },
                  { mode: 'walking', icon: Footprints, label: 'Walk' },
                  { mode: 'cycling', icon: Bike, label: 'Cycle' }
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => handleTravelModeChange(mode)}
                    className={`flex-1 py-2 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all ${
                      travelMode === mode
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Turn Instruction Cards Stack (Matching Screenshot 1) */}
              <AnimatePresence>
                {showTurnPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin pr-1"
                  >
                    {turnInstructions.map((step, idx) => (
                      <motion.div
                        key={step.id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="p-3.5 rounded-2xl bg-card/90 border border-border/40 shadow-sm flex items-start gap-3 backdrop-blur-md hover:shadow-md transition-all"
                      >
                        <div className="w-8 h-8 rounded-xl bg-background border border-border/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0 shadow-xs mt-0.5">
                          {step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-text-main leading-snug">
                            {step.text}
                          </p>
                          <span className="text-[11px] font-extrabold text-emerald-500 dark:text-emerald-400 mt-1 block">
                            {step.dist}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Filter Tabs (Non-Navigation Mode) ── */}
          {!isNavigatingInApp && (
            <div className="px-5 py-3 border-b border-border/30 flex items-center gap-1.5 overflow-x-auto bg-background/30 text-xs scrollbar-thin">
              <Filter size={13} className="text-text-muted shrink-0" />
              {[
                { id: 'all', label: `All (${stores.length})` },
                { id: 'nearest', label: 'Near (<15km)' },
                { id: 'open', label: '24/7 Open' },
                { id: 'rated', label: 'Top Rated ★' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                    activeFilter === f.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-text-muted hover:text-text-main hover:bg-background/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Loading Status Bar ── */}
          <AnimatePresence>
            {(isLoading || isSearching || geoLoading || isRouteLoading) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/15 flex items-center gap-3"
              >
                <Loader2 className="animate-spin text-emerald-500" size={15} />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {isRouteLoading ? 'Calculating real road route...' : searchStatus}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Store Cards List ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
            {filteredStores.length === 0 && !isLoading ? (
              <div className="text-center py-16 px-4">
                <MapPin className="mx-auto text-text-muted/20 mb-4" size={52} />
                <h4 className="text-text-main font-bold text-base">No Kendras found</h4>
                <p className="text-text-muted text-xs mt-1.5">Try adjusting the radius slider or search another city.</p>
                <button
                  onClick={() => { setActiveFilter('all'); setRadiusKm(50); setSearchQuery(''); }}
                  className="mt-5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
                >
                  Show All Kendras
                </button>
              </div>
            ) : (
              filteredStores.map((store, idx) => {
                const isNearest = nearestStore?.id === store.id;
                const isSelected = selectedStore?.id === store.id;
                const rawDistKm = store.distance ?? haversineDistance(currentLocation.lat, currentLocation.lng, store.lat, store.lng);
                const distText = formatDistance(rawDistKm);
                const open = isStoreOpen(store.hours);

                return (
                  <motion.div
                    key={store.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.025, type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={() => handleSelectStore(store)}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white border-emerald-400/50 shadow-xl shadow-emerald-500/20 scale-[1.01]'
                        : isNearest
                        ? 'bg-emerald-500/8 border-emerald-500/30 text-text-main hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10'
                        : 'bg-background/60 border-border/40 text-text-main hover:border-emerald-500/30 hover:shadow-md'
                    }`}
                  >
                    {/* Nearest Badge */}
                    {isNearest && (
                      <div className={`absolute top-0 right-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'} text-[9px] font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1`}>
                        <Star size={9} fill="currentColor" /> CLOSEST
                      </div>
                    )}

                    {/* Store Name */}
                    <div className="flex justify-between items-start mb-1.5 pr-16">
                      <h3 className="font-semibold text-sm leading-tight">{store.placeName}</h3>
                    </div>

                    {/* Address */}
                    <p className={`text-[11px] mb-3 leading-relaxed ${isSelected ? 'text-white/75' : 'text-text-muted'}`}>
                      {store.placeAddress}
                    </p>

                    {/* Meta Row */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] mb-3">
                      <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <Route size={12} /> {distText}
                      </span>
                      <span className={`flex items-center gap-1 ${isSelected ? 'text-white/70' : open ? 'text-emerald-600' : 'text-red-500'}`}>
                        <Clock size={11} /> {open ? 'Open' : 'Closed'}
                      </span>
                      {store.rating && (
                        <span className={`flex items-center gap-0.5 ${isSelected ? 'text-yellow-200' : 'text-amber-500'}`}>
                          <Star size={10} fill="currentColor" /> {store.rating}
                        </span>
                      )}
                      {store.discount && (
                        <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          <BadgePercent size={11} /> {store.discount}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-current/10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectStore(store); startInAppNavigation(store); }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                          isSelected ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                        }`}
                      >
                        <Compass size={12} /> Directions
                      </button>
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all ${
                            isSelected ? 'bg-white/15 text-white hover:bg-white/25 border border-white/15' : 'bg-background border border-border/40 text-text-main hover:border-emerald-500/30'
                          }`}
                        >
                          <Phone size={11} /> Call
                        </a>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(store); }}
                        className={`p-1.5 rounded-xl transition-all ${
                          isSelected ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-background border border-border/40 text-text-muted hover:text-text-main'
                        }`}
                      >
                        <Share2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            SIDEBAR TOGGLE (Mobile)
        ═══════════════════════════════════════════════════ */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute left-[440px] top-1/2 -translate-y-1/2 z-30 w-6 h-14 bg-card/90 backdrop-blur border border-border/40 rounded-r-xl items-center justify-center shadow-lg hover:bg-primary/10 transition-all"
          style={{ left: sidebarCollapsed ? 0 : '440px' }}
        >
          <ChevronRight size={14} className={`text-text-muted transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* ═══════════════════════════════════════════════════
            MAP CANVAS
        ═══════════════════════════════════════════════════ */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 overflow-hidden min-h-0">
          <div id="mappls-map-container" ref={mapRef} className="w-full h-full min-h-[400px]" />

          {/* Loading Overlay */}
          <AnimatePresence>
            {(isLoading || geoLoading) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center z-20"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="glass-card p-10 rounded-3xl flex flex-col items-center max-w-xs text-center border border-border/50 shadow-2xl"
                >
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                      <MapIcon className="text-white" size={36} />
                    </div>
                    <Loader2 className="absolute -bottom-1 -right-1 animate-spin text-indigo-500" size={24} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-text-main">Loading Map Engine</h3>
                  <p className="text-text-muted text-xs mt-1.5">{searchStatus}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Navigation Floating Banner ── */}
          <AnimatePresence>
            {isNavigatingInApp && selectedStore && routeInfo && (
              <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                className="absolute top-4 left-4 right-4 md:left-6 md:right-16 z-20 bg-gradient-to-r from-slate-900/95 via-emerald-900/90 to-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-between border border-emerald-500/20 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                    <CornerUpRight size={22} className="text-white animate-bounce" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400/70 flex items-center gap-1">
                      <School size={10} /> From: {currentLocation.name || 'Swaminarayan Univ'}
                    </span>
                    <h4 className="font-bold text-sm truncate">→ {selectedStore.placeName}</h4>
                    <p className="text-[11px] text-white/60 truncate">
                      {routeInfo.distance} km • ~{routeInfo.duration} min ({travelMode})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleFocusStore}
                    title="Focus on Store"
                    className="px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-1"
                  >
                    <MapPin size={13} /> Store
                  </button>
                  <button
                    onClick={handleFitFullRoute}
                    title="View Full Route"
                    className="px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-1"
                  >
                    <Route size={13} /> Route
                  </button>
                  <button
                    onClick={exitInAppNavigation}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-xl text-xs font-bold transition-all border border-red-500/20"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Floating Turn-by-Turn Navigation Cards Stack (Left Side of Map) ── */}
          <AnimatePresence>
            {isNavigatingInApp && turnInstructions.length > 0 && (
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="absolute top-16 left-4 z-30 w-80 max-w-[calc(100%-2rem)] flex flex-col gap-2.5 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin p-1"
              >
                {/* Active Route Title Badge */}
                <div
                  className="p-3 rounded-2xl shadow-xl flex items-center justify-between backdrop-blur-xl border text-xs"
                  style={{
                    background: 'rgba(215, 204, 190, 0.85)',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                  }}
                >
                  <div className="flex items-center gap-2 font-bold text-stone-900 truncate">
                    <Compass className="animate-spin text-emerald-600 shrink-0" size={16} />
                    <span className="truncate">Navigating to {selectedStore?.placeName}</span>
                  </div>
                  <button
                    onClick={exitInAppNavigation}
                    className="p-1 rounded-lg hover:bg-stone-900/10 text-stone-700 transition-all shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Turn Instruction Cards (Matching User's Reference Image) */}
                {turnInstructions.map((step, idx) => (
                  <motion.div
                    key={step.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3.5 rounded-2xl shadow-lg flex items-start gap-3 transition-all backdrop-blur-xl border hover:scale-[1.02]"
                    style={{
                      background: 'rgba(215, 204, 190, 0.72)',
                      backdropFilter: 'blur(18px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(160%)',
                      border: '1px solid rgba(255, 255, 255, 0.45)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-stone-900/10 border border-stone-900/10 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 shadow-xs">
                      <span className="text-sm font-bold">{step.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-stone-900 leading-snug">
                        {step.text}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
                        {step.dist}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Map Floating Badges (Non-Nav) ── */}
          <AnimatePresence>
            {!isNavigatingInApp && !isLoading && stores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2"
              >
                <div className="glass-card px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xl border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold bg-emerald-500/10 backdrop-blur-xl">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>{filteredStores.length} Jan Aushadhi Kendras</span>
                </div>
                <div className="glass-card px-3 py-2 rounded-xl shadow-xl text-[11px] font-semibold text-text-muted border border-border/40 backdrop-blur-xl">
                  🗺️ {mapEngine === 'mappls' ? 'MapmyIndia SDK' : 'OpenStreetMap'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Floating Glassmorphic Navigation Panel (Bottom-Left on Map) ── */}
          <AnimatePresence>
            {selectedStore && routeInfo && (
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="absolute bottom-5 left-5 z-20 w-[340px] max-w-[calc(100%-5rem)] rounded-3xl overflow-hidden shadow-2xl shadow-black/20"
                style={{
                  background: 'rgba(15, 23, 42, 0.55)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                {/* Header — Store Info & Distance */}
                <div className="p-4 pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-emerald-400/90 flex items-center gap-1 mb-1">
                        <CheckCircle2 size={10} /> Route to
                      </span>
                      <h4 className="font-bold text-[13px] leading-tight text-white/95 truncate">
                        {selectedStore.placeName}
                      </h4>
                      <p className="text-[10px] text-white/40 mt-0.5 truncate">{selectedStore.placeAddress}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[22px] font-black text-white/95 leading-none">
                        {routeInfo.distance}
                        <span className="text-[11px] font-medium text-white/50 ml-0.5">km</span>
                      </div>
                      <div className="text-[10px] text-white/40 flex items-center justify-end gap-1 mt-1">
                        <Clock size={10} /> ~{routeInfo.duration} min • {routeInfo.mode}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

                {/* Actions */}
                <div className="p-4 pt-3 space-y-2.5">
                  {/* Start Navigation */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startInAppNavigation()}
                    className="w-full py-3 px-4 rounded-2xl text-[12px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      background: isNavigatingInApp
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(20,184,166,0.35))'
                        : 'linear-gradient(135deg, #10b981, #14b8a6)',
                      color: '#fff',
                      boxShadow: isNavigatingInApp ? 'none' : '0 8px 24px rgba(16,185,129,0.35)',
                      border: isNavigatingInApp ? '1px solid rgba(16,185,129,0.3)' : 'none',
                    }}
                  >
                    <Navigation2 size={15} />
                    {isNavigatingInApp ? '🧭 Route Active' : '🧭 Start Navigation'}
                  </motion.button>

                  {/* Quick Action Row */}
                  <div className="grid grid-cols-2 gap-2">
                    {selectedStore.phone && (
                      <a
                        href={`tel:${selectedStore.phone}`}
                        className="py-2.5 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all text-white/80 hover:text-white"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <Phone size={12} /> Call Store
                      </a>
                    )}
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedStore.lat},${selectedStore.lng}&travelmode=driving`;
                        window.open(url, '_blank');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all text-white/80 hover:text-white ${!selectedStore.phone ? 'col-span-2' : ''}`}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <ExternalLink size={12} /> Google Maps
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Recenter FAB ── */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleResetLocation}
            title="Recenter Map"
            className="absolute bottom-6 right-6 z-20 p-3.5 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all flex items-center gap-2 font-bold text-xs border border-indigo-400/20"
          >
            <LocateFixed size={18} /> Recenter
          </motion.button>
        </div>
      </main>

      {/* ── Scoped Styles ── */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.6); }
        #mappls-map-container .leaflet-container { font-family: Inter, sans-serif; }
        .dark #mappls-map-container .leaflet-container { background: #0f172a; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #14b8a6);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #14b8a6);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </motion.div>
  );
}
