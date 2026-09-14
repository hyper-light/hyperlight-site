import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Cleanup = void | (() => void);
type Effect = { dependencies: unknown[]; cleanup?: Cleanup };
type Sample = { time: number; selection: number };

/**
 * Run the real hook, component lifecycle and private update callback, replacing
 * only React's scheduling, browser delivery and SVG painting. No clock or
 * transition formula is reproduced here, and no production test API is needed.
 */
function sceneClock() {
  const slots: unknown[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  let layouts: (() => void)[] = [];
  let nextRequest = 0;
  const requests = new Map<number, (time: number) => void>();
  const listeners = new Map<string, () => void>();
  const mediaListeners = new Map<string, () => void>();
  const samples: Sample[] = [];
  let intersection:
    ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  const svg = {
    dataset: {} as Record<string, string>,
    querySelectorAll: () => [],
    querySelector: () => ({}),
    getClientRects: () => [{}],
  };
  const document = {
    hidden: false,
    addEventListener: (name: string, listener: () => void) =>
      listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  const media = {
    matches: false,
    addEventListener: (name: string, listener: () => void) =>
      mediaListeners.set(name, listener),
    removeEventListener: (name: string) => mediaListeners.delete(name),
  };
  const window = {
    requestAnimationFrame: (callback: (time: number) => void) => {
      const id = ++nextRequest;
      requests.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id: number) => requests.delete(id),
    matchMedia: () => media,
  };
  function effect(
    queue: (() => void)[],
    create: () => Cleanup,
    dependencies: unknown[],
  ) {
    const index = cursor++;
    const previous = slots[index] as Effect | undefined;
    if (
      previous &&
      dependencies.every((value, i) =>
        Object.is(value, previous.dependencies[i]),
      )
    )
      return;
    queue.push(() => {
      previous?.cleanup?.();
      slots[index] = { dependencies, cleanup: create() };
    });
  }
  const react = {
    useRef: (value: unknown) => {
      const index = cursor++;
      return slots[index] ?? (slots[index] = { current: value });
    },
    useMemo: (create: () => unknown, dependencies: unknown[]) => {
      const index = cursor++;
      const previous = slots[index] as
        { dependencies: unknown[]; value: unknown } | undefined;
      if (
        previous &&
        dependencies.every((value, i) =>
          Object.is(value, previous.dependencies[i]),
        )
      )
        return previous.value;
      const value = create();
      slots[index] = { dependencies, value };
      return value;
    },
    useId: () => "clock-test",
    useEffect: (create: () => Cleanup, dependencies: unknown[]) =>
      effect(effects, create, dependencies),
    useLayoutEffect: (create: () => Cleanup, dependencies: unknown[]) =>
      effect(layouts, create, dependencies),
  };
  const jsx = (type: unknown, props: Record<string, unknown>) => ({
    type,
    props,
  });
  const modules = new Map<string, Record<string, unknown>>();
  function load(filename: string): Record<string, unknown> {
    const cached = modules.get(filename);
    if (cached) return cached;
    const module = { exports: {} as Record<string, unknown> };
    modules.set(filename, module.exports);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    runInNewContext(
      output,
      {
        module,
        exports: module.exports,
        require: (name: string) => {
          if (name === "react") return react;
          if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
          if (name === "@/components/studies/use-study-motion")
            return load("components/studies/use-study-motion.ts");
          if (name === "./proof-scene-painter")
            return {
              createProofPainter: () => () => {},
              proofPathFill: () => undefined,
              proofToneColor: () => undefined,
            };
          if (name.endsWith(".module.css")) return { default: {} };
          throw new Error(`Unexpected scene dependency: ${name}`);
        },
        window,
        document,
        IntersectionObserver: class {
          constructor(callback: typeof intersection) {
            intersection = callback;
          }
          observe() {}
          disconnect() {
            intersection = undefined;
          }
        },
      },
      { filename },
    );
    return module.exports;
  }
  const { ProofScene } = load("components/proof-work/proof-scene.tsx") as {
    ProofScene: (props: Record<string, unknown>) => {
      props: Record<string, unknown>;
    };
  };
  const frame = (time: number, selection: number) => {
    samples.push({ time, selection });
    return { paths: [], labels: [] };
  };
  const props = {
    frame,
    selection: 0,
    portrait: false,
    paused: false,
    stepDuration: 3.2,
    transitionLimit: undefined as number | undefined,
  };
  function render(changes: Partial<typeof props> = {}) {
    Object.assign(props, changes);
    cursor = 0;
    effects = [];
    layouts = [];
    const node = ProofScene(props);
    (node.props.ref as { current: unknown }).current = svg;
    for (const [name, value] of Object.entries(node.props)) {
      if (name.startsWith("data-")) {
        const key = name
          .slice(5)
          .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
        svg.dataset[key] = value === undefined ? "" : String(value);
      }
    }
    for (const apply of layouts) apply();
    for (const apply of effects) apply();
  }
  render();
  return {
    render,
    samples,
    last: () => samples.at(-1)!,
    pending: () => requests.size,
    visible(value: boolean) {
      intersection?.([{ isIntersecting: value }]);
    },
    hidden(value: boolean) {
      document.hidden = value;
      listeners.get("visibilitychange")?.();
    },
    reduced(value: boolean) {
      media.matches = value;
      mediaListeners.get("change")?.();
    },
    tick(time: number) {
      const callbacks = [...requests.values()];
      requests.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

function near(actual: number, expected: number, message: string) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

test("the mounted scene clock retains active elapsed time across 250ms RAF gaps", () => {
  const scene = sceneClock();
  scene.visible(true);
  scene.tick(1000);
  for (let frame = 1; frame <= 32; frame++) scene.tick(1000 + frame * 250);
  near(
    scene.last().time,
    8,
    "eight active seconds must not become 3.2 seconds",
  );
});

test("long frame gaps finish each real scene transition before the next five-second stage", () => {
  for (const gap of [200, 250, 300]) {
    const scene = sceneClock();
    scene.visible(true);
    let now = 1000;
    scene.tick(now);
    for (let stage = 1; stage <= 7; stage++) {
      scene.render({ selection: stage });
      for (let frame = 0; frame < Math.ceil(5000 / gap); frame++) {
        now += gap;
        scene.tick(now);
      }
      near(
        scene.last().selection,
        stage,
        `${gap}ms RAF, requested stage ${stage}`,
      );
    }
  }
});

test("slow and normal RAF cadence sample the same continuous transition", () => {
  const sample = (gap: number) => {
    const scene = sceneClock();
    scene.visible(true);
    scene.tick(1000);
    scene.render({ selection: 1 });
    for (let elapsed = gap; elapsed <= 1600; elapsed += gap)
      scene.tick(1000 + elapsed);
    return scene.last();
  };
  const normal = sample(20);
  near(normal.time, 1.6, "normal clock");
  near(normal.selection, 0.5, "unchanged half-transition pose");
  const slow = sample(200);
  near(slow.time, normal.time, "clock cadence parity");
  near(slow.selection, normal.selection, "continuous pose cadence parity");
});

for (const reason of ["paused", "offscreen", "hidden", "reduced"] as const) {
  test(`${reason} time is excluded and the scene resumes its in-flight pose`, () => {
    const scene = sceneClock();
    scene.visible(true);
    scene.tick(1000);
    scene.render({ selection: 1 });
    for (let frame = 1; frame <= 20; frame++) scene.tick(1000 + frame * 50);
    const before = { ...scene.last() };
    if (reason === "paused") scene.render({ paused: true });
    if (reason === "offscreen") scene.visible(false);
    if (reason === "hidden") scene.hidden(true);
    if (reason === "reduced") scene.reduced(true);
    assert.equal(scene.pending(), 0);
    scene.tick(12000);
    assert.deepEqual(scene.last(), before);
    if (reason === "paused") {
      scene.render({ paused: false });
      scene.visible(true);
    }
    if (reason === "offscreen") scene.visible(true);
    if (reason === "hidden") scene.hidden(false);
    if (reason === "reduced") scene.reduced(false);
    scene.tick(12000);
    near(
      scene.last().time,
      before.time,
      "resume must not include inactive ten seconds",
    );
    near(scene.last().selection, before.selection, "resume pose");
    scene.tick(12250);
    near(
      scene.last().time,
      before.time + 0.25,
      "first active gap after resume",
    );
  });
}

test("manual selections while paused still render immediately", () => {
  const scene = sceneClock();
  scene.render({ paused: true, selection: 6 });
  near(scene.last().selection, 6, "paused manual stage");
  assert.equal(scene.pending(), 0);
});

test("a manual seek keeps its duration cap during a long active frame", () => {
  const scene = sceneClock();
  scene.visible(true);
  scene.tick(1000);
  scene.render({ selection: 7, transitionLimit: 1.2 });
  for (let frame = 1; frame <= 4; frame++) scene.tick(1000 + frame * 300);
  near(scene.last().selection, 7, "manual seek remains 1.2 seconds");
});
