import { easeLifecycle, type LifecyclePoint } from "./lifecycle-drawing";

// Preserve the diagonal journey; each object keeps a rigid three-quarter
// camera rather than having its shape stretched through the route mapping.
const stops = [
  [55, 170, 166],
  [171, 175, 247],
  [307, 190, 340],
  [520, 245, 445],
  [610, 260, 510],
] as const;
const claimLift = [0, -15, -36, -28, -12] as const;
const returnLift = [-60, -60, -20, -24, -24] as const;
const scale = 0.85;

function routeCenter(x: number, lane: number): LifecyclePoint {
  let segment = 0;
  while (segment < stops.length - 2 && x > stops[segment + 1][0]) segment++;
  const a = stops[segment],
    b = stops[segment + 1];
  const t = (x - a[0]) / (b[0] - a[0]);
  const eased = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const lift = lane < 0 ? claimLift : returnLift;
  const fromY = a[2] + lift[segment] * Math.abs(lane);
  const toY = b[2] + lift[segment + 1] * Math.abs(lane);
  return [a[1] + (b[1] - a[1]) * t, fromY + (toY - fromY) * eased];
}

export function mobileJourneyPoint(
  x: number,
  y: number,
  z = 0,
): LifecyclePoint {
  // Two continuous corridors, like desktop: C17 travels on the left, and T1
  // returns on the right. Keep that separation all the way into both berths;
  // local cargo/receipt offsets must never pull a craft across the other lane.
  const lane = Math.max(-1, Math.min(1, y / 50));
  const center = routeCenter(x, lane);
  const lateral = lane * 64 + scale * 0.48 * (y - lane * 50);
  const dock =
    y > 0 ? easeLifecycle((x - 520) / 30) : easeLifecycle((x - 550) / 60);
  // T1 parks beyond the claimant's receipt portal, including its tail and
  // docked receipt marker, rather than stopping in the gate's silhouette.
  const arrival = Math.max(0, lane) * easeLifecycle((171 - x) / 116);
  return [
    center[0] + lateral - 8 * dock * Math.max(0, lane),
    center[1] +
      scale * (0.68 * y - z) +
      (y > 0 ? 0 : 20) * dock * Math.abs(lane) +
      8 * arrival,
  ];
}

/** A portal faces the flight approach, exposing the opening to the reader. */
export function mobileJourneyGate(originX: number, originY: number) {
  const camera = mobileJourneyAssembly(originX, originY);
  const angle = Math.PI * 0.44;
  return (x: number, y: number, z = 0): LifecyclePoint => {
    const dx = x - originX,
      dy = y - originY;
    return camera(
      originX + dx * Math.cos(angle) - dy * Math.sin(angle),
      originY + dx * Math.sin(angle) + dy * Math.cos(angle),
      z,
    );
  };
}

/** Same three-quarter camera as desktop, at an independently staged origin. */
export function mobileJourneyAssembly(
  originX: number,
  originY: number,
  position?: LifecyclePoint,
  yaw = 0,
) {
  const center = position ?? mobileJourneyPoint(originX, originY);
  return (x: number, y: number, z = 0): LifecyclePoint => {
    const dx = (x - originX) * Math.cos(yaw) - (y - originY) * Math.sin(yaw);
    const dy = (x - originX) * Math.sin(yaw) + (y - originY) * Math.cos(yaw);
    return [
      center[0] + scale * (dx + 0.48 * dy),
      center[1] + scale * (0.68 * dy - z),
    ];
  };
}
