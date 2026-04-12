import { ICON_SIZES } from './tokens';

const DEFAULT_LEAF_PATH = 'M40 75 Q15 40 40 5 Q65 40 40 75 Z';

interface PlantIconProps {
  color?: string;
  strokeColor?: string;
  height?: number;
  leafPath?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Explicit pixel width — overrides `size` token when provided. */
  pixelSize?: number;
  showSoil?: boolean;
  className?: string;
}

export function PlantIcon({
  color = '#c0392b',
  strokeColor = '#a02318',
  height = 45,
  leafPath = DEFAULT_LEAF_PATH,
  size = 'md',
  pixelSize,
  showSoil = true,
  className,
}: PlantIconProps) {
  const tokens = ICON_SIZES[size];
  const w = pixelSize ?? tokens.width;
  const h = pixelSize ? pixelSize * (tokens.height / tokens.width) : tokens.height;

  // Center Y of the flower head
  const flowerCY = 108 - height;

  return (
    <svg viewBox="0 0 80 110" width={w} height={h} className={className}>
      {/* Soil mound at base */}
      {showSoil && (
        <ellipse cx="40" cy="107" rx="22" ry="4" fill="#c4a882" opacity="0.4" />
      )}
      {/* Stem — gentle curve instead of a straight line */}
      <path
        d={`M40 105 Q37 ${55 + (110 - height) / 2} 40 ${110 - height}`}
        fill="none"
        stroke="#4a7c59"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Upper leaves (original position) */}
      <path d={leafPath} transform={`translate(0 ${100 - height})`} fill="#7cb587" stroke="#4a7c59" strokeWidth="1.5" />
      {/* Lower side leaves — always show a small pair midway on the stem */}
      <path d="M40 90 Q30 84 33 78" fill="none" stroke="#7cb587" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 90 Q50 84 47 78" fill="none" stroke="#7cb587" strokeWidth="2" strokeLinecap="round" />
      {/* Extra lower leaves for taller plants */}
      {height > 50 && (
        <>
          <path d="M39 97 Q32 93 34 88" fill="none" stroke="#7cb587" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M41 97 Q48 93 46 88" fill="none" stroke="#7cb587" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {/* Petals — 5 small ellipses arranged around the flower center */}
      {[0, 72, 144, 216, 288].map(angle => (
        <ellipse
          key={angle}
          cx={40 + 7 * Math.cos((angle - 90) * Math.PI / 180)}
          cy={flowerCY + 7 * Math.sin((angle - 90) * Math.PI / 180)}
          rx="4.5"
          ry="3"
          fill={color}
          stroke={strokeColor}
          strokeWidth="0.8"
          transform={`rotate(${angle} ${40 + 7 * Math.cos((angle - 90) * Math.PI / 180)} ${flowerCY + 7 * Math.sin((angle - 90) * Math.PI / 180)})`}
        />
      ))}
      {/* Flower center */}
      <circle cx="40" cy={flowerCY} r="5" fill={color} stroke={strokeColor} strokeWidth="1.5" />
      {/* Highlight on center */}
      <circle cx="38.5" cy={flowerCY - 1.5} r="1.5" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}
