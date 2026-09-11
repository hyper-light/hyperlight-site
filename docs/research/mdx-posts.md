# MDX posts: implementation notes

Verified against official documentation on 2026-09-10. Scope: trusted repository posts rendered on the server alongside the existing sanitized Markdown path. No dependencies installed or application code changed for this research.

## Recommended renderer

For this existing filesystem pipeline, `evaluate` is the simplest supported API: it compiles and runs MDX, returning a module whose default export is the content component. Use the production JSX runtime explicitly, including during development:

```tsx
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";

const { default: Content } = await evaluate(source, {
  ...runtime,
  format: "mdx",
  development: false,
});
return <Content components={components} />;
```

The equivalent split is `compile(source, { outputFormat: "function-body", format: "mdx", development: false })`, then `run(compiled, runtime)`. Prefer that separation only when retaining compiled JavaScript is useful. Both execute JavaScript. `development: true` instead requires `react/jsx-dev-runtime`. These are documented core APIs, although MDX generally recommends bundler integrations when suitable. [MDX compiler API](https://mdxjs.com/packages/mdx/#evaluatefile-options), [function-body output](https://mdxjs.com/packages/mdx/#processoroptions).

## Component registry and Next.js

Pass imported components through the `components` prop: custom names such as `VorpalArchitecture`, and element overrides such as `a` or `pre`, share this mechanism. No context provider is necessary; MDX explicitly notes that context providers do not work in RSC. [Component injection](https://mdxjs.com/guides/injecting-components/).

Keep filesystem access and evaluation in a server-only module and return the React tree from the async article Server Component. Next supports server-rendered MDX. Its `mdx-components.tsx` requirement applies to the `@next/mdx` integration, not this direct compiler path. Existing frontmatter extraction can remain separate; Next’s integration does not parse YAML frontmatter by default. [Next MDX guide](https://nextjs.org/docs/app/guides/mdx).

For interactive registry entries, import ordinary components marked `"use client"`; keep the article renderer itself server-side. Props crossing into those components must be serializable. Use `import "server-only"` to detect accidental client imports at build time. This composition recommendation follows Next’s documented server/client boundary; verify the specific registry in the production build. [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

## Imports and trust

`baseUrl` supplies the resolution base for MDX imports, re-exports, and `import.meta.url`. It is not an import allowlist. For this registry-driven design, recommend disallowing post-level imports/re-exports and documenting that authors use provided component names; ordinary expression support still means the file is executable. If imports are later enabled, define and test resolution deliberately rather than assuming Next path aliases apply inside evaluated code. [Runtime options](https://mdxjs.com/packages/mdx/#runoptions).

MDX’s own security guidance treats authors as code authors: untrusted MDX is unsafe. Repository review is the trust boundary, including before preview builds. Do not accept user uploads or arbitrary remote MDX. A component registry, an import restriction, or HTML sanitization does not sandbox JavaScript execution. Preserve sanitized `.md` handling as a separate path and never describe `.mdx` as sanitized Markdown. [MDX security](https://mdxjs.com/docs/getting-started/#security).

Suggested checks: existing `.md` output remains unchanged; an `.mdx` post renders a registry component; unknown components and invalid MDX fail clearly; import policy is enforced; interactive entries hydrate; production compilation stays server-side.

## Repository implementation

This site uses the documented `compile`/`run` split: `getPost` compiles local `.mdx` files and collects headings without executing the article, while the server-only `ArticleBody` runs the result with the explicit component registry. Markdown retains its separate sanitization pipeline. Shared tree processing keeps heading IDs, section links, code highlighting, and keyboard-scrollable code/tables consistent. Imports and exports in MDX posts are rejected as an authoring policy, not a security boundary.
