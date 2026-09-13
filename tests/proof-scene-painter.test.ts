import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProofFrame } from "../components/proof-work/proof-geometry";
import {
  createProofPainter,
  proofPathFill,
  proofToneColor,
  type ProofPaintElement,
} from "../components/proof-work/proof-scene-painter";
import {
  orbitalFleetFrame,
  orbitalFleetFrames,
} from "../components/slates/orbital-fleet-geometry";

class RecordedElement implements ProofPaintElement {
  readonly attributes = new Map<string, string>();
  readonly writes: string[] = [];
  readonly style = new Proxy(
    { stroke: "", fill: "" },
    {
      set: (target, key: "stroke" | "fill", value: string) => {
        this.writes.push(`style:${key}`);
        target[key] = value;
        return true;
      },
    },
  );
  readonly dataset = new Proxy<Record<string, string | undefined>>(
    {},
    {
      set: (target, key: string, value: string) => {
        this.writes.push(`data:${key}`);
        target[key] = value;
        return true;
      },
      deleteProperty: (target, key: string) => {
        this.writes.push(`delete-data:${key}`);
        delete target[key];
        return true;
      },
    },
  );
  private text = "";
  get textContent() {
    return this.text;
  }
  set textContent(value: string | null) {
    this.writes.push("textContent");
    this.text = value ?? "";
  }
  setAttribute(name: string, value: string) {
    this.writes.push(`set:${name}`);
    this.attributes.set(name, value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string) {
    this.writes.push(`remove:${name}`);
    this.attributes.delete(name);
  }
}

function fixture(frame: ProofFrame) {
  const svg = new RecordedElement(),
    paths = frame.paths.map(() => new RecordedElement()),
    labels = frame.labels.map(() => new RecordedElement()),
    prism = new RecordedElement(),
    all = [svg, ...paths, ...labels, prism];
  return {
    svg,
    paths,
    labels,
    prism,
    paint: createProofPainter(svg, paths, labels, prism, "test"),
    writes: () => all.reduce((sum, element) => sum + element.writes.length, 0),
    reset: () => all.forEach((element) => (element.writes.length = 0)),
  };
}

test("painting the same real orbital frame twice performs no redundant DOM writes", (t) => {
  const frame = orbitalFleetFrame(1, 1, true),
    dom = fixture(frame);
  dom.paint(frame, 1, 1);
  dom.reset();
  dom.paint(frame, 1, 1);
  t.diagnostic(`Repeated orbital frame DOM writes: ${dom.writes()}`);
  assert.equal(dom.writes(), 0);
});

test("unchanged raw frame values skip repeated numeric serialization", (t) => {
  const frame = orbitalFleetFrame(1, 1, true),
    dom = fixture(frame);
  dom.paint(frame, 1, 1);
  const formatting = t.mock.method(Number.prototype, "toFixed");
  dom.paint(frame, 1, 1);
  assert.equal(formatting.mock.callCount(), 0);
});

test("raw snapshots preserve in-place updates and avoid writes below rendering precision", () => {
  const frame: ProofFrame = {
    paths: [
      {
        id: "hull",
        d: "M0 0L10 0Z",
        kind: "glass",
        opacity: 0.5,
        fillOpacity: 0.4,
        strokeOpacity: 0.6,
        fillColor: "#123456",
        tone: "pass",
      },
    ],
    labels: [{ id: "label", text: "Ready", x: 5, y: 6, opacity: 0.5 }],
  };
  const dom = fixture(frame);
  dom.paint(frame, 1, 1);
  dom.reset();
  frame.paths[0].opacity = 0.5001;
  frame.paths[0].fillOpacity = 0.4001;
  frame.paths[0].strokeOpacity = 0.6001;
  frame.labels[0].x = 5.001;
  frame.labels[0].y = 6.001;
  frame.labels[0].opacity = 0.5001;
  dom.paint(frame, 1, 1.0001);
  assert.equal(dom.writes(), 0);

  frame.paths[0].d = "M0 0L20 0Z";
  frame.paths[0].opacity = 0.7;
  frame.paths[0].kind = "edge";
  delete frame.paths[0].fillColor;
  delete frame.paths[0].fillOpacity;
  delete frame.paths[0].strokeOpacity;
  delete frame.paths[0].tone;
  frame.labels[0].text = "Changed";
  frame.labels[0].x = 8;
  dom.paint(frame, 1, 2);
  assert.equal(dom.paths[0].attributes.get("d"), "M0 0L20 0Z");
  assert.equal(dom.paths[0].attributes.get("opacity"), "0.700");
  assert.equal(dom.paths[0].attributes.get("fill"), "none");
  assert.equal(dom.paths[0].attributes.get("fill-opacity"), undefined);
  assert.equal(dom.paths[0].attributes.get("stroke-opacity"), undefined);
  assert.equal(dom.paths[0].style.stroke, "");
  assert.equal(dom.labels[0].attributes.get("x"), "8.00");
  assert.equal(dom.labels[0].textContent, "Changed");
  assert.equal(dom.svg.dataset.proofSelection, "2.000");
});

test("an adjacent orbital frame changes far fewer attributes than a full repaint", (t) => {
  const frame = orbitalFleetFrame(1, 1, true),
    dom = fixture(frame);
  dom.paint(frame, 1, 1);
  dom.reset();
  dom.paint(orbitalFleetFrame(1 + 1 / 60, 1, true), 1 + 1 / 60, 1);
  t.diagnostic(`Adjacent orbital frame DOM writes: ${dom.writes()}`);
  assert.ok(
    dom.writes() < frame.paths.length,
    "only changing geometry and light should be written",
  );
});

test("rebinding a scene to existing matching markup does not rewrite that markup", () => {
  const frame = orbitalFleetFrame(1, 1, true),
    dom = fixture(frame);
  dom.paint(frame, 1, 1);
  dom.reset();
  createProofPainter(
    dom.svg,
    dom.paths,
    dom.labels,
    dom.prism,
    "test",
  )(frame, 1, 1);
  assert.equal(dom.writes(), 0);
});

test("optional paint attributes return to their default instead of retaining stale values", () => {
  const frame: ProofFrame = {
    paths: [
      {
        id: "hull",
        d: "M0 0L10 0Z",
        kind: "light",
        opacity: 1,
        material: "metal",
        fillColor: "#123456",
        fillOpacity: 0.4,
        strokeOpacity: 0.6,
        tone: "pass",
      },
    ],
    labels: [
      {
        id: "label",
        text: "Ready",
        x: 5,
        y: 6,
        transform: "translate(2 3)",
        surface: "metal",
        tone: "pass",
      },
    ],
  };
  const dom = fixture(frame);
  dom.paths[0].attributes.set("fill", "url(#test-metal)");
  dom.paint(frame, 1, 1);
  dom.paint(
    {
      paths: [
        {
          id: "hull",
          d: "M0 0L10 0Z",
          kind: "edge",
          opacity: 1,
          material: "metal",
        },
      ],
      labels: [{ id: "label", text: "Ready", x: 5, y: 6 }],
    },
    1,
    1,
  );
  assert.equal(dom.paths[0].attributes.get("fill-opacity"), undefined);
  assert.equal(dom.paths[0].attributes.get("stroke-opacity"), undefined);
  assert.equal(dom.paths[0].attributes.get("stroke-dashoffset"), undefined);
  assert.equal(dom.paths[0].attributes.get("fill"), "url(#test-metal)");
  assert.equal(dom.paths[0].style.stroke, "");
  assert.equal(dom.labels[0].attributes.get("transform"), undefined);
  assert.equal(dom.labels[0].dataset.proofSurface, undefined);
  assert.equal(dom.labels[0].style.fill, "");
});

test("a running light and prismatic gradient still animate when all other fields are unchanged", () => {
  const frame: ProofFrame = {
    paths: [{ id: "beam", d: "M0 0L10 0", kind: "light", opacity: 1 }],
    labels: [{ id: "label", text: "Ready", x: 5, y: 6 }],
  };
  const dom = fixture(frame);
  dom.paint(frame, 1, 1);
  dom.reset();
  dom.paint(frame, 2, 1);
  assert.deepEqual(dom.paths[0].writes, ["set:stroke-dashoffset"]);
  assert.deepEqual(dom.prism.writes, ["set:x1", "set:x2"]);
  assert.equal(dom.labels[0].writes.length, 0);
  assert.equal(dom.svg.writes.length, 0);
});

test("the slow prismatic wash refreshes at 10 Hz without slowing geometry or running lights", () => {
  const frame: ProofFrame = {
    paths: [{ id: "beam", d: "M0 0L10 0", kind: "light", opacity: 1 }],
    labels: [],
  };
  const dom = fixture(frame);
  dom.paint(frame, 1.01, 1);
  dom.reset();
  frame.paths[0].d = "M0 0L11 0";
  dom.paint(frame, 1.09, 1);
  assert.deepEqual(dom.prism.writes, []);
  assert.deepEqual(dom.paths[0].writes, ["set:d", "set:stroke-dashoffset"]);
  assert.equal(dom.paths[0].attributes.get("d"), "M0 0L11 0");
  assert.equal(
    dom.paths[0].attributes.get("stroke-dashoffset"),
    (-1.09 * 22).toFixed(2),
  );
  dom.reset();
  dom.paint(frame, 1.11, 1);
  assert.deepEqual(dom.prism.writes, ["set:x1", "set:x2"]);
  assert.equal(
    dom.prism.attributes.get("x1"),
    (-100 + Math.sin(1.1 * 0.23) * 130).toFixed(2),
  );
  assert.equal(
    dom.prism.attributes.get("x2"),
    (760 + Math.sin(1.1 * 0.19) * 110).toFixed(2),
  );
});

test("only exact-zero opacity removes a path from painting and faint paths return immediately", () => {
  const frame: ProofFrame = {
    paths: [{ id: "hull", d: "M0 0L10 0Z", kind: "glass", opacity: 0 }],
    labels: [],
  };
  const dom = fixture(frame);
  for (const opacity of [0, 0.0001, 0.02, 1, 0]) {
    frame.paths[0].opacity = opacity;
    dom.paint(frame, 1, 1);
    assert.equal(
      dom.paths[0].attributes.get("display"),
      opacity === 0 ? "none" : undefined,
    );
    assert.equal(dom.paths[0].attributes.get("opacity"), opacity.toFixed(3));
    assert.equal(dom.paths[0].attributes.get("d"), "M0 0L10 0Z");
  }
  dom.reset();
  createProofPainter(
    dom.svg,
    dom.paths,
    dom.labels,
    dom.prism,
    "test",
  )(frame, 1, 1);
  assert.equal(dom.writes(), 0, "rebinding keeps the already hidden hull");
});

test("rebinding recognizes browser-normalized tone styles without rewriting them", () => {
  const frame: ProofFrame = {
    paths: [
      { id: "beam", d: "M0 0L10 0", kind: "edge", opacity: 1, tone: "pass" },
    ],
    labels: [{ id: "label", text: "Ready", x: 5, y: 6, tone: "pass" }],
  };
  const dom = fixture(frame);
  dom.paint(frame, 1, 1);
  dom.paths[0].style.stroke = "rgb(168, 201, 188)";
  dom.labels[0].style.fill = "rgb(168, 201, 188)";
  dom.reset();
  createProofPainter(
    dom.svg,
    dom.paths,
    dom.labels,
    dom.prism,
    "test",
  )(frame, 1, 1);
  assert.equal(dom.writes(), 0);
});

test("diff painting preserves every visual frame value across all orbital stories and backward seeks", () => {
  for (const frame of Object.values(orbitalFleetFrames)) {
    const dom = fixture(frame(0, 0, true));
    for (const selection of [0, 0.5, 1.3, 2.8, 4.3, 6.9, 7, 2, 0]) {
      const time = 1.37 + selection,
        next = frame(time, selection, true);
      dom.paint(next, time, selection);
      next.paths.forEach((path, i) => {
        const element = dom.paths[i];
        assert.equal(element.attributes.get("d"), path.d, path.id);
        assert.equal(
          element.attributes.get("opacity"),
          path.opacity.toFixed(3),
        );
        assert.equal(
          element.attributes.get("display"),
          path.opacity === 0 ? "none" : undefined,
        );
        assert.equal(
          element.attributes.get("fill"),
          proofPathFill(path, "test"),
        );
        assert.equal(
          element.attributes.get("fill-opacity"),
          path.fillOpacity?.toFixed(3),
        );
        assert.equal(
          element.attributes.get("stroke-opacity"),
          path.strokeOpacity?.toFixed(3),
        );
        assert.equal(
          element.style.stroke,
          path.material === "shadow"
            ? "none"
            : (proofToneColor(path.tone) ?? ""),
        );
        assert.equal(
          element.attributes.get("stroke-dashoffset"),
          path.kind === "light" ? (-time * 22 + i * 7).toFixed(2) : undefined,
        );
      });
      next.labels.forEach((label, i) => {
        const element = dom.labels[i];
        assert.equal(element.textContent, label.text);
        assert.equal(element.attributes.get("x"), label.x.toFixed(2));
        assert.equal(element.attributes.get("y"), label.y.toFixed(2));
        assert.equal(
          element.attributes.get("opacity"),
          (label.opacity ?? 1).toFixed(3),
        );
        assert.equal(
          element.attributes.get("transform"),
          label.transform || undefined,
        );
        assert.equal(element.dataset.proofSurface, label.surface || undefined);
        assert.equal(element.style.fill, proofToneColor(label.tone) ?? "");
      });
      assert.equal(dom.svg.dataset.proofSelection, selection.toFixed(3));
    }
  }
});
