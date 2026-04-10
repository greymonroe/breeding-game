import { ICON_SIZES } from './tokens';

const DEFAULT_LEAF_PATH = 'M40 75 Q15 40 40 5 Q65 40 40 75 Z';

interface PlantIconProps {
  color?: string;
  strokeColor?: string;
  height?: number;
  leafPath?: string;
  size?: 'sm' | 'md' | 'lg';
  showSoil?: boolean;
  className?: string;
}

export function PlantIcon({
  color = '#c0392b',
  strokeColor = '#a02318',
  height = 45,
  leafPath = DEFAULT_LEAF_PATH,
  size = 'md',
  showSoil = true,
  className,
}: PlantIconProps) {
  const { width, height: svgHeight } = ICON_SIZES[size];

  return (
    <svg viewBox="0 0 80 110" width={width} height={svgHeight} className={className}>
      {/* Soil mound at base */}
      {showSoil && (
        <ellipse cx="40" cy="107" rx="22" ry="4" fill="#c4a882" opacity="0.4" />
      )}
      {/* Stem */}
      <line x1="40" y1="105" x2="40" y2={110 - height} stroke="#4a7c59" strokeWidth="3" strokeLinecap="round" />
      {/* Leaves */}
      <path d={leafPath} transform={`translate(0 ${100 - height})`} fill="#7cb587" stroke="#4a7c59" strokeWidth="1.5" />
      {/* Small side leaves */}
      {height > 50 && (
        <>
          <path d="M40 85 Q30 78 35 72" fill="none" stroke="#7cb587" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 85 Q50 78 45 72" fill="none" stroke="#7cb587" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {/* Flower/Fruit circle */}
      <circle cx="40" cy={108 - height} r="10" fill={color} stroke={strokeColor} strokeWidth="1.5" />
      {/* Highlight on fruit */}
      <circle cx="37" cy={105 - height} r="2.5" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}
