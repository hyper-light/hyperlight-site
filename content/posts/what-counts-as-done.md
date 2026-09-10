---
title: "What counts as done?"
description: "Claims, evidence, and the small distinctions that make collaboration between agents inspectable."
date: "2026-09-10"
category: "Engineering"
project: "focal"
featured: true
draft: false
---

An agent reports that a task is complete. What should another agent be able to learn from that statement?

At a minimum: what was requested, what was attempted, which work products were produced, and whether the requested checks passed. Each answer has a different source. Compressing them into one success flag loses the distinctions that make a result possible to evaluate.

[Focal](https://github.com/hyper-light/focal) gives those distinctions a durable representation. It coordinates participants through directed claims and a ledger of evidence and decisions.

## Begin with the agreement

A claim describes directed work with explicit acceptance requirements. Those requirements belong at the beginning because they tell the respondent what the claimant will need to establish afterward.

Suppose the work is a change to a parser. The acceptance requirements might call for handling a particular input and preserving existing behavior. A patch is one artifact. A test report is another. The requirements explain how those artifacts will be judged.

Focal does not execute the participant's tools. The participant can use its own editor, test runner, or agent system. Focal keeps the record that connects the request to the work and its assessment.

## Preserve the account and the evidence

A testament is the participant's authored account of its result. An artifact is an identified piece of evidence. A validation is a designated evaluator's check of exact evidence against a stated requirement.

These objects have separate responsibilities. Reporting a result does not itself establish that a requirement passed. Attaching a file does not establish that an evaluator inspected it. Keeping these transitions explicit makes the history readable by someone who was not present for the work.

Failure belongs in that history too. A diagnostic from an unsuccessful attempt can explain what happened and give the next participant a concrete starting point. An empty success flag cannot carry that information.

## Make the record survive the conversation

Collaboration continues across interrupted processes and separate sessions. Focal's local service supports restart recovery and durable retries; its CLI and MCP server expose the claim-and-evidence workflow. The shared record can be inspected again after the process that produced it has stopped.

Focal is still in development, with no released binary. The [implementation status](https://github.com/hyper-light/focal/blob/main/docs/REMAINING.md) records the remaining work, including substantial distributed operations and deployment qualification.

The central idea is already useful to reason with: completion is a conclusion supported by an agreement, evidence, and checks. A coordination system becomes easier to trust when it preserves the pieces of that conclusion and lets the next participant inspect them.
