// Opt-in browser benchmark. Run separately from builds and functional tests.
import { chromium, devices } from "playwright";
import { writeFile } from "node:fs/promises";
import { arch, cpus, platform } from "node:os";

if (process.argv.includes("--help")) {
  console.log(
    "Usage: node scripts/measure-article-motion.mjs --url <article URL> [--production] [--cpu 1,4] [--duration 3000] [--samples 2] [--network unthrottled|slow4g] [--max-p95 50] [--channel chrome|chromium] [--output report.json]",
  );
  process.exit(0);
}

const option = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const url = option("url", "http://localhost:3000/blog/introducing-slates");
const cpuRates = option("cpu", "4").split(",").map(Number);
const duration = Number(option("duration", "3000"));
const samples = Number(option("samples", "2"));
const network = option("network", "unthrottled");
const output = option("output", "article-motion-report.json");
const production = process.argv.includes("--production");
const maxP95 = Number(option("max-p95", "0"));
const channel = option("channel", "chrome");
if (!["unthrottled", "slow4g"].includes(network))
  throw new Error("Use --network unthrottled or slow4g");
if (
  cpuRates.some((rate) => !Number.isFinite(rate) || rate < 1) ||
  !Number.isInteger(samples) ||
  samples < 1 ||
  duration < 500 ||
  !Number.isFinite(duration) ||
  !Number.isFinite(maxP95) ||
  maxP95 < 0
)
  throw new Error(
    "CPU must be >=1; samples a positive integer; duration >=500ms; max-p95 >=0",
  );
const thresholds = { activeP95GapMs: maxP95 || null };
const browser = await chromium.launch(
  channel === "chromium" ? {} : { channel },
);
const report = {
  url,
  runAt: new Date().toISOString(),
  browser: browser.version(),
  host: { platform: platform(), architecture: arch(), cpu: cpus()[0]?.model },
  viewport: { width: 390, height: 844 },
  network,
  production,
  thresholds,
  runs: [],
};

async function measure(page) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const gaps = [],
          longTasks = [];
        const observer = new PerformanceObserver((list) => {
          longTasks.push(...list.getEntries().map((entry) => entry.duration));
        });
        observer.observe({ entryTypes: ["longtask"] });
        let first, last;
        const tick = (time) => {
          first ??= time;
          if (last !== undefined) gaps.push(time - last);
          last = time;
          if (time - first < duration) {
            requestAnimationFrame(tick);
            return;
          }
          longTasks.push(
            ...observer.takeRecords().map((entry) => entry.duration),
          );
          observer.disconnect();
          const sorted = gaps.toSorted((a, b) => a - b);
          const percentile = (p) =>
            sorted[
              Math.min(sorted.length - 1, Math.floor(sorted.length * p))
            ] ?? 0;
          const svg = document.querySelector(
            '[data-proof-figure="slates-orbital-fleet"] [data-proof-scene][data-portrait="true"]',
          );
          resolve({
            elapsedMs: time - first,
            rafCount: gaps.length,
            fps: (gaps.length * 1000) / (time - first),
            gapMedianMs: percentile(0.5),
            gapP95Ms: percentile(0.95),
            gapP99Ms: percentile(0.99),
            gapMaxMs: sorted.at(-1) ?? 0,
            gapsOver33Ms: gaps.filter((gap) => gap > 33.4).length,
            gapsOver50Ms: gaps.filter((gap) => gap > 50).length,
            longTaskCount: longTasks.length,
            longTaskTotalMs: longTasks.reduce((a, b) => a + b, 0),
            longTaskMaxMs: Math.max(0, ...longTasks),
            selection: svg?.dataset.proofSelection,
            motion: document.documentElement.dataset.motion,
            visibility: document.visibilityState,
          });
        };
        requestAnimationFrame(tick);
      }),
    duration,
  );
}

try {
  for (const cpu of cpuRates) {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: report.viewport,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    if (network === "slow4g")
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
        connectionType: "cellular4g",
      });
    const requests = new Map();
    cdp.on("Network.responseReceived", ({ requestId, type, response }) => {
      const target = new URL(response.url);
      requests.set(requestId, {
        type,
        path: target.pathname,
        status: response.status,
        encodedBytes: 0,
      });
    });
    cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
      const request = requests.get(requestId);
      if (request) request.encodedBytes = encodedDataLength;
    });
    const consoleIssues = [];
    page.on("pageerror", (error) =>
      consoleIssues.push({ type: "pageerror", message: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        consoleIssues.push({
          type: "console",
          message: message.text().slice(0, 300),
        });
    });
    const start = performance.now();
    console.log(
      JSON.stringify({ event: "navigation-start", cpu, network, url }),
    );
    const response = await page.goto(url, {
      waitUntil: "load",
      timeout: 180000,
    });
    const loadMs = performance.now() - start;
    const figure = page.locator('[data-proof-figure="slates-orbital-fleet"]');
    const svg = figure.locator("[data-proof-scene]:visible");
    await page.evaluate(() => document.fonts.ready);
    const documentBeforeApproach = await page.evaluate(() => ({
      nodes: document.querySelectorAll("*").length,
      proofScenes: document.querySelectorAll("[data-proof-scene]").length,
      proofPaths: document.querySelectorAll("[data-proof-path]").length,
    }));
    await figure.getByRole("button", { name: /^Pause .* animation$/ }).click();
    await figure
      .getByRole("button", { name: /^Resume .* animation$/ })
      .waitFor();
    await figure.getByRole("tab", { name: "Provision", exact: true }).click();
    await svg.getAttribute("data-proof-selection");
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            '[data-proof-figure="slates-orbital-fleet"] [data-proof-scene]',
          )
          ?.getAttribute("data-proof-selection") === "1.000",
    );
    const illustrationReadyMs = performance.now() - start;
    const documentText = await response.text();
    const initial = await page.evaluate(() => ({
      documentNodes: document.querySelectorAll("*").length,
      svgCount: document.querySelectorAll("svg").length,
      allPathCount: document.querySelectorAll("path").length,
      proofSceneCount: document.querySelectorAll("[data-proof-scene]").length,
      proofPathCount: document.querySelectorAll("[data-proof-path]").length,
      orbitalPathCount: document.querySelectorAll(
        '[data-proof-figure="slates-orbital-fleet"] [data-proof-path]',
      ).length,
      visibleOrbitalPathCount: document.querySelectorAll(
        '[data-proof-figure="slates-orbital-fleet"] [data-portrait="true"] [data-proof-path]',
      ).length,
      devIndicators: {
        nextPortal: !!document.querySelector("nextjs-portal"),
        hmrResources: performance
          .getEntriesByType("resource")
          .filter((entry) => /turbopack|hmr|hot-update/.test(entry.name))
          .length,
      },
      navigation: performance.getEntriesByType("navigation").map((entry) => ({
        duration: entry.duration,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        domContentLoadedMs: entry.domContentLoadedEventEnd,
        loadMs: entry.loadEventEnd,
      })),
      resources: performance.getEntriesByType("resource").map((entry) => ({
        type: entry.initiatorType,
        path: new URL(entry.name).pathname,
        duration: entry.duration,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
      })),
    }));
    await svg.evaluate((element) =>
      window.scrollTo({
        top:
          scrollY +
          element.getBoundingClientRect().top -
          document.querySelector(".site-header").getBoundingClientRect()
            .height -
          8,
        behavior: "instant",
      }),
    );
    const run = {
      cpu,
      status: response.status(),
      loadMs,
      illustrationReadyMs,
      documentBytes: Buffer.byteLength(documentText),
      documentBeforeApproach,
      afterApproach: initial,
      measurements: [],
    };
    console.log(
      JSON.stringify({
        event: "initial",
        cpu,
        status: run.status,
        loadMs,
        illustrationReadyMs,
        documentBytes: run.documentBytes,
        nodes: initial.documentNodes,
        proofPaths: initial.proofPathCount,
      }),
    );
    for (let sample = 0; sample < samples; sample++) {
      for (const state of sample % 2
        ? ["active", "paused"]
        : ["paused", "active"]) {
        const next =
          state === "active" ? /^Resume .* animation$/ : /^Pause .* animation$/;
        const control = figure.getByRole("button", { name: next });
        if (await control.count()) await control.dispatchEvent("click");
        await page.waitForTimeout(300);
        const result = { sample, state, ...(await measure(page)) };
        run.measurements.push(result);
        console.log(JSON.stringify({ event: "measurement", cpu, ...result }));
      }
    }
    run.requests = [...requests.values()];
    run.encodedTransferBytes = run.requests.reduce(
      (sum, item) => sum + item.encodedBytes,
      0,
    );
    run.consoleIssues = consoleIssues;
    report.runs.push(run);
    await context.close();
  }
} finally {
  await browser.close();
}
report.productionVerified = report.runs.every(
  (run) =>
    !run.afterApproach.devIndicators.nextPortal &&
    run.afterApproach.devIndicators.hmrResources === 0,
);
report.red =
  (production && !report.productionVerified) ||
  (maxP95 > 0 &&
    report.runs.some((run) =>
      run.measurements.some(
        (item) => item.state === "active" && item.gapP95Ms > maxP95,
      ),
    ));
await writeFile(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    event: "verdict",
    red: report.red,
    criterion: maxP95
      ? `Active rAF p95 gap exceeds ${maxP95}ms`
      : "No timing threshold requested",
    output,
  }),
);
process.exitCode = report.red ? 1 : 0;
