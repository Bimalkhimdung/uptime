'use client';
import { useEffect, useMemo, useState } from 'react';

const W = 520;
const H = 260;

function project(lng: number, lat: number): [number, number] {
  // Equirectangular: -180..180 → 0..W, 90..-90 → 0..H
  return [(lng + 180) * (W / 360), (90 - lat) * (H / 180)];
}

function ringToPath(ring: number[][]): string {
  return ring
    .map(([lng, lat], i) => {
      const [x, y] = project(lng, lat);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
}

function geometryToPath(geometry: { type: string; coordinates: any }): string {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as number[][][]).map(ringToPath).join(' ');
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][])
      .map((poly) => poly.map(ringToPath).join(' '))
      .join(' ');
  }
  return '';
}

type Feature = {
  type: 'Feature';
  geometry: { type: string; coordinates: any };
  properties: Record<string, any>;
};

type Props = {
  monitor: {
    serverLat?: number | null;
    serverLng?: number | null;
    serverCountry?: string | null;
    serverCity?: string | null;
    serverRegion?: string | null;
    serverIp?: string | null;
  };
};

export function RegionMap({ monitor }: Props) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/world.geojson')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setFeatures(d.features);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lat = monitor.serverLat;
  const lng = monitor.serverLng;
  const hasLoc = typeof lat === 'number' && typeof lng === 'number';
  const marker = hasLoc ? project(lng!, lat!) : null;

  const paths = useMemo(() => {
    if (!features) return null;
    return features.map((f, i) => (
      <path
        key={i}
        d={geometryToPath(f.geometry)}
        fill="none"
        stroke="#3a4254"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    ));
  }, [features]);

  const locationLabel =
    monitor.serverCity && monitor.serverCountry
      ? `${monitor.serverCity}, ${monitor.serverCountry}`
      : monitor.serverCountry || monitor.serverRegion || 'Unknown';

  return (
    <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
      <h3 className="font-bold text-white mb-6">
        Regions<span className="text-emerald-400">.</span>
      </h3>

      <div className="relative bg-[#13151a] rounded-lg overflow-hidden border border-white/5 aspect-[2/1]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {paths}
          {marker && (
            <g>
              <circle
                cx={marker[0]}
                cy={marker[1]}
                r="16"
                fill="#10b981"
                opacity="0.18"
              >
                <animate
                  attributeName="r"
                  from="12"
                  to="22"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.3"
                  to="0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={marker[0]} cy={marker[1]} r="7" fill="#10b981" />
              <circle cx={marker[0]} cy={marker[1]} r="3" fill="#ffffff" />
            </g>
          )}
        </svg>

        {!features && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 uppercase tracking-widest">
            Loading map…
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 uppercase tracking-widest">
            Map failed to load
          </div>
        )}
      </div>

      <div className="mt-3">
        {hasLoc ? (
          <>
            <p className="text-sm text-white font-semibold">{locationLabel}</p>
            {monitor.serverIp && (
              <p className="text-xs text-slate-500 mt-0.5">IP {monitor.serverIp}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Awaiting first geo lookup…</p>
        )}
      </div>
    </div>
  );
}
