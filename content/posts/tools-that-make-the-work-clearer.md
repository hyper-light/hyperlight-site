---
title: "Tools that make the work clearer."
description: "Infrastructure for agents and humans, any scale, any place. What that means for the tools we're building."
date: "2026-09-10"
category: "Notes"
featured: false
draft: false
---

infrastructure for agents and humans, any scale, any place

That's the direction for Hyperlight. We want tools that are useful when you're working alone, and that can grow with the work as more people, agents, and machines join in. Our projects are at different stages of that journey.

A repository has relationships that are difficult to see from a single file. Several agents can produce edits against different views of the same code. A finished task can arrive with an explanation that leaves its evidence scattered elsewhere. A test can exercise one endpoint while missing the interaction that matters.

Each problem gives a tool a job to do.

## Give each question a home

[Vorpal](https://github.com/hyper-light/vorpal) asks how to make the structure of a codebase available to both people and agents. It combines a knowledge graph, structural patterns, and hybrid search. The output gives an investigation something to follow and source to inspect.

[Focal](https://github.com/hyper-light/focal) asks how collaborators can establish what was requested and what was verified. Its claims, testaments, artifacts, and validations preserve the pieces of an agreement and its result.

[Slates](https://github.com/hyper-light/slates) addresses the working surface itself. Separate volumes let agents make changes independently. Recorded edits let the merge engine accept compatible work or identify the byte ranges that need a decision. Its current implementation includes macOS mounts and local merging; fleet integration and other platform mounts remain under development.

[Hyperscale](https://github.com/hyper-light/hyperscale) turns application interactions into asynchronous Python test workflows. Different clients can participate in the same scenario, while reporting and live statistics make execution observable.

You can approach these projects separately. Start with the one that solves the problem in front of you. Each repository explains what works today and what still needs work.

## Leave room for the unfinished

Some projects begin with a design question. [Hecate](https://github.com/hyper-light/hecate) is an architecture for a multi-agent coding harness, with specifications for isolation, coordination, and validation. Its repository is documentation, and the implementation has not started.

[Veil](https://github.com/hyper-light/veil) names a direction for just-in-time agent secrets. [Mantle](https://github.com/hyper-light/mantle) is earlier still, with its scope yet to be documented. Showing those stages clearly is part of making this collection useful.

This journal is a place to write through the decisions behind the tools: what a boundary protects, what a result proves, and where an abstraction earns its place. A polished interface should make that thinking easier to reach.

The visual language follows the same preference. Space, type, and restrained motion give the work room. A little prismatic color adds a signature. The substance lives in the projects and in the decisions we can explain.
