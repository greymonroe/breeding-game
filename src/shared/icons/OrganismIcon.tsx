import { ICON_SIZES } from './tokens';
import { PlantIcon } from './PlantIcon';

interface OrganismIconProps {
  type?: 'plant' | 'mouse' | 'pea';
  color: string;
  strokeColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OrganismIcon({
  type = 'plant',
  color,
  strokeColor,
  size = 'md',
  className,
}: OrganismIconProps) {
  if (type === 'plant') {
    return (
      <PlantIcon
        color={color}
        strokeColor={strokeColor ?? color}
        size={size}
        className={className}
      />
    );
  }

  const { width } = ICON_SIZES[size];
  const stroke = strokeColor ?? color;

  if (type === 'mouse') {
    return (
      <svg viewBox="0 0 80 80" width={width} height={width} className={className}>
        {/* Body */}
        <ellipse cx="40" cy="48" rx="20" ry="16" fill={color} stroke={stroke} strokeWidth="1.5" />
        {/* Left ear */}
        <ellipse cx="28" cy="30" rx="8" ry="10" fill={color} stroke={stroke} strokeWidth="1.5" />
        <ellipse cx="28" cy="30" rx="5" ry="7" fill="rgba(255,200,200,0.4)" />
        {/* Right ear */}
        <ellipse cx="52" cy="30" rx="8" ry="10" fill={color} stroke={stroke} strokeWidth="1.5" />
        <ellipse cx="52" cy="30" rx="5" ry="7" fill="rgba(255,200,200,0.4)" />
        {/* Eyes */}
        <circle cx="34" cy="44" r="2" fill="#1a1a1a" />
        <circle cx="46" cy="44" r="2" fill="#1a1a1a" />
        {/* Nose */}
        <ellipse cx="40" cy="50" rx="2.5" ry="1.5" fill="#e8a0a0" />
        {/* Tail */}
        <path d="M58 52 Q70 48 72 60 Q74 70 66 68" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // pea
  return (
    <svg viewBox="0 0 80 80" width={width} height={width} className={className}>
      {/* Pod */}
      <ellipse cx="40" cy="40" rx="28" ry="20" fill="#7cb587" stroke="#4a7c59" strokeWidth="1.5" />
      {/* Peas inside */}
      <circle cx="28" cy="40" r="10" fill={color} stroke={stroke} strokeWidth="1.5" />
      <circle cx="44" cy="40" r="10" fill={color} stroke={stroke} strokeWidth="1.5" />
      <circle cx="58" cy="40" r="8" fill={color} stroke={stroke} strokeWidth="1.5" opacity="0.7" />
      {/* Pod line */}
      <path d="M14 40 Q40 28 66 40" fill="none" stroke="#4a7c59" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
