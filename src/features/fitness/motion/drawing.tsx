import type { ReactNode } from 'react';
export type Vec = { x: number; y: number };
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const polar = (origin: Vec, length: number, degrees: number): Vec => ({
  x: origin.x + length * Math.cos((degrees * Math.PI) / 180),
  y: origin.y + length * Math.sin((degrees * Math.PI) / 180),
});
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function joint(a: Vec, b: Vec, first: number, second: number, bend = 1): Vec {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    distance = Math.hypot(dx, dy);
  if (
    distance < 0.001 ||
    distance > first + second + 0.001 ||
    distance < Math.abs(first - second) - 0.001
  )
    throw new Error('Motion joint target is out of reach');
  const along = (first ** 2 - second ** 2 + distance ** 2) / (2 * distance);
  const across = Math.sqrt(Math.max(0, first ** 2 - along ** 2));
  return {
    x: a.x + (dx / distance) * along - ((bend * dy) / distance) * across,
    y: a.y + (dy / distance) * along + ((bend * dx) / distance) * across,
  };
}
export function Scene({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg className="motion-illustration" viewBox="0 0 440 400" role="img" aria-label={label}>
      <path d="M48 362H398" stroke="#deded3" strokeWidth="2" strokeLinecap="round" />
      {children}
    </svg>
  );
}
export function Segment({
  a,
  b,
  width = 12,
  color = '#f1e6d6',
  part = 'limb',
}: {
  a: Vec;
  b: Vec;
  width?: number;
  color?: string;
  part?: string;
}) {
  return (
    <g data-part={part} strokeLinecap="round">
      <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#46564f" strokeWidth={width + 4} />
      <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke={color} strokeWidth={width} />
    </g>
  );
}
export function Chain({
  a,
  middle,
  b,
  color,
  part = 'arm',
  width,
}: {
  a: Vec;
  middle: Vec;
  b: Vec;
  color?: string;
  part?: string;
  width?: number;
}) {
  return (
    <g data-part={part}>
      <Segment a={a} b={middle} color={color} width={width} part={`${part}-upper`} />
      <Segment a={middle} b={b} color={color} width={width} part={`${part}-lower`} />
    </g>
  );
}
export function Torso({ shoulder, hip }: { shoulder: Vec; hip: Vec }) {
  return <Segment a={shoulder} b={hip} width={34} color="#d9eadf" part="torso" />;
}
export function Head({ at, angle = 0 }: { at: Vec; angle?: number }) {
  return (
    <g
      data-part="head"
      transform={`translate(${at.x} ${at.y}) rotate(${angle})`}
      stroke="#46564f"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M-15 -9Q-17 -27 0 -28Q19 -26 17 -8L15 12Q0 29 -14 12Z" fill="#f1e6d6" />
      <path d="M-16 -8Q-20 -28 0 -30Q20 -28 18 -8L8 -16Q-2 -10 -10 -17Z" fill="#53645a" />
      <path d="M-6 1H-5M7 1H8M-3 12Q2 15 7 11" fill="none" strokeWidth="1.8" />
    </g>
  );
}
export function Shoe({ at, angle = 0 }: { at: Vec; angle?: number }) {
  return (
    <g data-part="foot" transform={`translate(${at.x} ${at.y}) rotate(${angle})`}>
      <path
        d="M-9 -5L9 -5L24 3Q29 9 18 9H-10Z"
        fill="#f8f5ee"
        stroke="#46564f"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  );
}
export function Grip({ at }: { at: Vec }) {
  return (
    <circle
      data-part="hand"
      cx={at.x}
      cy={at.y}
      r="6"
      fill="#f1e6d6"
      stroke="#46564f"
      strokeWidth="2"
    />
  );
}
export function Machine({ children }: { children: ReactNode }) {
  return (
    <g
      data-part="fixed-machine"
      stroke="#8b9592"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </g>
  );
}
export function Seat({
  x = 110,
  y = 275,
  back = true,
}: {
  x?: number;
  y?: number;
  back?: boolean;
}) {
  return (
    <Machine>
      <path d={`M${x} ${y + 8}H${x + 120}M${x + 45} ${y + 8}V355M${x + 5} 355H${x + 95}`} />
      <rect x={x} y={y} width="115" height="12" rx="6" fill="#c4cdca" strokeWidth="2" />
      {back && (
        <rect
          x={x - 10}
          y={y - 125}
          width="15"
          height="122"
          rx="7"
          fill="#c4cdca"
          strokeWidth="2"
        />
      )}
    </Machine>
  );
}
export function Stack({ pull, x = 370 }: { pull: number; x?: number }) {
  return (
    <>
      <Machine>
        <path d={`M${x - 16} 350V115H${x + 26}V350M${x - 22} 351H${x + 32}`} />
      </Machine>
      <g
        data-part="weight-stack"
        transform={`translate(${x} ${285 - pull * 55})`}
        stroke="#7c8883"
        strokeWidth="2"
        fill="#c6ceca"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="-9" y={i * 9} width="29" height="8" rx="2" />
        ))}
        <path d="M-8 19H2" stroke="#176b56" strokeWidth="3" />
      </g>
    </>
  );
}
export function Arrow({ a, b }: { a: Vec; b: Vec }) {
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <g
      data-part="direction-arrow"
      stroke="#176b56"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />
      <path transform={`translate(${b.x} ${b.y}) rotate(${angle})`} d="M-8 -6L0 0L-8 6" />
    </g>
  );
}
