import type { LifecyclePoint } from "./lifecycle-drawing";

// Preserve the diagonal journey; each object keeps a rigid three-quarter
// camera rather than having its shape stretched through the route mapping.
const stops = [[55, 80, 152], [171, 105, 235], [307, 205, 340], [520, 250, 445], [610, 285, 510]] as const;
const scale = 0.85;

function routeCenter(x: number): LifecyclePoint {
  let segment = 0;
  while (segment < stops.length - 2 && x > stops[segment + 1][0]) segment++;
  const a = stops[segment], b = stops[segment + 1];
  const t = (x - a[0]) / (b[0] - a[0]);
  const eased = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * eased];
}

export function mobileJourneyPoint(x: number, y: number, z = 0): LifecyclePoint {
  const center = routeCenter(x);
  const t = Math.max(0, Math.min(1, (x - 500) / 50));
  const berth = t * t * (3 - 2 * t);
  const responseBerth = -45 * berth * Math.max(0, Math.min(1, y / 35));
  const park = Math.max(0, Math.min(1, (x - 550) / 60));
  const claimBerth = 60 * park * park * (3 - 2 * park) * Math.max(0, Math.min(1, -y / 35));
  return [center[0] + scale * 0.48 * y + responseBerth + claimBerth, center[1] + scale * (0.68 * y - z)];
}

/** A portal faces the flight approach, exposing the opening to the reader. */
export function mobileJourneyGate(originX: number, originY: number) {
  const camera = mobileJourneyAssembly(originX, originY);
  const angle = Math.PI * 0.44;
  return (x: number, y: number, z = 0): LifecyclePoint => {
    const dx = x - originX, dy = y - originY;
    return camera(
      originX + dx * Math.cos(angle) - dy * Math.sin(angle),
      originY + dx * Math.sin(angle) + dy * Math.cos(angle),
      z,
    );
  };
}

/** Same three-quarter camera as desktop, at an independently staged origin. */
export function mobileJourneyAssembly(originX: number, originY: number, position?: LifecyclePoint, yaw = 0) {
  const center = position ?? mobileJourneyPoint(originX, originY);
  return (x: number, y: number, z = 0): LifecyclePoint => {
    const dx = (x - originX) * Math.cos(yaw) - (y - originY) * Math.sin(yaw);
    const dy = (x - originX) * Math.sin(yaw) + (y - originY) * Math.cos(yaw);
    return [center[0] + scale * (dx + 0.48 * dy), center[1] + scale * (0.68 * dy - z)];
  };
}
