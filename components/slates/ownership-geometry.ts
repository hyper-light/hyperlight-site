import type { ProofFrame, ProofTone } from "../proof-work/proof-geometry";
import { ownershipLanes, ownershipState } from "./ownership-data";
import { runtimeAlong } from "./runtime-drawing";
import {
  spatialDrawing,
  spatialPulse,
  type Point3,
  type Project3,
} from "./spatial-drawing";

/** An exploded processor package: queue, execution/cache and memory planes
 * remain rigid while requests travel down their owning lane. */
export function ownershipFrame(
  time: number,
  selection: number,
  portrait: boolean,
): ProofFrame {
  const d = spatialDrawing();
  const state = ownershipState(selection);
  const width = portrait ? 278 : 420;
  const laneWidth = (width - 32) / 3;
  const queueZ = portrait ? 246 : 162;
  const coreZ = portrait ? 138 : 83;
  const project: Project3 = ([x, y, z]) => [
    (portrait ? 47 : 155) + x * 0.95 + y * 0.31,
    (portrait ? 484 : 332) - x * 0.16 + y * 0.44 - z,
  ];
  const frontAxes = [
    [1, 0, 0],
    [0, 0, -1],
  ] as const;
  const line3 = (
    id: string,
    vertices: Point3[],
    opacity = 0.5,
    tone?: ProofTone,
  ) => d.line(id, vertices.map(project), { opacity, tone });
  const parcel = (
    id: string,
    route: Point3[],
    progress: number,
    opacity: number,
    tone: ProofTone,
  ) => {
    const [x, y] = runtimeAlong(route.map(project), progress);
    const local: Project3 = ([a, b, c]) => [
      x + a * 0.95 + b * 0.31,
      y - a * 0.16 + b * 0.44 - c,
    ];
    d.solid(id, local, [-4, -3, 0], [8, 6, 5], {
      material: "emissive",
      opacity,
      tone,
    });
  };

  d.label("heading", "EACH CORE WRITES ITS OWN VOLUMES", 26, 35, {
    kind: "heading",
  });
  d.label(
    "package-caption",
    "ONE PROCESSOR · THREE OWNERS",
    portrait ? 210 : 628,
    portrait ? 78 : 74,
    { kind: "heading", anchor: "middle" },
  );
  // A contact shadow and exposed pin bed make the package thickness readable.
  d.face(
    "package-shadow",
    [
      [-8, 3, -18],
      [width + 6, 3, -18],
      [width + 6, 159, -18],
      [-8, 159, -18],
    ].map(([x, y, z]) => project([x, y, z])),
    "shadow",
    0.8,
  );
  for (let pin = 0; pin < 27; pin++) {
    const x = 8 + pin * ((width - 16) / 26);
    d.solid("package-contact-" + pin, project, [x, 145, -16], [3, 10, 13], {
      material: "metal",
      opacity: 0.6,
    });
  }
  d.solid("processor-substrate", project, [0, 0, -8], [width, 155, 13], {
    material: "circuit",
    opacity: 0.96,
  });
  d.solid("processor-die-bed", project, [8, 47, 5], [width - 16, 88, 5], {
    material: "silicon",
    opacity: 0.95,
  });
  for (let trace = 0; trace < 7; trace++) {
    line3(
      "substrate-bus-" + trace,
      [
        [14, 139 + trace * 1.5, 6],
        [width - 14, 139 + trace * 1.5, 6],
      ],
      0.25,
    );
  }
  // Attached memory is a lower assembly, not a second row of repeated CPUs.
  d.solid("memory-board", project, [0, 174, -9], [width, 131, 8], {
    material: "circuit",
    opacity: 0.94,
  });
  for (let contact = 0; contact < 24; contact++) {
    const x = 9 + contact * ((width - 20) / 23);
    d.solid("memory-contact-" + contact, project, [x, 294, -8], [4, 10, 2], {
      material: "metal",
      opacity: 0.7,
    });
  }

  ownershipLanes.forEach((lane, index) => {
    const prefix = "owner-" + index;
    const x = 12 + index * laneWidth;
    const middle = x + (laneWidth - 8) / 2;
    const queuedSlot = portrait ? 2 : 1;
    const slotWidth = (laneWidth - 23) / 3;
    const queueMiddle = x + 5 + (queuedSlot + 0.5) * slotWidth - 1.5;
    const writeMiddle = middle + (portrait ? 8 : 0);
    const requestRoute: Point3[] = [
      [queueMiddle, -33, queueZ + 39],
      [queueMiddle, 13, queueZ + 24],
    ];
    const applyRoute: Point3[] = [
      [queueMiddle, 13, queueZ + 24],
      [queueMiddle, 30, queueZ - 12],
      [middle, 67, coreZ + 21],
    ];
    const writeRoute: Point3[] = [
      [writeMiddle, 107, coreZ + 22],
      [writeMiddle, 151, 30],
      [middle, 203, 22],
    ];
    const replyRoute: Point3[] = [
      [middle + 22, 109, coreZ + 17],
      [x + laneWidth - 6, 49, coreZ + 15],
      [x + laneWidth - 6, 13, queueZ + 27],
      [queueMiddle, -33, queueZ + 39],
    ];
    for (let strand = 0; strand < 3; strand++) {
      line3(
        prefix + "-owner-route-" + strand,
        applyRoute.map(([a, b, c]) => [a + (strand - 1) * 3, b, c] as Point3),
        0.25,
      );
      line3(
        prefix + "-volume-route-" + strand,
        writeRoute.map(([a, b, c]) => [a + (strand - 1) * 3, b, c] as Point3),
        0.3,
      );
    }
    line3(
      prefix + "-return-route",
      replyRoute,
      0.1 + state.replying * 0.4,
      "pass",
    );
    line3(prefix + "-input-route", requestRoute, 0.38, "pending");

    // Each core has its own die, register array and cache, all on one package.
    d.solid(
      prefix + "-core",
      project,
      [x, 55, coreZ],
      [laneWidth - 8, 77, 20],
      { material: "metal", opacity: 0.96 },
    );
    d.solid(
      prefix + "-execution",
      project,
      [x + 7, 66, coreZ + 20],
      [laneWidth - 22, 36, 4],
      { material: "silicon", opacity: 0.98 },
    );
    for (let row = 0; row < 3; row++) {
      for (let bit = 0; bit < 6; bit++) {
        const pulse = spatialPulse(
          time,
          0.4,
          bit * 0.06 + row * 0.15 + index * 0.16,
        );
        d.face(
          prefix + "-activity-" + row + "-" + bit,
          [
            [x + 12 + bit * ((laneWidth - 38) / 6), 71 + row * 9, coreZ + 25],
            [x + 16 + bit * ((laneWidth - 38) / 6), 71 + row * 9, coreZ + 25],
            [x + 16 + bit * ((laneWidth - 38) / 6), 75 + row * 9, coreZ + 25],
            [x + 12 + bit * ((laneWidth - 38) / 6), 75 + row * 9, coreZ + 25],
          ].map(([x, y, z]) => project([x, y, z])),
          "emissive",
          0.1 + pulse.opacity * (0.08 + state.applying * 0.3),
          "pass",
        );
      }
    }
    for (let cache = 0; cache < 4; cache++) {
      const cw = (laneWidth - 24) / 4;
      d.solid(
        prefix + "-cache-" + cache,
        project,
        [x + 7 + cache * cw, 110, coreZ + 20],
        [cw - 3, 12, 4],
        { material: "silicon", opacity: 0.9 },
      );
    }
    d.surfaceLabel(
      prefix + "-identity",
      lane.shard,
      project,
      [x + 8, 132, coreZ + 5],
      { kind: "name", tone: "pending" },
      frontAxes,
    );
    d.surfaceLabel(
      prefix + "-cache-label",
      portrait ? "L1" : "CACHE",
      project,
      [x + laneWidth - 14, 132, coreZ + 5],
      { kind: "small", anchor: "end" },
      frontAxes,
    );

    // A bounded three-place admission queue floats above its owning core.
    d.solid(
      prefix + "-queue",
      project,
      [x, 0, queueZ],
      [laneWidth - 8, 37, 20],
      { material: "circuit", opacity: 0.94 },
    );
    for (let slot = 0; slot < 3; slot++) {
      const sw = (laneWidth - 23) / 3;
      d.solid(
        prefix + "-slot-" + slot,
        project,
        [x + 5 + slot * sw, 11, queueZ + 20],
        [sw - 3, 17, 3],
        { material: "silicon", opacity: 0.95 },
      );
      d.face(
        prefix + "-slot-filled-" + slot,
        [
          [x + 7 + slot * sw, 13, queueZ + 24],
          [x + 2 + (slot + 1) * sw, 13, queueZ + 24],
          [x + 2 + (slot + 1) * sw, 26, queueZ + 24],
          [x + 7 + slot * sw, 26, queueZ + 24],
        ].map(([x, y, z]) => project([x, y, z])),
        "emissive",
        slot === queuedSlot
          ? state.queued * (1 - state.transferred) * 0.85
          : 0.06,
        "pending",
      );
    }
    d.surfaceLabel(
      prefix + "-queue-label",
      "QUEUE",
      project,
      [x + (portrait ? 3 : 8), 37, queueZ + 5],
      { kind: "small" },
      frontAxes,
    );
    const source = project(requestRoute[0]);
    d.label(prefix + "-id", lane.volume, source[0], source[1] - 16, {
      kind: "name",
      anchor: "middle",
    });

    // Two owned volumes, only one of which this illustrated request changes.
    for (let volume = 0; volume < 2; volume++) {
      const y = 184 + volume * 66;
      d.solid(
        prefix + "-volume-" + volume,
        project,
        [x, y, 0],
        [laneWidth - 8, 30, 18],
        { material: "silicon", opacity: 0.96 },
      );
      d.surfaceLabel(
        prefix + "-volume-name-" + volume,
        volume ? lane.other : lane.volume,
        project,
        [x + 6, y + 30, 4],
        { kind: "small", tone: volume ? "neutral" : "pass" },
        frontAxes,
      );
      for (let cell = 0; cell < 4; cell++) {
        const cw = (laneWidth - 24) / 4;
        const cellX = x + 7 + cell * cw;
        const corners: Point3[] = [
          [cellX, y + 8, 19],
          [cellX + cw - 3, y + 8, 19],
          [cellX + cw - 3, y + 23, 19],
          [cellX, y + 23, 19],
        ];
        d.face(
          prefix + "-volume-" + volume + "-cell-" + cell,
          corners.map(project),
          "metal",
          0.42,
        );
        d.face(
          prefix + "-volume-" + volume + "-cell-" + cell + "-write",
          corners.map(project),
          "emissive",
          volume === 0 && cell === 1 ? state.applying * 0.92 : 0,
          "pass",
        );
      }
    }
    const inputProgress =
      state.transferred > 0 ? state.transferred : state.queued;
    parcel(
      prefix + "-request",
      state.transferred > 0 ? applyRoute : requestRoute,
      inputProgress,
      1 - state.applying,
      "pending",
    );
    parcel(
      prefix + "-write",
      writeRoute,
      state.applying,
      Math.sin(state.applying * Math.PI) * 0.96,
      "pass",
    );
    parcel(
      prefix + "-completion",
      replyRoute,
      state.replying,
      state.replying,
      "pass",
    );
  });
  d.label(
    "footer-1",
    "Three queues. Three cores. Separate writes.",
    portrait ? 210 : 400,
    portrait ? 656 : 488,
    { anchor: "middle", kind: "small" },
  );
  d.label(
    "footer-2",
    "Exploded view of one processor package.",
    portrait ? 210 : 400,
    portrait ? 684 : 505,
    { anchor: "middle", kind: "small" },
  );
  return { paths: d.paths, labels: d.labels };
}
