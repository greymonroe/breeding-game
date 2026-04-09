import type { Individual } from '../../engine';

interface PedigreeNode {
  id: string;
  ind: Individual | null;
  x: number;
  y: number;
  parentA?: PedigreeNode;
  parentB?: PedigreeNode;
}

const NODE_R = 14;
const ROW_H = 60;
const COLORS = {
  red: '#c0392b',
  white: '#f5f1e8',
  grey: '#b0b0b0',
  soil: '#3d2c1f',
  leaf: '#4a7c59',
};

function buildTree(
  id: string,
  archive: Map<string, Individual>,
  depth: number,
  x: number,
  y: number,
  span: number,
): PedigreeNode {
  const ind = archive.get(id) ?? null;
  const node: PedigreeNode = { id, ind, x, y };

  if (depth > 0 && ind?.parents) {
    const halfSpan = span / 2;
    node.parentA = buildTree(ind.parents[0], archive, depth - 1, x - halfSpan, y - ROW_H, halfSpan);
    node.parentB = buildTree(ind.parents[1], archive, depth - 1, x + halfSpan, y - ROW_H, halfSpan);
  }

  return node;
}

function collectNodes(node: PedigreeNode, out: PedigreeNode[] = []): PedigreeNode[] {
  out.push(node);
  if (node.parentA) collectNodes(node.parentA, out);
  if (node.parentB) collectNodes(node.parentB, out);
  return out;
}

function fillColor(ind: Individual | null): string {
  if (!ind) return COLORS.grey;
  return (ind.phenotype.get('color') ?? 0) >= 0.5 ? COLORS.red : COLORS.white;
}

export function PedigreeGraph({
  ind,
  archive,
  maxDepth = 3,
}: {
  ind: Individual;
  archive: Map<string, Individual>;
  maxDepth?: number;
}) {
  // Clamp to 3 generations (8 ancestors max)
  const depth = Math.min(maxDepth, 3);

  // Compute horizontal span based on depth so nodes don't overlap
  const baseSpan = Math.pow(2, depth) * (NODE_R * 2 + 4);
  const rootX = baseSpan;
  const rootY = (depth + 1) * ROW_H;
  const tree = buildTree(ind.id, archive, depth, rootX, rootY, baseSpan / 2);
  const nodes = collectNodes(tree);

  // Compute bounding box
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const pad = NODE_R + 20;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad + 10; // extra for label text below root
  const w = maxX - minX;
  const h = maxY - minY;

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full" style={{ maxHeight: 280 }}>
      {/* Lines */}
      {nodes.map((node) => {
        const lines: React.ReactNode[] = [];
        if (node.parentA) {
          lines.push(
            <line
              key={`${node.id}-la`}
              x1={node.x}
              y1={node.y - NODE_R}
              x2={node.parentA.x}
              y2={node.parentA.y + NODE_R}
              stroke={COLORS.soil}
              strokeWidth={1.5}
              opacity={0.5}
            />,
          );
        }
        if (node.parentB) {
          lines.push(
            <line
              key={`${node.id}-lb`}
              x1={node.x}
              y1={node.y - NODE_R}
              x2={node.parentB.x}
              y2={node.parentB.y + NODE_R}
              stroke={COLORS.soil}
              strokeWidth={1.5}
              opacity={0.5}
            />,
          );
        }
        return lines;
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const fill = fillColor(node.ind);
        const isRoot = node.id === ind.id;
        return (
          <g key={`${node.id}-${node.x}-${node.y}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_R}
              fill={fill}
              stroke={isRoot ? COLORS.leaf : COLORS.soil}
              strokeWidth={isRoot ? 2.5 : 1.5}
            />
            {/* Stroke for white-filled so it's visible */}
            {fill === COLORS.white && (
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_R}
                fill="none"
                stroke={COLORS.soil}
                strokeWidth={1}
                opacity={0.3}
              />
            )}
            <text
              x={node.x}
              y={node.y + NODE_R + 10}
              textAnchor="middle"
              fill={COLORS.soil}
              fontSize={8}
              fontFamily="monospace"
            >
              {node.id.length > 10 ? node.id.slice(0, 9) + '\u2026' : node.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
