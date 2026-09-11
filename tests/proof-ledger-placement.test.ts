import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ledgerPlacementFrame,
  LEDGER_GLOBE_REVOLUTION_SECONDS,
} from "../components/proof-work/ledger-placement-geometry";

type Frame = ReturnType<typeof ledgerPlacementFrame>;
const quarterTurns = [0, 22.5, 45, 67.5, 90];
const pointCache = new WeakMap<Frame, Map<string, [number, number][]>>();
function points(frame: Frame, id: string): [number, number][] {
  let cache = pointCache.get(frame);
  if (!cache) {
    cache = new Map(
      frame.paths.map((path) => {
        const values = [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
          Number(match[0]),
        );
        return [
          path.id,
          Array.from(
            { length: values.length / 2 },
            (_, index): [number, number] => [
              values[index * 2],
              values[index * 2 + 1],
            ],
          ),
        ];
      }),
    );
    pointCache.set(frame, cache);
  }
  const result = cache.get(id);
  assert.ok(result, id);
  return result;
}
function hub(frame: Frame, index: number): [number, number] {
  const ring = points(frame, `hub-${index}-0`);
  return [(ring[0][0] + ring[16][0]) / 2, (ring[0][1] + ring[16][1]) / 2];
}
const distance = (a: [number, number], b: [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

function path(frame: Frame, id: string) {
  const found = frame.paths.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

function ringCenter(frame: Frame, id: string): [number, number] {
  const ring = points(frame, id);
  const opposite = ring[(ring.length - 1) / 2];
  return [(ring[0][0] + opposite[0]) / 2, (ring[0][1] + opposite[1]) / 2];
}

function routePosition(frame: Frame, id: string, point: [number, number]) {
  const route = points(frame, id);
  let nearest = { distance: Infinity, fraction: 0 };
  for (let index = 0; index < route.length - 1; index++) {
    const a = route[index],
      b = route[index + 1];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const length = dx * dx + dy * dy;
    const amount = length
      ? Math.max(
          0,
          Math.min(
            1,
            ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length,
          ),
        )
      : 0;
    const separation = distance(point, [
      a[0] + amount * dx,
      a[1] + amount * dy,
    ]);
    if (separation < nearest.distance)
      nearest = {
        distance: separation,
        fraction: (index + amount) / (route.length - 1),
      };
  }
  return nearest;
}

function attachedCarrier(
  frame: Frame,
  route: string,
  packet: string,
  trail: string,
) {
  const center = ringCenter(frame, packet);
  assert.ok(
    distance(center, points(frame, trail).at(-1)!) < 0.02,
    `${trail} must meet its packet`,
  );
  const position = routePosition(frame, route, center);
  assert.ok(position.distance < 0.45, `${packet} left its spherical route`);
  for (const point of points(frame, trail))
    assert.ok(
      routePosition(frame, route, point).distance < 0.45,
      `${trail} left its spherical route`,
    );
  return position.fraction;
}

test("geographic placement retains its topology and stays within both viewports", () => {
  for (const portrait of [false, true]) {
    const first = ledgerPlacementFrame(0, 0, portrait);
    assert.ok(first.paths.length > 200);
    for (const time of Array.from({ length: 37 }, (_, index) => index * 2.5))
      for (const selection of [0, 0.5, 1, 1.5, 2]) {
        const frame = ledgerPlacementFrame(time, selection, portrait);
        assert.deepEqual(
          frame.paths.map((p) => p.id),
          first.paths.map((p) => p.id),
        );
        assert.deepEqual(
          frame.labels.map((p) => p.id),
          first.labels.map((p) => p.id),
        );
        for (const path of frame.paths) {
          assert.doesNotMatch(path.d, /NaN|Infinity/);
          const points = [...path.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) =>
            Number(m[0]),
          );
          points.forEach((value, i) => {
            assert.ok(value >= 0, `${path.id}: negative coordinate`);
            assert.ok(
              value <= (i % 2 ? (portrait ? 740 : 520) : portrait ? 420 : 800),
              `${path.id}: out of viewport`,
            );
          });
        }
      }
  }
});

test("continents and hubs move substantially and pass revolution boundaries without a reset", () => {
  assert.equal(LEDGER_GLOBE_REVOLUTION_SECONDS, 90);
  for (const portrait of [false, true]) {
    const frames = quarterTurns.map((time) =>
      ledgerPlacementFrame(time, 1, portrait),
    );
    const centerX = portrait ? 210 : 400;
    assert.ok(hub(frames[0], 0)[0] < centerX - 100);
    assert.ok(
      hub(frames[2], 0)[0] > centerX + 100,
      "half a turn reaches the opposite side",
    );
    assert.ok(hub(frames[1], 1)[0] > centerX + 75);
    assert.ok(
      hub(frames[3], 1)[0] < centerX - 75,
      "quarter-turns continue around the globe",
    );
    assert.ok(
      frames[1].paths.find(({ id }) => id === "hub-0-0")!.opacity >
        frames[3].paths.find(({ id }) => id === "hub-0-0")!.opacity + 0.2,
      "the hub passes the front and rear rather than reversing at the far side",
    );
    for (let region = 0; region < 3; region++) {
      const initial = hub(frames[0], region);
      assert.ok(
        Math.max(
          ...frames
            .slice(1, 4)
            .map((frame) => distance(initial, hub(frame, region))),
        ) > 80,
        "every geographic hub travels with the globe",
      );
      assert.ok(
        distance(initial, hub(frames[4], region)) < 8,
        "one yaw revolution returns near its start, allowing the independent roll",
      );
    }
    const coastIds = frames[0].paths
      .filter(({ id }) => id.startsWith("coast-"))
      .map(({ id }) => id);
    assert.ok(
      Math.max(
        ...coastIds.flatMap((id) =>
          points(frames[0], id).map((point, index) =>
            distance(point, points(frames[2], id)[index]),
          ),
        ),
      ) > 150,
      "coastlines make a real turn",
    );
    for (const time of [22.5, 45, 67.5, 90, 180]) {
      const before = ledgerPlacementFrame(time - 1 / 120, 1, portrait);
      const after = ledgerPlacementFrame(time + 1 / 120, 1, portrait);
      for (const id of [
        ...coastIds,
        "hub-0-0",
        "hub-1-0",
        "hub-2-0",
        "replication-route-1",
        "replication-route-2",
      ])
        points(before, id).forEach((point, index) =>
          assert.ok(
            distance(point, points(after, id)[index]) < 0.8,
            `${id} moves continuously through ${time}s`,
          ),
        );
    }
  }
});

test("coastline front and rear contrast follows the turn with gradual horizon fading", () => {
  const initial = ledgerPlacementFrame(0, 1, false);
  const coastIds = initial.paths
    .filter(({ id }) => id.startsWith("coast-"))
    .map(({ id }) => id);
  const ranges = new Map(coastIds.map((id) => [id, [1, 0]]));
  for (let time = 0; time <= 90; time += 0.25) {
    const before = ledgerPlacementFrame(time, 1, false);
    const after = ledgerPlacementFrame(time + 1 / 60, 1, false);
    const previousOpacities = new Map(
      before.paths.map(({ id, opacity }) => [id, opacity]),
    );
    const nextOpacities = new Map(
      after.paths.map(({ id, opacity }) => [id, opacity]),
    );
    for (const id of coastIds) {
      const opacity = previousOpacities.get(id)!;
      const next = nextOpacities.get(id)!;
      assert.ok(opacity >= 0 && opacity <= 1);
      assert.ok(
        Math.abs(next - opacity) < 0.02,
        `${id} snaps at the horizon at ${time}s`,
      );
      const range = ranges.get(id)!;
      range[0] = Math.min(range[0], opacity);
      range[1] = Math.max(range[1], opacity);
    }
  }
  assert.ok(
    [...ranges.values()].every(([min, max]) => max - min > 0.3),
    "every coastline moves between front and rear visibility",
  );
});

test("region leaders and replication routes stay attached while captions and placement semantics stay fixed", () => {
  for (const portrait of [false, true])
    for (const selection of [0, 1, 2]) {
      const initial = ledgerPlacementFrame(0, selection, portrait);
      for (const time of quarterTurns) {
        const frame = ledgerPlacementFrame(time, selection, portrait);
        assert.deepEqual(
          frame.labels,
          initial.labels,
          "all captions and their mode-specific identity stay fixed",
        );
        for (let region = 0; region < 3; region++) {
          assert.ok(
            distance(
              points(frame, `region-leader-${region}`).at(-1)!,
              hub(frame, region),
            ) < 0.015,
          );
          assert.deepEqual(
            points(frame, `region-leader-${region}`)[0],
            points(initial, `region-leader-${region}`)[0],
          );
        }
        for (const destination of [1, 2]) {
          const route = points(frame, `replication-route-${destination}`);
          assert.ok(distance(route[0], hub(frame, 0)) < 0.015);
          assert.ok(distance(route.at(-1)!, hub(frame, destination)) < 0.015);
        }
        for (const path of frame.paths.filter(({ id }) =>
          /^(hub-|replication-route-|route-fence-|blocked-x-)/.test(id),
        )) {
          const reference = initial.paths.find(({ id }) => id === path.id)!;
          assert.equal(path.tone, reference.tone);
          assert.equal(
            path.opacity > 0,
            reference.opacity > 0,
            "depth fading never changes whether a mode's marker is enabled",
          );
          if (/^(replication-route-|route-fence-)/.test(path.id))
            assert.equal(path.opacity, reference.opacity);
        }
      }
    }
});

test("invalid globe time resolves deterministically to its initial pose", () => {
  for (const portrait of [false, true])
    for (const selection of [0, 1, 2]) {
      const initial = ledgerPlacementFrame(0, selection, portrait);
      for (const invalid of [-1, NaN, Infinity, -Infinity])
        assert.deepEqual(
          ledgerPlacementFrame(invalid, selection, portrait),
          initial,
        );
    }
});

test("session placement, replication and residency convey different guarantees", () => {
  const frames = [0, 1, 2].map((selection) =>
    ledgerPlacementFrame(0, selection, false),
  );
  const text = (index: number, id: string) =>
    frames[index].labels.find((label) => label.id === id)?.text;
  assert.equal(text(0, "assignment-0"), "Session α");
  assert.equal(text(0, "assignment-1"), "Session β");
  assert.equal(text(0, "assignment-2"), "Session γ");
  for (let i = 0; i < 3; i++)
    assert.equal(text(1, `assignment-${i}`), "Session α replica");
  assert.equal(text(2, "assignment-2"), "Outside policy");
  assert.equal(text(2, "authority-2"), "Placement blocked");
  assert.equal(
    frames[2].paths.find((path) => path.id === "route-fence-2")?.opacity,
    0.9,
  );
  assert.ok(frames[1].labels.some((label) => label.text.includes("latency")));
});

test("independent sessions keep local workload traffic active without suggesting cross-region replication", () => {
  const interregionTraffic =
    /^(packet-[12]$|replication-(packet|trail|ack|arrival)-)/;
  const localTraffic = /^local-[012]-[0-3]-(request|response)(-trail)?$/;
  for (const portrait of [false, true]) {
    const activeRegions = new Set<string>();
    for (const time of [0, 1, 2.5, 3.5, 5, 6.5, 8, 9.5]) {
      const frame = ledgerPlacementFrame(time, 0, portrait);
      assert.equal(
        frame.paths.filter(({ id }) => /^local-[012]-[0-3]-route$/.test(id))
          .length,
        12,
      );
      const interregion = frame.paths.filter(({ id }) =>
        interregionTraffic.test(id),
      );
      assert.ok(
        interregion.length >= 16,
        "The persistent batch/ack geometry is present even when inactive",
      );
      for (const item of interregion)
        assert.equal(
          item.opacity,
          0,
          `${item.id}: independent sessions do not replicate one history`,
        );
      const active = frame.paths.filter(
        ({ id, opacity }) => localTraffic.test(id) && opacity > 0.05,
      );
      assert.ok(
        active.length > 0,
        "The default sessions view has visible local requests or replies",
      );
      for (const item of active) activeRegions.add(item.id.split("-")[1]);
    }
    assert.deepEqual([...activeRegions].sort(), ["0", "1", "2"]);
  }
});

test("replication delivers its complete outbound batch before acknowledging back toward the ordering region", () => {
  // Fixed playback samples for each staggered destination. Additional complete
  // seven-second cycles exercise the same exchange on a different globe pose.
  const exchanges = [
    {
      destination: 1,
      batch: 0.63,
      lastDelivery: 2.303,
      arrival: 2.73,
      ack: 3.71,
      laterAck: 4.83,
      rest: 5.32,
    },
    {
      destination: 2,
      batch: 6.16,
      lastDelivery: 7.833,
      arrival: 8.26,
      ack: 9.24,
      laterAck: 10.36,
      rest: 10.85,
    },
  ];
  for (const portrait of [false, true])
    for (const epoch of [0, 28])
      for (const exchange of exchanges) {
        const { destination } = exchange;
        const route = `replication-route-${destination}`;
        const packetIds = [
          `packet-${destination}`,
          `replication-packet-${destination}-1`,
          `replication-packet-${destination}-2`,
        ];
        const outbound = ledgerPlacementFrame(
          epoch + exchange.batch,
          1,
          portrait,
        );
        const progress = packetIds.map((id, index) => {
          assert.ok(path(outbound, id).opacity > 0.05, id);
          return attachedCarrier(
            outbound,
            route,
            id,
            `replication-trail-${destination}-${index}`,
          );
        });
        assert.ok(
          progress[0] > progress[1] + 0.1 && progress[1] > progress[2] + 0.1,
          "The batch has three ordered outbound packets",
        );
        assert.equal(
          path(outbound, `replication-ack-${destination}`).opacity,
          0,
        );
        assert.equal(
          path(outbound, `replication-arrival-${destination}`).opacity,
          0,
        );

        const delivered = ledgerPlacementFrame(
          epoch + exchange.lastDelivery,
          1,
          portrait,
        );
        const lastPacket = ringCenter(delivered, packetIds[2]);
        assert.ok(
          distance(lastPacket, hub(delivered, destination)) < 2,
          "The final packet reaches the destination, not an arbitrary midpoint",
        );
        assert.ok(routePosition(delivered, route, lastPacket).fraction > 0.98);
        assert.equal(
          path(delivered, `replication-ack-${destination}`).opacity,
          0,
        );

        const arrival = ledgerPlacementFrame(
          epoch + exchange.arrival,
          1,
          portrait,
        );
        for (const id of packetIds)
          assert.equal(
            path(arrival, id).opacity,
            0,
            "Outbound delivery finishes before receipt feedback",
          );
        assert.ok(
          path(arrival, `replication-arrival-${destination}`).opacity > 0.2,
        );
        assert.ok(
          distance(
            ringCenter(arrival, `replication-arrival-${destination}`),
            hub(arrival, destination),
          ) < 0.015,
        );
        assert.equal(
          path(arrival, `replication-ack-${destination}`).opacity,
          0,
          "The receipt precedes the returning acknowledgement",
        );

        const ack = ledgerPlacementFrame(epoch + exchange.ack, 1, portrait);
        const laterAck = ledgerPlacementFrame(
          epoch + exchange.laterAck,
          1,
          portrait,
        );
        const acknowledgement = `replication-ack-${destination}`;
        const trail = `replication-ack-trail-${destination}`;
        assert.ok(path(ack, acknowledgement).opacity > 0.05);
        assert.ok(path(laterAck, acknowledgement).opacity > 0.05);
        assert.ok(
          attachedCarrier(ack, route, acknowledgement, trail) >
            attachedCarrier(laterAck, route, acknowledgement, trail) + 0.3,
          "Acknowledgement moves from replica back toward the ordering region",
        );
        const rest = ledgerPlacementFrame(epoch + exchange.rest, 1, portrait);
        for (const id of [
          ...packetIds,
          acknowledgement,
          trail,
          `replication-arrival-${destination}`,
        ])
          assert.equal(
            path(rest, id).opacity,
            0,
            `${id}: finished transfers are not continuously busy`,
          );
      }
});

test("residency rejects Region C at the gate without destination arrivals or acknowledgements", () => {
  const localTraffic =
    /^local-2-[0-3]-(request|response)(-trail)?$|^local-2-[0-3]-(hub|site)-arrival$/;
  for (const portrait of [false, true]) {
    let attempts = 0,
      gatePulses = 0;
    for (let step = 0; step <= 14; step++) {
      const frame = ledgerPlacementFrame(step * 0.7, 2, portrait);
      assert.equal(path(frame, "replication-ack-2").opacity, 0);
      assert.equal(path(frame, "replication-ack-trail-2").opacity, 0);
      for (const item of frame.paths.filter(({ id }) => localTraffic.test(id)))
        assert.equal(
          item.opacity,
          0,
          `${item.id}: disallowed local traffic remains silent`,
        );
      for (const [index, id] of [
        "packet-2",
        "replication-packet-2-1",
        "replication-packet-2-2",
      ].entries()) {
        if (path(frame, id).opacity <= 0.01) continue;
        attempts++;
        assert.equal(path(frame, id).tone, "fail");
        assert.ok(
          attachedCarrier(
            frame,
            "replication-route-2",
            id,
            `replication-trail-2-${index}`,
          ) <= 0.535,
          "Rejected packets cannot proceed beyond the residency gate",
        );
      }
      const pulse = path(frame, "replication-arrival-2");
      if (pulse.opacity > 0.01) {
        gatePulses++;
        assert.equal(
          pulse.tone,
          "fail",
          "A gate rejection must not resemble a successful receipt",
        );
        const position = ringCenter(frame, pulse.id);
        const onRoute = routePosition(frame, "replication-route-2", position);
        assert.ok(onRoute.distance < 0.45);
        assert.ok(
          onRoute.fraction > 0.525 && onRoute.fraction < 0.535,
          "The allowed rejection pulse is at the gate, not Region C",
        );
        assert.ok(
          distance(position, hub(frame, 2)) > 20,
          "No destination arrival is shown for the disallowed replica",
        );
      }
    }
    assert.ok(
      attempts > 0 && gatePulses > 0,
      "Residency rejection is visible, not a silently missing route",
    );
    assert.ok(
      path(ledgerPlacementFrame(3.71, 2, portrait), "replication-ack-1")
        .opacity > 0.05,
      "An allowed Region B acknowledgement remains active",
    );
  }
});

test("integrated local clients and request-response trails remain attached to their rotating geographic hubs", () => {
  const activeRegions = new Set<number>();
  for (const portrait of [false, true])
    for (const time of [1, 3.5, 6, 8.5, 23.5, 46]) {
      const frame = ledgerPlacementFrame(time, 1, portrait);
      for (let region = 0; region < 3; region++)
        for (let site = 0; site < 4; site++) {
          const prefix = `local-${region}-${site}`;
          const route = `${prefix}-route`;
          assert.ok(
            distance(points(frame, route).at(-1)!, hub(frame, region)) < 0.015,
            `${route} terminates at the existing hub, not a separate authority`,
          );
          assert.ok(
            distance(
              points(frame, route)[0],
              ringCenter(frame, `${prefix}-core`),
            ) < 0.025,
            `${route} starts at its geographic client`,
          );
          for (const direction of ["request", "response"]) {
            const packet = `${prefix}-${direction}`;
            if (path(frame, packet).opacity <= 0.01) continue;
            activeRegions.add(region);
            attachedCarrier(frame, route, packet, `${packet}-trail`);
          }
        }
    }
  assert.deepEqual([...activeRegions].sort(), [0, 1, 2]);
});
