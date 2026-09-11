import type { ReactNode } from "react";

export type HardwarePartProps = {
  /** Unique within the containing SVG; also namespaces the material gradients. */
  id: string;
  width: number;
  height: number;
  children: ReactNode;
};

export type ActiveHardwarePartProps = HardwarePartProps & {
  active?: boolean;
};

const dimension = (value: number, minimum: number) =>
  Number.isFinite(value) ? Math.max(minimum, value) : minimum;
const point = (value: number) => Number(value.toFixed(3));

function Materials({ id, width }: { id: string; width: number }) {
  return (
    <defs>
      <linearGradient
        id={`${id}-prism`}
        gradientUnits="userSpaceOnUse"
        x1="-20"
        y1="0"
        x2={width + 20}
        y2="24"
      >
        <stop stopColor="#a4d1c6" />
        <stop offset=".35" stopColor="#b3cee8" />
        <stop offset=".69" stopColor="#c9b7dc" />
        <stop offset="1" stopColor="#e2c7a7" />
      </linearGradient>
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#a6c9dc" stopOpacity=".3" />
        <stop offset=".48" stopColor="#f0f4ed" stopOpacity=".82" />
        <stop offset="1" stopColor="#c0accd" stopOpacity=".3" />
      </linearGradient>
    </defs>
  );
}

/** The six-unit backplate is part of the object, not a separate projected layer. */
function BoardBody({
  id,
  outline,
  width,
  height,
  active = false,
}: {
  id: string;
  outline: string;
  width: number;
  height: number;
  active?: boolean;
}) {
  return (
    <g data-hardware-body="" fill="none" strokeLinejoin="round">
      <path
        data-hardware-backplate=""
        d={outline}
        transform="translate(4 -6)"
        fill={`url(#${id}-prism)`}
        fillOpacity=".012"
        stroke="#a8b8ce"
        strokeOpacity=".23"
        strokeWidth=".8"
      />
      <path
        d={`M6,0l4,-6M${width},7l4,-6M${width - 6},${height}l4,-6M0,${height - 7}l4,-6M0,7l4,-6`}
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".46"
        strokeWidth=".8"
      />
      <path
        data-hardware-front=""
        d={outline}
        fill={`url(#${id}-prism)`}
        fillOpacity={active ? ".055" : ".025"}
        stroke={`url(#${id}-prism)`}
        strokeOpacity={active ? ".76" : ".49"}
        strokeWidth=".9"
      />
      <path
        d={`M7,2H${width - 8}M${width - 2},9V${Math.max(12, height * 0.28)}`}
        stroke={`url(#${id}-sheen)`}
        strokeOpacity={active ? ".85" : ".49"}
        strokeWidth=".8"
      />
    </g>
  );
}

function Via({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g data-hardware-via="" fill="none" strokeWidth=".65">
      <circle
        cx={x}
        cy={y}
        r="2.1"
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".4"
      />
      <circle cx={x} cy={y} r=".75" stroke="#a8b9cc" strokeOpacity=".3" />
    </g>
  );
}

/** Small edge-mounted ICs leave the whole central inscription face untouched. */
function EdgePackage({
  id,
  x,
  y,
  width,
  height = 10,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
}) {
  const pins = Math.max(3, Math.floor((width - 6) / 5));
  return (
    <g
      data-hardware-ic=""
      transform={`translate(${point(x)} ${point(y)})`}
      fill="none"
      strokeWidth=".65"
    >
      <rect
        x="2"
        y="-3"
        width={width}
        height={height}
        stroke="#9eb1c5"
        strokeOpacity=".2"
      />
      <path
        d={`M0,0l2,-3M${width},0l2,-3M${width},${height}l2,-3M0,${height}l2,-3`}
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".36"
      />
      {Array.from({ length: pins }, (_, index) => {
        const pinX = point(4 + (index * (width - 8)) / (pins - 1));
        return (
          <path
            key={index}
            d={`M${pinX},-2v2m0,${height}v2`}
            stroke={`url(#${id}-sheen)`}
            strokeOpacity=".58"
          />
        );
      })}
      <rect
        width={width}
        height={height}
        rx=".7"
        fill={`url(#${id}-prism)`}
        fillOpacity=".028"
        stroke={`url(#${id}-prism)`}
        strokeOpacity=".49"
      />
      <path
        d={`M3,2H${width - 3}`}
        stroke={`url(#${id}-sheen)`}
        strokeOpacity=".3"
      />
      <circle
        cx="3"
        cy={height - 3}
        r=".7"
        stroke="#c7d2de"
        strokeOpacity=".4"
      />
    </g>
  );
}

function PackageRail({ id, width }: { id: string; width: number }) {
  const count = Math.max(2, Math.floor((width - 36) / 44));
  const gap = 11;
  const packageWidth = point((width - 44 - gap * (count - 1)) / count);
  return Array.from({ length: count }, (_, index) => (
    <EdgePackage
      key={index}
      id={id}
      x={22 + index * (packageWidth + gap)}
      y={8}
      width={packageWidth}
    />
  ));
}

/** Front coordinates are 0..width × 0..height; physical depth adds (4, -6). */
export function MemoryBoard({
  id,
  width,
  height,
  children,
  active = false,
}: ActiveHardwarePartProps) {
  const w = dimension(width, 140);
  const h = dimension(height, 100);
  const material = `${id}-memory`;
  const keyX = Math.round(w * 0.59);
  const latchY = point(h * 0.46);
  const outline = `M6,0H${w - 6}L${w},6V${latchY}h-4v8h4V${h - 6}L${w - 6},${h}H${keyX + 6}v-9h-12v9H6L0,${h - 6}V${latchY + 8}h4v-8H0V6Z`;
  const fingers = Math.floor((w - 24) / 6);
  return (
    <g data-ranking-hardware="memory" data-hardware-active={active}>
      <Materials id={material} width={w} />
      <BoardBody
        id={material}
        outline={outline}
        width={w}
        height={h}
        active={active}
      />
      <g fill="none" stroke={`url(#${material}-prism)`} strokeWidth=".65">
        <path
          d={`M16,24V${h - 19}H${keyX - 11}M${keyX + 11},${h - 19}H${w - 16}V24M20,22H${w - 20}`}
          strokeOpacity=".2"
        />
        <path
          d={`M12,30V${h - 25}l3,3M${w - 12},30V${h - 25}l-3,3`}
          strokeOpacity=".31"
        />
        <path
          d={`M${keyX - 6},${h - 9}l4,-6h12M${keyX + 6},${h}l4,-6v-9`}
          strokeOpacity=".43"
        />
      </g>
      <PackageRail id={material} width={w} />
      <g
        data-hardware-contacts="keyed-memory"
        fill={`url(#${material}-prism)`}
        fillOpacity=".095"
        stroke={`url(#${material}-sheen)`}
        strokeWidth=".7"
      >
        {Array.from({ length: fingers }, (_, index) => {
          const x = point(12 + (index * (w - 28)) / (fingers - 1));
          if (Math.abs(x + 1.7 - keyX) < 10) return null;
          return (
            <g key={index}>
              <path d={`M${x},${h - 3}v-9l1,-1h2.4v10Z`} />
              <path d={`M${x + 1.7},${h - 14}v-3`} strokeOpacity=".3" />
            </g>
          );
        })}
      </g>
      {[9, w - 9].flatMap((x, side) =>
        [27, h - 24].map((y, index) => (
          <Via key={`${side}-${index}`} id={material} x={x} y={y} />
        )),
      )}
      <g data-hardware-inscription="memory">{children}</g>
    </g>
  );
}

function PackagePins({
  id,
  width,
  height,
}: {
  id: string;
  width: number;
  height: number;
}) {
  const across = Math.max(12, Math.floor((width - 42) / 5.8));
  const down = Math.max(8, Math.floor((height - 50) / 5.8));
  const sides = [
    {
      name: "top",
      count: across,
      length: width - 44,
      inset: 22,
      x: 0,
      y: 0,
      angle: 0,
    },
    {
      name: "bottom",
      count: across,
      length: width - 44,
      inset: 22,
      x: 0,
      y: height,
      angle: 180,
    },
    {
      name: "left",
      count: down,
      length: height - 52,
      inset: 26,
      x: 0,
      y: 0,
      angle: -90,
    },
    {
      name: "right",
      count: down,
      length: height - 52,
      inset: 26,
      x: width,
      y: 0,
      angle: 90,
    },
  ];
  return (
    <g data-hardware-pins="four-sided" strokeWidth=".6" strokeLinejoin="round">
      {sides.flatMap((side) =>
        Array.from({ length: side.count }, (_, index) => {
          const offset = point(
            side.inset + (index * side.length) / (side.count - 1),
          );
          const horizontal = side.name === "top" || side.name === "bottom";
          return (
            <g
              key={`${side.name}-${index}`}
              transform={`translate(${horizontal ? offset : side.x} ${horizontal ? side.y : offset}) rotate(${side.angle})`}
            >
              <path
                d="M-1.3,1.5h2.6V6l-1,3v7h-2.6V9l1,-3Z"
                fill={`url(#${id}-prism)`}
                fillOpacity=".075"
                stroke={`url(#${id}-prism)`}
                strokeOpacity=".49"
              />
              <path
                d="M-.2,2.5V6L-1.2,9v5"
                fill="none"
                stroke={`url(#${id}-sheen)`}
                strokeOpacity=".5"
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

/** A four-sided leaded processor; its inset die is the clear inscription face. */
export function ProcessorPackage({
  id,
  width,
  height,
  children,
  active = false,
}: ActiveHardwarePartProps) {
  const w = dimension(width, 140);
  const h = dimension(height, 100);
  const material = `${id}-processor`;
  const outline = `M7,0H${w - 7}L${w},7V${h - 7}L${w - 7},${h}H7L0,${h - 7}V7Z`;
  const shell = `M18,15H${w - 18}L${w - 12},21V${h - 18}L${w - 18},${h - 12}H18L12,${h - 18}V21Z`;
  const die = `M20,22H${w - 20}L${w - 16},26V${h - 22}L${w - 20},${h - 18}H20L16,${h - 22}V26Z`;
  return (
    <g data-ranking-hardware="processor" data-hardware-active={active}>
      <Materials id={material} width={w} />
      <BoardBody
        id={material}
        outline={outline}
        width={w}
        height={h}
        active={active}
      />
      <PackagePins id={material} width={w} height={h} />
      <g fill="none" strokeLinejoin="round">
        <path
          d={shell}
          transform="translate(3 -4)"
          stroke="#a8b8ce"
          strokeOpacity=".22"
          strokeWidth=".75"
        />
        <path
          d={`M18,15l3,-4M${w - 12},21l3,-4M${w - 18},${h - 12}l3,-4M12,${h - 18}l3,-4`}
          stroke={`url(#${material}-prism)`}
          strokeOpacity=".45"
          strokeWidth=".8"
        />
        <path
          d={shell}
          fill={`url(#${material}-prism)`}
          fillOpacity=".027"
          stroke={`url(#${material}-prism)`}
          strokeOpacity=".6"
          strokeWidth=".9"
        />
        <path
          data-hardware-die=""
          d={die}
          fill={`url(#${material}-prism)`}
          fillOpacity={active ? ".055" : ".018"}
          stroke={`url(#${material}-sheen)`}
          strokeOpacity={active ? ".83" : ".56"}
          strokeWidth=".8"
        />
        <path
          d={`M24,19H${w - 24}M14,29V${h - 27}M${w - 14},29V${h - 27}M24,${h - 16}H${w - 24}`}
          stroke={`url(#${material}-prism)`}
          strokeOpacity=".23"
          strokeWidth=".6"
        />
        <path
          data-hardware-pin-one=""
          d="M8,9h6v6Z"
          fill={`url(#${material}-prism)`}
          fillOpacity=".17"
          stroke={`url(#${material}-sheen)`}
          strokeWidth=".8"
        />
      </g>
      {[9, w - 9].flatMap((x, side) =>
        [20, h - 18].map((y, index) => (
          <Via key={`${side}-${index}`} id={material} x={x} y={y} />
        )),
      )}
      <g data-hardware-inscription="processor">{children}</g>
    </g>
  );
}

/** A keyed storage/output board with a separate mounting end, like the NVMe study. */
export function OutputBoard({
  id,
  width,
  height,
  children,
}: HardwarePartProps) {
  const w = dimension(width, 140);
  const h = dimension(height, 100);
  const material = `${id}-output`;
  const keyY = Math.round(h * 0.62);
  const middle = h / 2;
  const outline = `M7,0H${w - 7}L${w},7V${middle - 7}a7,7 0 0 0 0,14V${h - 7}L${w - 7},${h}H7L0,${h - 7}V${keyY + 5}h8v-10H0V7Z`;
  const fingers = Math.floor((h - 24) / 6);
  return (
    <g data-ranking-hardware="output">
      <Materials id={material} width={w} />
      <BoardBody id={material} outline={outline} width={w} height={h} />
      <PackageRail id={material} width={w} />
      <g fill="none" stroke={`url(#${material}-prism)`} strokeWidth=".65">
        <path
          d={`M15,25V${keyY - 9}M15,${keyY + 9}V${h - 22}M${w - 16},24V${h - 23}`}
          strokeOpacity=".28"
        />
        <path
          d={`M22,${h - 16}H${w - 26}l6,-3M22,${h - 11}H${w - 30}M22,${h - 7}H${w - 38}`}
          strokeOpacity=".25"
        />
        <path
          d={`M${w - 2},${middle - 10}a10,10 0 0 0 0,20`}
          strokeOpacity=".49"
          strokeWidth=".8"
        />
        <path d={`M8,${keyY - 5}l4,-6v10l-4,6`} strokeOpacity=".43" />
      </g>
      <g
        data-hardware-contacts="keyed-output"
        fill={`url(#${material}-prism)`}
        fillOpacity=".09"
        stroke={`url(#${material}-sheen)`}
        strokeWidth=".7"
      >
        {Array.from({ length: fingers }, (_, index) => {
          const y = point(12 + (index * (h - 28)) / (fingers - 1));
          if (Math.abs(y + 1.7 - keyY) < 9) return null;
          return <path key={index} d={`M2,${y}h8l1,1v2.4H2Z`} />;
        })}
      </g>
      {[25, h - 25].map((y, index) => (
        <Via key={index} id={material} x={w - 9} y={y} />
      ))}
      <EdgePackage id={material} x={25} y={h - 16} width={26} height={9} />
      <g data-hardware-inscription="output">{children}</g>
    </g>
  );
}
