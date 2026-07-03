'use client';

import { colors } from '@eveider/config-ui';
import type { LockerOption } from './locker-card';

type LockerVisualMapProps = {
  lockers: LockerOption[];
  selectedLockerId: string;
  onSelectLocker: (lockerId: string) => void;
};

// Map scale bounds (matching Kinshasa coordinates range)
const MIN_LAT = -4.42;
const MAX_LAT = -4.28;
const MIN_LON = 15.20;
const MAX_LON = 15.35;

function projectCoords(lat: number, lon: number, width: number, height: number) {
  // Map longitude to X
  const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * width;
  // Map latitude to Y (inverted since Y increases downwards)
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * height;
  return { x, y };
}

export function LockerVisualMap({ lockers, selectedLockerId, onSelectLocker }: LockerVisualMapProps) {
  const width = 500;
  const height = 400;

  return (
    <div
      style={{
        background: '#1a1a1a', // Dark theme for that Tesla-style operational wayfinding feel
        borderRadius: '12px',
        border: `1px solid ${colors.secondary}`,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Telemetry/Console overlay text */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          color: '#888888',
          fontFamily: 'monospace',
          fontSize: '0.625rem',
          pointerEvents: 'none',
          letterSpacing: '0.1em',
        }}
      >
        EVEIDER LOCALIZATION ENGINE v1.2
        <br />
        DRC / KINSHASA SYSTEM GRID
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        {/* Background Grid Lines */}
        <defs>
          <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Congo River (Fleuve Congo) Outline */}
        <path
          d="M -50,50 Q 80,40 180,60 T 320,30 T 400,-10 T 550,-30"
          fill="none"
          stroke="#1e2c3b"
          strokeWidth="32"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M -50,50 Q 80,40 180,60 T 320,30 T 400,-10 T 550,-30"
          fill="none"
          stroke="#2d4259"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* River Label */}
        <text
          x="120"
          y="35"
          fill="#4b6584"
          fontSize="9"
          fontWeight="700"
          letterSpacing="2"
          opacity="0.6"
          transform="rotate(6, 120, 35)"
        >
          FLEUVE CONGO
        </text>

        {/* Main Road Lines (Boulevards & Avenues) */}
        {/* Boulevard du 30 Juin */}
        <path
          d="M 120,340 L 220,180 L 360,75"
          fill="none"
          stroke="#2f3542"
          strokeWidth="4"
          opacity="0.6"
        />
        <text
          x="260"
          y="110"
          fill="#57606f"
          fontSize="7"
          fontWeight="600"
          letterSpacing="1"
          opacity="0.5"
          transform="rotate(-35, 260, 110)"
        >
          BLVD DU 30 JUIN
        </text>

        {/* Boulevard Lumumba */}
        <path
          d="M 370,75 L 380,180 L 480,280"
          fill="none"
          stroke="#2f3542"
          strokeWidth="4"
          opacity="0.6"
        />
        <text
          x="420"
          y="215"
          fill="#57606f"
          fontSize="7"
          fontWeight="600"
          letterSpacing="1"
          opacity="0.5"
          transform="rotate(45, 420, 215)"
        >
          BLVD LUMUMBA
        </text>

        {/* District Labels */}
        <text x="320" y="95" fill="#57606f" fontSize="9" fontWeight="700" opacity="0.4" letterSpacing="1">
          GOMBE
        </text>
        <text x="410" y="160" fill="#57606f" fontSize="9" fontWeight="700" opacity="0.4" letterSpacing="1">
          LIMETE
        </text>
        <text x="70" y="290" fill="#57606f" fontSize="9" fontWeight="700" opacity="0.4" letterSpacing="1">
          NGALIEMA
        </text>
        <text x="210" y="230" fill="#57606f" fontSize="8" fontWeight="700" opacity="0.3" letterSpacing="1">
          KINTAMBO
        </text>

        {/* Map Markers for Lockers */}
        {lockers.map((locker) => {
          const lat = locker.latitude ?? 0;
          const lon = locker.longitude ?? 0;
          if (!lat || !lon) return null;

          const { x, y } = projectCoords(lat, lon, width, height);
          const isSelected = locker.id === selectedLockerId;
          const isFull = locker.availableCompartments === 0;

          // Compute status colors
          let markerColor: string = colors.success;
          if (locker.availableCompartments === 1) {
            markerColor = colors.warning;
          } else if (isFull) {
            markerColor = colors.danger;
          }

          return (
            <g
              key={locker.id}
              onClick={() => {
                if (!isFull) onSelectLocker(locker.id);
              }}
              style={{ cursor: isFull ? 'not-allowed' : 'pointer' }}
            >
              {/* Pulse Ring for Selected Marker */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r="18"
                  fill="none"
                  stroke={markerColor}
                  strokeWidth="1.5"
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values="8;24"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Marker Dot Outer Ring */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? '10' : '7'}
                fill={isSelected ? '#121212' : '#222222'}
                stroke={markerColor}
                strokeWidth="2"
                style={{ transition: 'all 0.2s' }}
              />

              {/* Marker Dot Inner Center */}
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={isFull ? '#555555' : markerColor}
              />

              {/* Tooltip Card above/below marker */}
              <g
                transform={`translate(${x}, ${y - (isSelected ? 26 : 20)})`}
                style={{ pointerEvents: 'none' }}
              >
                {/* Background Box */}
                <rect
                  x="-70"
                  y="-26"
                  width="140"
                  height="22"
                  rx="4"
                  fill={isSelected ? '#FFFFFF' : '#121212'}
                  stroke={isSelected ? colors.success : '#333333'}
                  strokeWidth="1"
                  opacity="0.95"
                />
                {/* Text */}
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill={isSelected ? '#121212' : '#FFFFFF'}
                  fontSize="8"
                  fontWeight="700"
                  letterSpacing="0.04em"
                >
                  {locker.name.toUpperCase()} ({locker.availableCompartments} dispo.)
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
