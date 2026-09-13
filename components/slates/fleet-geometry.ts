import {
  createLifecycleDrawing,
  easeLifecycle,
  type LifecyclePoint,
} from "../proof-work/lifecycle-drawing";
import type { ProofFrameFunction } from "../proof-work/proof-geometry";
import { fleetPlacementState } from "./fleet-data";

/** Separate datacenter sites in each region; the client is a laptop, not a replica. */
export const fleetPlacementFrame: ProofFrameFunction = (
  time,
  selection,
  portrait,
) => {
  const draw = createLifecycleDrawing(time, portrait);
  const { path, line, label, packet } = draw;
  const state = fleetPlacementState(selection);
  const phase = (start: number, end: number) =>
    easeLifecycle((selection - start) / (end - start));
  const home = portrait ? { x: 38, y: 155, w: 344 } : { x: 45, y: 155, w: 318 };
  const mirror = portrait
    ? { x: 38, y: 443, w: 344 }
    : { x: 437, y: 155, w: 318 };
  const client: LifecyclePoint = portrait ? [210, 67] : [400, 57];
  label(
    "fleet-heading",
    "REPLICATE BEFORE COMMIT",
    portrait ? 24 : 35,
    28,
    "heading",
  );
  // A hinged screen, keyboard and trackpad identify the requesting computer.
  path(
    "fleet-client-screen",
    [
      [client[0] - 19, client[1] - 20],
      [client[0] + 19, client[1] - 20],
      [client[0] + 19, client[1] + 3],
      [client[0] - 19, client[1] + 3],
    ],
    "glass",
    0.7,
    undefined,
    true,
  );
  path(
    "fleet-client-base",
    [
      [client[0] - 19, client[1] + 3],
      [client[0] + 19, client[1] + 3],
      [client[0] + 26, client[1] + 15],
      [client[0] - 26, client[1] + 15],
    ],
    "edge",
    0.7,
    undefined,
    true,
  );
  for (let row = 0; row < 3; row++)
    line(
      `fleet-client-text-${row}`,
      [client[0] - 13, client[1] - 13 + row * 5],
      [client[0] + (row === 1 ? 5 : 12), client[1] - 13 + row * 5],
      0.45,
    );
  for (let row = 0; row < 2; row++)
    line(
      `fleet-client-keys-${row}`,
      [client[0] - 14, client[1] + 6 + row * 3],
      [client[0] + 14, client[1] + 6 + row * 3],
      0.35,
    );
  line(
    "fleet-client-trackpad",
    [client[0] - 4, client[1] + 12],
    [client[0] + 4, client[1] + 12],
    0.55,
  );
  label(
    "fleet-requester-label",
    "REQUESTER · SINGAPORE",
    client[0],
    client[1] + 34,
    "small",
    undefined,
    "middle",
  );
  const route: LifecyclePoint[] = portrait
    ? [
        [191, 67],
        [25, 67],
        [25, 230],
        [57, 230],
      ]
    : [
        [381, 57],
        [26, 57],
        [26, 230],
        [64, 230],
      ];
  path("fleet-route", route, "fine", 0.25);
  packet(
    "fleet-request",
    route,
    phase(0, 0.9),
    0.75 * (1 - phase(0.85, 1)),
    "pending",
  );

  function region(
    id: string,
    bank: typeof home,
    name: string,
    verified: number,
    head: string,
    arrival: number,
  ) {
    label(`${id}-region`, name, bank.x, bank.y - 15, "name");
    // The perimeter groups separate sites geographically, not bays in one building.
    path(
      `${id}-rack`,
      [
        [bank.x, bank.y],
        [bank.x, bank.y + 159],
        [bank.x + 9, bank.y + 169],
        [bank.x + bank.w - 9, bank.y + 169],
        [bank.x + bank.w, bank.y + 159],
        [bank.x + bank.w, bank.y],
      ],
      "rear",
      0.45,
    );
    for (let slot = 0; slot < 3; slot++) {
      const x = bank.x + 19 + (slot * (bank.w - 26)) / 3;
      const y = bank.y + 26;
      const active = slot < verified;
      const assembled =
        slot === 0 ? arrival : slot === 1 ? Math.max(0, arrival - 1) : 0;
      const tint = active ? "pass" : "neutral";
      const site = `${id}-site-${slot}`;
      path(
        `${site}-ground`,
        [
          [x - 4, y + 74],
          [x + 73, y + 74],
          [x + 91, y + 58],
          [x + 91, y + 65],
          [x + 73, y + 81],
          [x - 4, y + 81],
        ],
        "rear",
        0.45,
        undefined,
        true,
      );
      path(
        `${site}-front`,
        [
          [x, y],
          [x + 70, y],
          [x + 70, y + 70],
          [x, y + 70],
        ],
        "glass",
        0.6,
        undefined,
        true,
      );
      path(
        `${site}-side`,
        [
          [x + 70, y],
          [x + 86, y - 15],
          [x + 86, y + 55],
          [x + 70, y + 70],
        ],
        "shade",
        0.5,
        undefined,
        true,
      );
      path(
        `${site}-roof`,
        [
          [x, y],
          [x + 16, y - 15],
          [x + 86, y - 15],
          [x + 70, y],
        ],
        "glass",
        0.7,
        undefined,
        true,
      );
      line(`${site}-roof-seam`, [x + 4, y - 3], [x + 69, y - 3], 0.55);
      // Roof cooling units are fixed infrastructure, not content blocks.
      for (let unit = 0; unit < 2; unit++) {
        const ux = x + 23 + unit * 27,
          uy = y - 10;
        path(
          `${site}-cooler-${unit}`,
          [
            [ux - 8, uy - 5],
            [ux + 7, uy - 5],
            [ux + 7, uy + 1],
            [ux - 8, uy + 1],
          ],
          "edge",
          0.6,
          undefined,
          true,
        );
        path(
          `${site}-fan-${unit}`,
          Array.from({ length: 17 }, (_, i): LifecyclePoint => [
            ux + 4 * Math.cos((i * Math.PI) / 8),
            uy - 2 + 2 * Math.sin((i * Math.PI) / 8),
          ]),
          "fine",
          0.55,
        );
      }
      // A cutaway server room contains six independently filled rack slots.
      path(
        `${site}-window`,
        [
          [x + 6, y + 7],
          [x + 48, y + 7],
          [x + 48, y + 59],
          [x + 6, y + 59],
        ],
        "fine",
        0.55,
        undefined,
        true,
      );
      line(`${site}-window-mullion`, [x + 27, y + 7], [x + 27, y + 59], 0.35);
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 2; column++) {
          const tileX = x + 9 + column * 20;
          const tileY = y + 12 + row * 15;
          path(
            `${id}-chunk-${slot}-${row}-${column}`,
            [
              [tileX, tileY],
              [tileX + 16, tileY],
              [tileX + 16, tileY + 10],
              [tileX, tileY + 10],
            ],
            "glass",
            0.12 + 0.65 * easeLifecycle(assembled),
            tint,
            true,
          );
          line(
            `${site}-drive-${row}-${column}`,
            [tileX + 3, tileY + 4],
            [tileX + 11, tileY + 4],
            0.2 + 0.45 * easeLifecycle(assembled),
            tint,
          );
        }
      }
      // Service entrance, concrete step and side louvers belong to the building.
      path(
        `${site}-door`,
        [
          [x + 54, y + 35],
          [x + 65, y + 35],
          [x + 65, y + 70],
          [x + 54, y + 70],
        ],
        "edge",
        0.6,
        undefined,
        true,
      );
      line(`${site}-handle`, [x + 62, y + 52], [x + 62, y + 56], 0.75);
      line(`${site}-step`, [x + 52, y + 74], [x + 69, y + 74], 0.55);
      for (let vent = 0; vent < 7; vent++)
        line(
          `${site}-louver-${vent}`,
          [x + 74, y + 12 + vent * 5],
          [x + 82, y + 5 + vent * 5],
          0.4,
        );
      path(
        `${site}-status-light`,
        [
          [x + 56, y + 18],
          [x + 63, y + 18],
          [x + 63, y + 23],
          [x + 56, y + 23],
        ],
        "glass",
        active ? 0.95 : 0.15,
        tint,
        true,
      );
      label(
        `${id}-holder-name-${slot}`,
        id === "home" ? ["A · OWNER", "B", "C"][slot] : `M${slot + 1}`,
        x + 36,
        bank.y + 125,
        "small",
        undefined,
        "middle",
      );
      label(
        `${id}-verified-${slot}`,
        active ? "H7 ✓" : "—",
        x + 36,
        bank.y + 150,
        "label",
        tint,
        "middle",
      );
    }
    label(
      `${id}-quorum`,
      `${verified} / 3 VERIFIED`,
      bank.x + 8,
      bank.y + 197,
      "label",
      verified >= 2 ? "pass" : "pending",
    );
    label(
      `${id}-head`,
      `HEAD ${head}`,
      bank.x + bank.w - 7,
      bank.y + 197,
      "label",
      head === "v7" ? "pass" : "neutral",
      "end",
    );
  }

  region(
    "home",
    home,
    "HOME · VIRGINIA",
    state.homeVerified,
    state.homeHead,
    phase(0, 1) + phase(1, 2),
  );
  region(
    "mirror",
    mirror,
    "MIRROR · FRANKFURT",
    state.mirrorVerified,
    state.mirrorHead,
    phase(2, 3) + phase(3, 4),
  );
  const crossing: LifecyclePoint[] = portrait
    ? [
        [home.x + home.w, home.y + 80],
        [400, home.y + 80],
        [400, mirror.y + 80],
        [mirror.x + mirror.w, mirror.y + 80],
      ]
    : [
        [home.x + home.w, home.y + 80],
        [400, home.y + 80],
        [400, home.y + 110],
        [mirror.x, mirror.y + 110],
      ];
  path("fleet-content-link", crossing, "fine", 0.45);
  packet(
    "fleet-transfer",
    crossing,
    phase(2, 3),
    0.85 * phase(2, 2.1) * (1 - phase(2.9, 3)),
    "pending",
  );
  label(
    "fleet-transfer-label",
    portrait ? "MISSING CHUNKS → VERIFY" : "H7",
    portrait ? 50 : 400,
    portrait ? 395 : 201,
    "small",
    "pending",
    portrait ? "start" : "middle",
  );
  const statusY = portrait ? 695 : 430;
  line(
    "fleet-scope-rule",
    [portrait ? 32 : 52, statusY - 30],
    [portrait ? 386 : 748, statusY - 30],
    0.35,
  );
  label(
    "fleet-scope",
    state.reply.toUpperCase(),
    portrait ? 32 : 52,
    statusY,
    "name",
    state.stage === 4 ? "pass" : "pending",
  );
  label(
    "fleet-quorum-note",
    "f = 1 · TWO VERIFIED HOLDERS PER REGION",
    portrait ? 32 : 52,
    statusY + 25,
    "small",
  );
  return draw.frame();
};
