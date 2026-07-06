'use client';

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { numericToAlpha2 } from 'i18n-iso-countries';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export type CountryMapEntry = {
  code: string | null;
  name: string;
  total: number;
};

function interpolateColor(ratio: number) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const start = { r: 0xd9, g: 0xf2, b: 0xe6 };
  const end = { r: 0x0f, g: 0x7a, b: 0x4d };
  const r = Math.round(start.r + (end.r - start.r) * clamped);
  const g = Math.round(start.g + (end.g - start.g) * clamped);
  const b = Math.round(start.b + (end.b - start.b) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function DashboardCountryMap({ entries }: { entries: CountryMapEntry[] }) {
  const [hovered, setHovered] = useState<{ name: string; total: number } | null>(null);

  const totalsByAlpha2 = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const entry of entries) {
      if (entry.code) {
        map.set(entry.code, { name: entry.name, total: entry.total });
      }
    }
    return map;
  }, [entries]);

  const maxTotal = useMemo(
    () => entries.reduce((max, entry) => Math.max(max, entry.total), 0),
    [entries],
  );

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <ComposableMap projectionConfig={{ scale: 140 }} height={320} style={{ width: '100%', height: 320 }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const alpha2 = numericToAlpha2(String(geo.id ?? '')) ?? null;
                const match = alpha2 ? totalsByAlpha2.get(alpha2) : undefined;
                const fill = match && maxTotal > 0 ? interpolateColor(match.total / maxTotal) : '#e9ecef';

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    onMouseEnter={() => {
                      if (match) {
                        setHovered({ name: match.name, total: match.total });
                      }
                    }}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: match ? '#0f7a4d' : '#e9ecef' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {hovered ? (
          <div
            className="badge bg-dark position-absolute top-0 start-0 m-2"
            style={{ pointerEvents: 'none' }}
          >
            {hovered.name}: {hovered.total}
          </div>
        ) : null}
      </div>
      <p className="text-muted small mb-0 mt-2">
        Darker shading indicates a higher cart count. Hover a country for details.
      </p>
    </div>
  );
}
