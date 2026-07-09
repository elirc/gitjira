# 0002 — Express over NestJS/Fastify

**Status:** accepted · **Sprint:** 01

## Context

The API needs an HTTP framework. NestJS offers structure and DI out of the box; Fastify
offers better raw throughput; Express offers ubiquity and minimal abstraction.

## Decision

Express, with the layering (routes → controllers → services) built by hand.

## Consequences

- ✅ Nothing is magic: every pattern in this codebase is visible, greppable code —
  which is the point of a teaching codebase.
- ✅ Largest ecosystem and hiring surface; skills transfer everywhere.
- ❌ We own our structure discipline — nothing enforces the layering but review.
- ❌ Leaves throughput on the table vs Fastify. Irrelevant at our scale; measured
  performance work is sprint 12's job, and HTTP framework overhead will not be the
  bottleneck (the database will be — it always is).
