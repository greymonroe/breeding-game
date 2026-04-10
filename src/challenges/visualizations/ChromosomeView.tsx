import { useState } from 'react';
import { useGame } from '../../game/state';

/** Known Mendelian loci with fixed label colors */
const MENDELIAN_COLORS: Record<string, string> = {
  COLOR: '#dc2626',  // red
  SHAPE: '#16a34a',  // green
  DR: '#2563eb',     // blue
};

const SOIL = '#3d2c1f';
const WHEAT = '#e8d5a3';
const ACCENT = '#e07a3a';
const LEAF = '#4a7c59';

const CHR_HEIGHT = 14;
const CHR_GAP = 28;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 16;
const TOP_MARGIN = 16;

export function ChromosomeView() {
  const map = useGame((s) => s.map);
  const markers = useGame((s) => s.markers);
  const linkages = useGame((s) => s.discovery.linkages);
  const [hoveredLocus, setHoveredLocus] = useState<string | null>(null);

  const maxLen = Math.max(...map.chromosomes.map((c) => c.length));
  const svgWidth = 480;
  const barWidth = svgWidth - LEFT_MARGIN - RIGHT_MARGIN;
  const svgHeight = TOP_MARGIN + map.chromosomes.length * CHR_GAP + 8;

  const scale = (pos: number, _chrLen: number) =>
    LEFT_MARGIN + (pos / maxLen) * barWidth;

  const chrWidth = (len: number) => (len / maxLen) * barWidth;

  // Collect all genotyped locus IDs (union across individuals)
  const genotypedLoci = new Set<string>();
  for (const lociSet of markers.genotyped.values()) {
    for (const lid of lociSet) genotypedLoci.add(lid);
  }

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
      style={{ minHeight: 120 }}
    >
      {map.chromosomes.map((chr, ci) => {
        const y = TOP_MARGIN + ci * CHR_GAP;
        const w = chrWidth(chr.length);

        return (
          <g key={chr.id}>
            {/* Chromosome label */}
            <text
              x={LEFT_MARGIN - 6}
              y={y + CHR_HEIGHT / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="600"
              fill={SOIL}
            >
              Chr {chr.id}
            </text>

            {/* Chromosome bar */}
            <rect
              x={LEFT_MARGIN}
              y={y}
              width={w}
              height={CHR_HEIGHT}
              rx={4}
              ry={4}
              fill={WHEAT}
              stroke={SOIL}
              strokeWidth={0.8}
              opacity={0.85}
            />

            {/* Loci overlaid on bar */}
            {chr.loci.map((locus) => {
              const lx = scale(locus.position, chr.length);
              const isMendelian = locus.type === 'mendelian' && MENDELIAN_COLORS[locus.id];
              const isAssociation = markers.associations.has(locus.id);
              const isGenotyped = genotypedLoci.has(locus.id);
              const isHovered = hoveredLocus === locus.id;

              // Mendelian loci: tall colored tick + label
              if (isMendelian) {
                const color = MENDELIAN_COLORS[locus.id];
                return (
                  <g key={locus.id}>
                    <line
                      x1={lx}
                      y1={y - 2}
                      x2={lx}
                      y2={y + CHR_HEIGHT + 2}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <text
                      x={lx}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="700"
                      fill={color}
                    >
                      {locus.id}
                    </text>
                  </g>
                );
              }

              // QTL associations discovered via GWAS: orange tick
              if (isAssociation) {
                const assoc = markers.associations.get(locus.id)!;
                return (
                  <g
                    key={locus.id}
                    onMouseEnter={() => setHoveredLocus(locus.id)}
                    onMouseLeave={() => setHoveredLocus(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <line
                      x1={lx}
                      y1={y - 1}
                      x2={lx}
                      y2={y + CHR_HEIGHT + 1}
                      stroke={ACCENT}
                      strokeWidth={1.5}
                    />
                    {isHovered && (
                      <>
                        <rect
                          x={lx - 28}
                          y={y - 18}
                          width={56}
                          height={13}
                          rx={2}
                          fill="white"
                          stroke={ACCENT}
                          strokeWidth={0.5}
                        />
                        <text
                          x={lx}
                          y={y - 9}
                          textAnchor="middle"
                          fontSize="7"
                          fill={SOIL}
                        >
                          {locus.id} ({assoc.traitName})
                        </text>
                      </>
                    )}
                  </g>
                );
              }

              // Genotyped neutral markers: small dots
              if (isGenotyped) {
                return (
                  <circle
                    key={locus.id}
                    cx={lx}
                    cy={y + CHR_HEIGHT / 2}
                    r={1.8}
                    fill={LEAF}
                    opacity={0.5}
                  />
                );
              }

              return null;
            })}

            {/* Discovered linkage brackets */}
            {linkages.map((link) => {
              const l1 = chr.loci.find(l => l.id === link.locus1);
              const l2 = chr.loci.find(l => l.id === link.locus2);
              if (!l1 || !l2) return null;
              const x1 = scale(Math.min(l1.position, l2.position), chr.length);
              const x2 = scale(Math.max(l1.position, l2.position), chr.length);
              const bracketY = y + CHR_HEIGHT + 6;
              const dist = Math.abs(l1.position - l2.position);
              return (
                <g key={`link-${link.locus1}-${link.locus2}`}>
                  {/* Bracket */}
                  <path
                    d={`M${x1} ${y + CHR_HEIGHT + 2} L${x1} ${bracketY} L${x2} ${bracketY} L${x2} ${y + CHR_HEIGHT + 2}`}
                    fill="none"
                    stroke="#9333ea"
                    strokeWidth={1.2}
                    strokeDasharray="3 2"
                  />
                  {/* Distance label */}
                  <text
                    x={(x1 + x2) / 2}
                    y={bracketY + 9}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="600"
                    fill="#9333ea"
                  >
                    {dist.toFixed(0)} cM linked
                  </text>
                  {/* Locus labels below bracket */}
                  <text x={x1} y={bracketY + 9} textAnchor="middle" fontSize="6" fill="#9333ea">
                    {l1.position < l2.position ? link.locus1 : link.locus2}
                  </text>
                  <text x={x2} y={bracketY + 9} textAnchor="middle" fontSize="6" fill="#9333ea">
                    {l1.position < l2.position ? link.locus2 : link.locus1}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
