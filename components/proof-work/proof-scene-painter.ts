import type {
  ProofFrame,
  ProofLabel,
  ProofPath,
  ProofTone,
} from "./proof-geometry";

const toneColor = {
  pass: "#a8c9bc",
  fail: "#d5a4ad",
  pending: "#aab8d2",
  error: "#d8bb95",
};
const serializedToneColors = new Map(
  Object.values(toneColor).map((hex) => {
    const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    return [`rgb(${channels.join(", ")})`, hex];
  }),
);

export function proofToneColor(tone: ProofTone | undefined) {
  return tone && tone !== "neutral" ? toneColor[tone] : undefined;
}

export function proofPathFill(path: ProofPath, prefix: string) {
  return (
    path.fillColor ??
    (path.material
      ? `url(#${prefix}-${path.material})`
      : path.kind === "glass" || path.kind === "shade"
        ? `url(#${prefix}-glass)`
        : "none")
  );
}

/** The small DOM surface used by the painter can also record actual writes in tests. */
export type ProofPaintElement = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  style: { stroke: string; fill: string };
  dataset: { [key: string]: string | undefined };
  textContent: string | null;
};

export type ProofFramePainter = (
  frame: ProofFrame,
  time: number,
  selection: number,
) => void;

/** Cache serialized values, not DOM reads: unchanged frames do not invalidate
 * SVG attributes/styles, and an omitted optional value is removed once. */
function writer(element: ProofPaintElement) {
  const values = new Map<string, string | undefined>();
  const changed = (name: string, value: string | undefined) => {
    if (values.has(name) && values.get(name) === value) return false;
    values.set(name, value);
    return true;
  };
  return {
    attribute(name: string, value: string | undefined) {
      const key = `attribute:${name}`;
      if (!values.has(key))
        values.set(key, element.getAttribute(name) ?? undefined);
      if (!changed(key, value)) return;
      if (value === undefined) element.removeAttribute(name);
      else element.setAttribute(name, value);
    },
    style(name: "stroke" | "fill", value: string) {
      const key = `style:${name}`;
      if (!values.has(key)) {
        const current = element.style[name];
        values.set(key, serializedToneColors.get(current) ?? current);
      }
      if (changed(key, value)) element.style[name] = value;
    },
    data(name: string, value: string | undefined) {
      const key = `data:${name}`;
      if (!values.has(key)) values.set(key, element.dataset[name]);
      if (!changed(key, value)) return;
      if (value === undefined) delete element.dataset[name];
      else element.dataset[name] = value;
    },
    text(value: string) {
      if (changed("text", value) && element.textContent !== value)
        element.textContent = value;
    },
  };
}

export function createProofPainter(
  svg: ProofPaintElement,
  paths: ProofPaintElement[],
  labels: ProofPaintElement[],
  prism: ProofPaintElement,
  prefix: string,
): ProofFramePainter {
  const pathWriters = paths.map(writer),
    labelWriters = labels.map(writer),
    prismWriter = writer(prism),
    svgWriter = writer(svg);
  // Primitive snapshots also handle callers that mutate their frame in place.
  // Most hardware fields stay fixed: skip formatting and serialized-cache work
  // for those fields, while retaining that cache for sub-pixel numeric changes.
  const previousPaths: (ProofPath | undefined)[] = [],
    previousLabels: (ProofLabel | undefined)[] = [];
  let previousTime: number | undefined,
    previousSelection: number | undefined,
    previousPrismTick: number | undefined;
  return (frame, time, selection) => {
    const timeChanged = time !== previousTime;
    frame.paths.forEach((path, index) => {
      const element = pathWriters[index],
        previous = previousPaths[index];
      if (!previous || path.d !== previous.d) element.attribute("d", path.d);
      if (!previous || path.opacity !== previous.opacity) {
        element.attribute("opacity", path.opacity.toFixed(3));
        // Keep every path and vertex, but exclude wholly invisible hardware
        // from SVG painting. Any nonzero value restores the path immediately.
        element.attribute("display", path.opacity === 0 ? "none" : undefined);
      }
      if (!previous || path.fillOpacity !== previous.fillOpacity)
        element.attribute("fill-opacity", path.fillOpacity?.toFixed(3));
      if (
        !previous ||
        path.fillColor !== previous.fillColor ||
        path.material !== previous.material ||
        path.kind !== previous.kind
      )
        element.attribute("fill", proofPathFill(path, prefix));
      if (!previous || path.strokeOpacity !== previous.strokeOpacity)
        element.attribute("stroke-opacity", path.strokeOpacity?.toFixed(3));
      if (
        !previous ||
        path.material !== previous.material ||
        path.tone !== previous.tone
      )
        element.style(
          "stroke",
          path.material === "shadow"
            ? "none"
            : (proofToneColor(path.tone) ?? ""),
        );
      if (
        !previous ||
        path.kind !== previous.kind ||
        (path.kind === "light" && timeChanged)
      )
        element.attribute(
          "stroke-dashoffset",
          path.kind === "light"
            ? (-time * 22 + index * 7).toFixed(2)
            : undefined,
        );
      if (!previous) previousPaths[index] = { ...path };
      else {
        previous.d = path.d;
        previous.opacity = path.opacity;
        previous.fillOpacity = path.fillOpacity;
        previous.fillColor = path.fillColor;
        previous.material = path.material;
        previous.kind = path.kind;
        previous.strokeOpacity = path.strokeOpacity;
        previous.tone = path.tone;
      }
    });
    frame.labels.forEach((label, index) => {
      const element = labelWriters[index],
        previous = previousLabels[index];
      if (!previous || label.x !== previous.x)
        element.attribute("x", label.x.toFixed(2));
      if (!previous || label.y !== previous.y)
        element.attribute("y", label.y.toFixed(2));
      if (!previous || label.opacity !== previous.opacity)
        element.attribute("opacity", (label.opacity ?? 1).toFixed(3));
      if (!previous || label.transform !== previous.transform)
        element.attribute("transform", label.transform || undefined);
      if (!previous || label.tone !== previous.tone)
        element.style("fill", proofToneColor(label.tone) ?? "");
      if (!previous || label.surface !== previous.surface)
        element.data("proofSurface", label.surface || undefined);
      if (!previous || label.text !== previous.text) element.text(label.text);
      if (!previous) previousLabels[index] = { ...label };
      else {
        previous.x = label.x;
        previous.y = label.y;
        previous.opacity = label.opacity;
        previous.transform = label.transform;
        previous.tone = label.tone;
        previous.surface = label.surface;
        previous.text = label.text;
      }
    });
    if (timeChanged) {
      // This slow, scene-wide color wash invalidates every prismatic stroke.
      // Refresh it at 10 Hz; geometry and running lights retain the full clock.
      const prismTick = Math.floor(time * 10);
      if (prismTick !== previousPrismTick) {
        const prismTime = prismTick / 10;
        prismWriter.attribute(
          "x1",
          (-100 + Math.sin(prismTime * 0.23) * 130).toFixed(2),
        );
        prismWriter.attribute(
          "x2",
          (760 + Math.sin(prismTime * 0.19) * 110).toFixed(2),
        );
        previousPrismTick = prismTick;
      }
      previousTime = time;
    }
    if (selection !== previousSelection) {
      svgWriter.data("proofSelection", selection.toFixed(3));
      previousSelection = selection;
    }
  };
}
