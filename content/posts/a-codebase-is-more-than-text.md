---
title: "A codebase is more than text."
description: "Why code search becomes more useful when it can follow the relationships behind the words."
date: "2026-09-10"
category: "Engineering"
project: "vorpal"
featured: true
draft: false
---

A function name is a useful starting point. It is rarely the whole question.

When we ask where a behavior lives, we usually want to follow something: a call from an entry point, an implementation behind an interface, a type passed across a boundary. The relevant text might be spread across several files. The relationship is what makes those fragments meaningful.

[Vorpal](https://github.com/hyper-light/vorpal) starts from that observation. It parses source code into definitions and references, then links them into a knowledge graph. Calls, imports, implementations, and containment become things we can query directly.

## Follow the question

Consider an unfamiliar function called `handle_request`. Finding its definition tells us where to begin. Finding its callers reveals which paths reach it. Following its callees helps expose what it depends on. Looking at references and types supplies a different view of the same code.

These questions deserve different operations. Vorpal exposes graph queries alongside structural patterns and hybrid search, so exploration can move between an exact relationship and a broader description of intent.

```sh
vorpal index .
vorpal graph callers handle_request
vorpal search "parse http request"
```

Structural search adds another useful distinction. A pattern can describe the shape of an expression, including placeholders for its arguments. That lets a query follow syntax even when names and formatting vary.

## Make uncertainty visible

Extracting structure does not make every relationship certain. A language may have dynamic behavior. A reference may be ambiguous. A grammar may expose some kinds of relationships more fully than others.

Vorpal's documented approach is to label resolution confidence and report what could not be resolved. Its [language matrix](https://github.com/hyper-light/vorpal/blob/main/docs/LANGUAGES.md) describes what each grammar extracts. That boundary matters: a useful result should help the reader judge how much it establishes.

The same principle applies to search. Vorpal combines name matching, semantic similarity, and graph signals, with provenance for the channels behind a result. A ranked hit is a lead to inspect. Exact source remains part of the workflow.

## Keep the loop close

Code changes while we investigate it. Incremental indexing and the MCP server make the graph useful inside that working loop. A person can use the CLI; an agent can request relationships and source spans through MCP.

The aim is a shorter path from a question to the evidence needed to answer it. Structure gives us a map. Source lets us check the terrain.

The [getting-started guide](https://github.com/hyper-light/vorpal/blob/main/docs/getting-started.md) covers installation, indexing, and the query commands. Start with a repository you know well: the most revealing test is whether the tool makes its familiar relationships easier to see.
