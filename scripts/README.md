# Article animation measurements

Run the motion benchmark against an already-running production build. It does not start, stop, or rebuild a server. Chrome and the project's Playwright dependency are required; use `--channel chromium` with Playwright's installed Chromium instead.

```sh
node scripts/measure-article-motion.mjs --url http://127.0.0.1:3001/blog/introducing-slates --production --cpu 4 --samples 2 --duration 3000 --output /tmp/slates-motion.json
node scripts/measure-article-motion.mjs --url http://127.0.0.1:3001/blog/introducing-slates --production --cpu 1 --network slow4g --samples 1 --duration 1000 --output /tmp/slates-loading.json
```

The harness uses a 390×844 viewport, disables the network cache, approaches the orbital illustration, and alternates its real Pause/Resume controls while measuring the Provision stage. It records rAF gaps, long tasks, document/SVG counts, and encoded network transfers. `illustrationReadyMs` includes navigation, fonts, approaching the illustration, and its geometry download; it is not a general time-to-interactive score. `documentBeforeApproach` describes the initial page; `afterApproach` includes the mounted illustration.

`slow4g` means 150ms latency, 1.6Mibit/s down and 750Kibit/s up. CPU throttling is relative to the host computer; these results are not measurements on a physical iPhone. Run baseline and candidate sequentially on the same machine, without builds or other browser tests running. Use fresh contexts and identical flags for comparisons.

Timing is reported without failing ordinary test runs. Add `--max-p95 50` to opt into a nonzero exit when an active rAF p95 gap exceeds 50ms. `--production` also fails if development-runtime indicators are detected. The JSON artifact retains each sample rather than hiding variability in a single average.
