---
title: "Announcing Hyperlight"
description: "An open-source, modular platform for agents."
date: "2026-09-10"
category: "Announcements"
featured: false
draft: false
---

We're introducing Hyperlight: an open-source project building a modular platform for agents and the people who work with them.

Our goal is infrastructure that works with your choice of agents and models, from a single laptop to datacenters across the world. We're designing the components to work independently and integrate with existing tools, so adopting one doesn't require replacing your entire stack.

## The first projects

[Vorpal](/projects/vorpal) is available today. It gives people and coding agents codebase search and a queryable graph of definitions and relationships through a CLI, MCP server, and language packages. [Introducing Vorpal](/blog/introducing-vorpal) covers the implementation, benchmarks, and setup.

[Hyperscale](/projects/hyperscale) is also available. It brings performance and integration testing together in asynchronous Python workflows, with multiple protocol clients and live execution statistics. The package is published on [PyPI](https://pypi.org/project/hyperscale/).

[Focal](/projects/focal) and [Slates](/projects/slates) are in development. Focal records the requirements, evidence, and acceptance decisions behind collaborative work. Slates gives agents isolated workspaces and merges their changes while identifying conflicts. Both have working implementations available from source; neither has a release yet.

## Moving Forward

[Hecate](/projects/hecate) is the architecture for a multi-agent coding harness that brings isolation, coordination, and validation together. It's currently in design. Our broader design work covers compute, storage, identity, secrets, artifact registries, caching, queues, and notifications.

Hyperlight is an independent project, not a company. We're committed to keeping its tools free and open source, and to making them useful beyond any one model or agent framework. We'll share releases, designs, and engineering updates as the work progresses.

Explore the [projects](/projects) and follow development on [GitHub](https://github.com/hyper-light).
