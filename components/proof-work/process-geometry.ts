import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";

type Point = readonly [number, number];
type SurfaceOptions = { tone?: ProofTone; opacity?: number };
type LabelOptions = SurfaceOptions & Pick<ProofLabel, "kind" | "anchor">;

export function blend(selection: number, values: readonly number[]) {
  const index = Math.max(0, Math.min(values.length - 1, selection));
  const lower = Math.floor(index);
  return (
    values[lower] +
    (values[Math.min(lower + 1, values.length - 1)] - values[lower]) *
      (index - lower)
  );
}

/** One rigid instrument plane: surface lettering is etched into its projection. */
export function processScene(time: number, portrait: boolean) {
  const paths: ProofPath[] = [];
  const labels: ProofLabel[] = [];
  const surfaces: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[] = [];
  const labelPositions = new Map<string, Point>();
  const centerX = portrait ? 210 : 400;
  const centerY = portrait ? 370 : 260;
  const pitch = 0.31 + Math.sin(time * 0.37) * 0.065;
  const yaw = 0.24 + Math.sin(time * 0.29 + 0.5) * 0.07;
  const scaleX = portrait ? 0.86 : 0.95;
  // The same affine derivatives govern both the glass and its printed lettering.
  const a = Math.cos(yaw) * scaleX;
  const b = 0;
  const c = Math.sin(pitch) * Math.sin(yaw) * scaleX;
  const d = Math.cos(pitch) * 0.95;
  const point = ([x, y]: Point, depth = 0): Point => {
    const dx = x - centerX,
      dy = y - centerY;
    const z = dy * Math.sin(pitch) + depth * Math.cos(pitch);
    return [
      centerX + (dx * Math.cos(yaw) + z * Math.sin(yaw)) * scaleX,
      centerY + (dy * Math.cos(pitch) - depth * Math.sin(pitch)) * 0.95,
    ];
  };
  const coord = (p: Point) => p.map((n) => n.toFixed(2)).join(" ");
  function layer(
    id: string,
    points: readonly Point[],
    depth: number,
    kind: ProofPath["kind"],
    opacity: number,
    tone: ProofTone = "neutral",
  ) {
    paths.push({
      id,
      d: points
        .map((p, i) => `${i ? "L" : "M"}${coord(point(p, depth))}`)
        .join(" "),
      kind,
      opacity,
      tone,
    });
  }
  function line(
    id: string,
    points: readonly Point[],
    kind: ProofPath["kind"] = "fine",
    opacity = 0.65,
    tone: ProofTone = "neutral",
  ) {
    paths.push({
      id,
      d: points.map((p, i) => `${i ? "L" : "M"}${coord(point(p))}`).join(" "),
      kind,
      opacity,
      tone,
    });
  }
  function label(
    id: string,
    text: string,
    x: number,
    y: number,
    options: LabelOptions = {},
  ) {
    const p = point([x, y]);
    labelPositions.set(id, [x, y]);
    labels.push({ id, text, x: p[0], y: p[1], anchor: "start", ...options });
  }
  function box(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: SurfaceOptions = {},
  ) {
    const opacity = options.opacity ?? 1;
    const tone = options.tone ?? "neutral";
    surfaces.push({ id, x, y, width, height });
    const front: Point[] = [
      [x, y + 7],
      [x + 7, y],
      [x + width - 7, y],
      [x + width, y + 7],
      [x + width, y + height - 7],
      [x + width - 7, y + height],
      [x + 7, y + height],
      [x, y + height - 7],
      [x, y + 7],
    ];
    const depth = 19 + Math.sin(time * 0.4) * 2;
    const back = front.map((p) => point(p, depth));
    paths.push({
      id: id + "-rear",
      d: back.map((p, i) => `${i ? "L" : "M"}${coord(p)}`).join(" "),
      kind: "rear",
      opacity: opacity * 0.43,
      tone,
    });
    layer(id + "-laminate", front, depth * 0.45, "rear", opacity * 0.2, tone);
    line(id + "-skin", front, "glass", opacity * 0.6, tone);
    line(
      id + "-lip",
      [
        [x + 8, y + 1],
        [x + width - 8, y + 1],
      ],
      "edge",
      opacity * 0.85,
      tone,
    );
    for (const [index, p] of [
      front[1],
      front[3],
      front[5],
      front[7],
    ].entries()) {
      paths.push({
        id: `${id}-depth-${index}`,
        d: `M${coord(point(p))} L${coord(point(p, depth))}`,
        kind: "edge",
        opacity: opacity * 0.57,
        tone,
      });
    }
    for (let side = 0; side < 2; side++) {
      const a = front[side ? 4 : 0],
        b = front[side ? 5 : 1];
      paths.push({
        id: `${id}-bevel-${side}`,
        d: `M${coord(point(a))} L${coord(point(b))} L${coord(point(b, depth))} L${coord(point(a, depth))} Z`,
        kind: "shade",
        opacity: opacity * 0.5,
        tone,
      });
    }
    // Fiber laminations are physical edges, not data or implied verdicts.
    for (let lamination = 0; lamination < 5; lamination++) {
      layer(
        `${id}-fiber-${lamination}`,
        [
          [x + 9, y + height],
          [x + width - 9, y + height],
        ],
        2 + lamination * 3.4,
        "fine",
        opacity * 0.15,
        tone,
      );
    }
    layer(
      id + "-reflection",
      [
        [x + 8, y],
        [x + width - 8, y],
      ],
      depth,
      "light",
      opacity * 0.75,
      tone,
    );
  }
  function card(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    subtitle: string,
    options: SurfaceOptions = {},
  ) {
    box(id, x, y, width, height, options);
    label(id + "-title", title, x + 14, y + 25, options);
    label(id + "-subtitle", subtitle, x + 14, y + 47, {
      kind: "small",
      ...options,
    });
    const opacity = options.opacity ?? 1;
    const cut = Math.min(x + width - 30, x + 76);
    // A short record ID interrupts the engraved header rail. The channel resumes
    // past its reserved lettering slot; neither the stroke nor its bevel crosses ink.
    line(
      id + "-id-register",
      [
        [x + 10, y + 12],
        [x + 8, y + 14],
        [x + 8, y + 31],
        [x + 11, y + 31],
      ],
      "fine",
      opacity * 0.5,
      options.tone,
    );
    line(
      id + "-id-channel",
      [
        [cut, y + 19],
        [x + width - 13, y + 19],
        [x + width - 10, y + 22],
        [x + width - 10, y + 29],
      ],
      "fine",
      opacity * 0.32,
      options.tone,
    );
    layer(
      id + "-id-recess",
      [
        [cut, y + 19],
        [x + width - 13, y + 19],
        [x + width - 10, y + 22],
        [x + width - 11, y + 23],
        [x + width - 14, y + 20],
        [cut, y + 20],
        [cut, y + 19],
      ],
      -0.8,
      "shade",
      opacity * 0.18,
      options.tone,
    );
    line(
      id + "-field-rule",
      [
        [x + 10, y + 53],
        [x + 10, y + 56],
        [x + width - 13, y + 56],
        [x + width - 10, y + 53],
      ],
      "fine",
      opacity * 0.24,
      options.tone,
    );
    // Printed identity marks and an unbroken edge distinguish a record from a button.
    for (let tick = 0; tick < 24; tick++) {
      layer(
        `${id}-identity-${tick}`,
        [
          [x + width - 80 + tick * 2.7, y + height - 1],
          [x + width - 80 + tick * 2.7, y + height - 1 - (tick % 3 ? 3 : 5)],
        ],
        15,
        "fine",
        (options.opacity ?? 1) * 0.5,
        options.tone,
      );
    }
  }
  function workspace(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    name: string,
    role: string,
  ) {
    // An open compute dock: floating glass display above a routed backplane.
    // Only the edge gutters carry circuitry, leaving the working records unobscured.
    const shell: Point[] = [
      [x + 6, y],
      [x + width - 6, y],
      [x + width, y + 6],
      [x + width, y + height - 6],
      [x + width - 6, y + height],
      [x + 6, y + height],
      [x, y + height - 6],
      [x, y + 6],
      [x + 6, y],
    ].map(
      ([px, py]) =>
        [
          px < x + width / 2 ? px - 10 : px + 10,
          py < y + height / 2 ? py - 5 : py + 16,
        ] as Point,
    );
    const isLedger = id === "ledger";
    for (const [index, depth] of (isLedger
      ? [36, 52, 68]
      : [24, 34, 42]
    ).entries()) {
      layer(
        `${id}-backplane-${index}`,
        shell,
        depth,
        index === 2 ? "glass" : "rear",
        index === 2 ? 0.15 : 0.24,
      );
    }
    if (isLedger) {
      // A visible stack of retained record layers gives the authoritative store
      // a physical identity distinct from either participant's terminal.
      for (let record = 0; record < 18; record++) {
        const sy = y + 74 + (record * (height - 100)) / 18;
        const contour: Point[] = [
          [x - 9, sy],
          [x - 15, sy + 4],
          [x - 15, sy + 10],
          [x - 9, sy + 13],
        ];
        layer(`${id}-record-spine-${record}`, contour, 50, "edge", 0.42);
        layer(
          `${id}-record-key-${record}`,
          [
            [x - 11, sy + 6],
            [x - 7, sy + 6],
          ],
          54,
          "fine",
          0.56,
        );
      }
      layer(
        `${id}-read-channel`,
        [
          [x - 14, y + 68],
          [x - 14, y + height - 15],
        ],
        57,
        "light",
        0.8,
      );
    }
    for (const side of [0, 1]) {
      const sideX = side ? x + width + 7 : x - 7;
      const inside = side ? -1 : 1;
      const segments = Math.max(12, Math.floor(height / 8));
      for (let fin = 0; fin < segments; fin++) {
        const fy = y + 9 + (fin * (height - 18)) / segments;
        layer(
          `${id}-fin-${side}-${fin}`,
          [
            [sideX, fy],
            [sideX + inside * 5, fy],
            [sideX + inside * 5, fy + 3],
          ],
          29,
          "fine",
          0.3,
        );
      }
      for (let trace = 0; trace < 4; trace++) {
        const tx = sideX + inside * (2 + trace * 2.5);
        layer(
          `${id}-bus-${side}-${trace}`,
          [
            [tx, y + 9],
            [tx, y + height - 4],
            [tx + inside * 14, y + height + 10],
          ],
          32,
          "fine",
          0.18 + trace * 0.04,
        );
      }
    }
    for (let pin = 0; pin < 34; pin++) {
      const px = x + 17 + (pin * (width - 34)) / 34;
      layer(
        `${id}-contact-${pin}`,
        [
          [px, y + height + 17],
          [px, y + height + 22],
          [px + 2, y + height + 22],
          [px + 2, y + height + 17],
          [px, y + height + 17],
        ],
        33,
        "edge",
        0.4,
      );
    }
    for (const [index, [sx, sy]] of [
      [x - 3, y + 2],
      [x + width + 3, y + 2],
      [x + width + 3, y + height + 10],
      [x - 3, y + height + 10],
    ].entries()) {
      for (let ring = 0; ring < 2; ring++) {
        const circle: Point[] = Array.from(
          { length: 17 },
          (_, i) =>
            [
              sx + Math.cos((i * Math.PI) / 8) * (ring ? 2 : 4),
              sy + Math.sin((i * Math.PI) / 8) * (ring ? 2 : 4),
            ] as Point,
        );
        layer(`${id}-fastener-${index}-${ring}`, circle, 36, "fine", 0.47);
      }
      paths.push({
        id: `${id}-spacer-${index}`,
        d: `M${coord(point([sx, sy], 36))} L${coord(point([sx, sy], 0))}`,
        kind: "edge",
        opacity: 0.35,
      });
    }
    box(id, x, y, width, height, { opacity: 0.48 });
    label(id + "-name", name, x + 25, y + 28, { kind: "name" });
    label(id + "-role", role, x + 25, y + 50, { kind: "heading" });
    // An open, keyed ID rail is machined into the front laminate. Its recessed
    // lower edge supports the silkscreen name without making a separate badge.
    line(
      id + "-id-register",
      [
        [x + 19, y + 13],
        [x + 15, y + 17],
        [x + 15, y + 30],
        [x + 19, y + 34],
        [x + width - 21, y + 34],
        [x + width - 17, y + 30],
      ],
      "fine",
      0.42,
    );
    layer(
      id + "-id-recess",
      [
        [x + 19, y + 34],
        [x + width - 21, y + 34],
        [x + width - 17, y + 30],
        [x + width - 17, y + 32],
        [x + width - 21, y + 36],
        [x + 19, y + 36],
        [x + 19, y + 34],
      ],
      -0.8,
      "shade",
      0.16,
    );
    for (let tick = 0; tick < 3; tick++) {
      line(
        `${id}-id-key-${tick}`,
        [
          [x + width - 17, y + 15 + tick * 4],
          [x + width - 13, y + 15 + tick * 4],
        ],
        "fine",
        0.34,
      );
    }
    line(
      id + "-role-register",
      [
        [x + 17, y + 43],
        [x + 17, y + 50],
        [x + 20, y + 50],
      ],
      "fine",
      0.4,
    );
    line(
      id + "-divider",
      [
        [x + 16, y + 60],
        [x + width - 31, y + 60],
        [x + width - 27, y + 56],
        [x + width - 16, y + 56],
      ],
      "fine",
      0.3,
    );
    const base: Point[] = [
      [x + 10, y + height + 7],
      [x + width - 10, y + height + 7],
    ];
    line(id + "-base", base, "rear", 0.35);
  }
  function arrow(
    id: string,
    from: Point,
    to: Point,
    options: SurfaceOptions & { axis?: "horizontal" | "vertical" } = {},
  ) {
    const opacity = options.opacity ?? 0.8;
    const tone = options.tone ?? "neutral";
    const vertical = options.axis === "vertical";
    const a = point(from);
    const b = point(to);
    const c: Point = vertical
      ? [a[0], (a[1] + b[1]) / 2]
      : [(a[0] + b[0]) / 2, a[1]];
    const d: Point = vertical
      ? [b[0], (a[1] + b[1]) / 2]
      : [(a[0] + b[0]) / 2, b[1]];
    const path = `M${coord(a)} C${coord(c)} ${coord(d)} ${coord(b)}`;
    paths.push({
      id: id + "-path",
      d: path,
      kind: "fine",
      opacity: opacity * 0.8,
      tone,
    });
    paths.push({ id: id + "-flow", d: path, kind: "light", opacity, tone });
    const sign = vertical
      ? Math.sign(to[1] - from[1])
      : Math.sign(to[0] - from[0]);
    const head: Point[] = vertical
      ? [[to[0] - 4, to[1] - sign * 7], to, [to[0] + 4, to[1] - sign * 7]]
      : [[to[0] - sign * 7, to[1] - 4], to, [to[0] - sign * 7, to[1] + 4]];
    line(id + "-arrow", head, "edge", opacity, tone);
  }
  return {
    paths,
    labels,
    line,
    label,
    box,
    card,
    workspace,
    arrow,
    portrait,
    frame: (): ProofFrame => ({
      paths,
      labels: labels.map((item) => {
        const [x, y] = labelPositions.get(item.id)!;
        const enclosing = surfaces
          .filter(
            (surface) =>
              x >= surface.x &&
              x <= surface.x + surface.width &&
              y >= surface.y &&
              y <= surface.y + surface.height,
          )
          .sort((a, b) => a.width * a.height - b.width * b.height)[0];
        return {
          ...item,
          surface: enclosing ? enclosing.id + "-skin" : undefined,
          transform: enclosing
            ? `matrix(${[a, b, c, d, item.x - a * item.x - c * item.y, item.y - b * item.x - d * item.y].map((value) => value.toFixed(6)).join(" ")})`
            : undefined,
        };
      }),
    }),
  };
}
