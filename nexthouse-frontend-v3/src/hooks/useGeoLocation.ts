import { useState, useEffect, useRef } from 'react';

const DEFAULT = { lat: 3.139, lon: 101.6869 };

export function useGeoLocation(onLocation?: (loc: { lat: number; lon: number }) => void) {
  const [loc, setLoc] = useState(DEFAULT);
  const cbRef = useRef(onLocation);
  cbRef.current = onLocation;

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      const newLoc = { lat: p.coords.latitude, lon: p.coords.longitude };
      setLoc(newLoc);
      cbRef.current?.(newLoc);
    });
  }, []);

  return loc;
}