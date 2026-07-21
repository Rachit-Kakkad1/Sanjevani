import { useState, useEffect, useCallback } from 'react';

// Default fallback: Swaminarayan University, Kalol, Gujarat (382721)
const DEFAULT_LOCATION = { lat: 23.2137, lng: 72.4938 };

/**
 * Custom hook to get user's current geolocation.
 * Falls back to Swaminarayan University coordinates if browser geolocation permission is pending or denied.
 */
export default function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocation(DEFAULT_LOCATION);
      setIsFallback(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsFallback(false);
        setLoading(false);
      },
      (err) => {
        console.warn('Geolocation error, using Swaminarayan University fallback:', err.message);
        let msg = 'Location access denied.';
        if (err.code === 2) msg = 'Location unavailable.';
        if (err.code === 3) msg = 'Location request timed out.';
        setError(msg);
        setLocation(DEFAULT_LOCATION);
        setIsFallback(true);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, error, loading, isFallback, retry: requestLocation };
}
