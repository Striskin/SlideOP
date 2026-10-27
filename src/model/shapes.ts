import type { Element } from './document';

type Point = { x: number; y: number };
export type ShapePreset = {
  name: string;
  category: 'Basics' | 'Geometric' | 'Expressive';
  kind: Element['kind'];
  preview: string;
  properties?: Partial<Element>;
};
export function regularPolygon(sides: number): Point[] {
  const count = Math.max(3, Math.min(24, Math.round(sides)));
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / count;
    return { x: 100 + 100 * Math.cos(angle), y: 100 + 100 * Math.sin(angle) };
  });
}
function star(points: number, inner = 0.45): Point[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 ? 100 * inner : 100,
      angle = -Math.PI / 2 + (i * Math.PI) / points;
    return { x: 100 + radius * Math.cos(angle), y: 100 + radius * Math.sin(angle) };
  });
}
function polygon(name: string, category: ShapePreset['category'], points: Point[]): ShapePreset {
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y));
  const width = Math.max(...points.map((p) => p.x)) - minX,
    height = Math.max(...points.map((p) => p.y)) - minY;
  const preview =
    points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${8 + ((p.x - minX) / width) * 48} ${8 + ((p.y - minY) / height) * 48}`,
      )
      .join(' ') + 'Z';
  return {
    name,
    category,
    kind: 'polygon',
    preview,
    properties: { points, width: 200, height: 200 },
  };
}
const vertices = (values: number[][]) => values.map(([x, y]) => ({ x, y }));
export const shapePresets: ShapePreset[] = [
  { name: 'Rectangle', category: 'Basics', kind: 'rect', preview: 'M8 14h48v36H8z' },
  {
    name: 'Circle',
    category: 'Basics',
    kind: 'ellipse',
    preview: 'M32 8a24 24 0 1 0 0 48a24 24 0 1 0 0-48',
  },
  { name: 'Triangle', category: 'Basics', kind: 'triangle', preview: 'M32 8L59 54H5z' },
  { name: 'Line', category: 'Basics', kind: 'line', preview: 'M7 31h50v3H7z' },
  { name: 'Arrow', category: 'Basics', kind: 'arrow', preview: 'M6 25h31V12l23 20-23 20V39H6z' },
  {
    name: 'Hexagon',
    category: 'Basics',
    kind: 'polygon',
    preview: 'M19 8h26l15 24-15 24H19L4 32z',
  },
  {
    name: 'Rounded',
    category: 'Geometric',
    kind: 'rect',
    preview: 'M16 12h32a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8',
    properties: { radius: 40 },
  },
  {
    name: 'Capsule',
    category: 'Geometric',
    kind: 'rect',
    preview:
      'M20 8h24a12 12 0 0 1 12 12v24a12 12 0 0 1-12 12H20a12 12 0 0 1-12-12V20A12 12 0 0 1 20 8',
    properties: { width: 180, height: 300, radius: 90 },
  },
  polygon(
    'Diamond',
    'Geometric',
    vertices([
      [100, 0],
      [200, 100],
      [100, 200],
      [0, 100],
    ]),
  ),
  polygon('Pentagon', 'Geometric', regularPolygon(5)),
  polygon('Octagon', 'Geometric', regularPolygon(8)),
  polygon(
    'Trapezoid',
    'Geometric',
    vertices([
      [40, 0],
      [160, 0],
      [200, 160],
      [0, 160],
    ]),
  ),
  polygon(
    'Parallelogram',
    'Geometric',
    vertices([
      [50, 0],
      [200, 0],
      [150, 160],
      [0, 160],
    ]),
  ),
  polygon(
    'Chevron',
    'Geometric',
    vertices([
      [0, 0],
      [100, 0],
      [200, 100],
      [100, 200],
      [0, 200],
      [100, 100],
    ]),
  ),
  polygon(
    'Cross',
    'Geometric',
    vertices([
      [65, 0],
      [135, 0],
      [135, 65],
      [200, 65],
      [200, 135],
      [135, 135],
      [135, 200],
      [65, 200],
      [65, 135],
      [0, 135],
      [0, 65],
      [65, 65],
    ]),
  ),
  polygon('Star', 'Expressive', star(5)),
  polygon('Sparkle', 'Expressive', star(4, 0.22)),
  polygon('Starburst', 'Expressive', star(12, 0.72)),
  polygon(
    'Heart',
    'Expressive',
    Array.from({ length: 48 }, (_, i) => {
      const t = (i * Math.PI * 2) / 48;
      return {
        x: 16 * Math.sin(t) ** 3,
        y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
      };
    }),
  ),
  polygon(
    'Lightning',
    'Expressive',
    vertices([
      [100, 0],
      [30, 115],
      [90, 115],
      [65, 200],
      [175, 80],
      [110, 80],
      [140, 0],
    ]),
  ),
  polygon(
    'Speech bubble',
    'Expressive',
    vertices([
      [0, 0],
      [200, 0],
      [200, 140],
      [110, 140],
      [50, 200],
      [50, 140],
      [0, 140],
    ]),
  ),
  polygon(
    'Bookmark',
    'Expressive',
    vertices([
      [0, 0],
      [140, 0],
      [140, 200],
      [70, 150],
      [0, 200],
    ]),
  ),
  polygon(
    'Double arrow',
    'Expressive',
    vertices([
      [0, 100],
      [60, 40],
      [60, 75],
      [140, 75],
      [140, 40],
      [200, 100],
      [140, 160],
      [140, 125],
      [60, 125],
      [60, 160],
    ]),
  ),
  polygon(
    'Shield',
    'Expressive',
    vertices([
      [0, 0],
      [200, 0],
      [180, 125],
      [100, 200],
      [20, 125],
    ]),
  ),
];
