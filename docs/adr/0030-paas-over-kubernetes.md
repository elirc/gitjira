# 0030 — PaaS (Fly/Render), not Kubernetes

**Status:** accepted · **Sprint:** 15

## Context

We need to run web/api/worker + Postgres + Redis in production. The infra choice
ranges from a managed PaaS (Fly.io, Render, Railway) to self-managed Kubernetes.

## Decision

A PaaS. Push a container, declare a health check and a release command, set
secrets — the platform handles scheduling, TLS, rollouts, and scaling.

## Consequences

- ✅ The concepts we actually exercise — containers, health checks, release-phase
  migrations, gated deploys, env validation, horizontal instances — are the SAME
  concepts k8s uses. They transfer. We learn the ideas without the operational
  cliff.
- ✅ Far less to operate at 2am: no control plane, no ingress controllers, no
  cluster upgrades.
- ❌ Less control and some lock-in (the `fly.toml` is Fly-shaped). Acceptable at
  our scale; the app itself is portable (plain containers + Postgres + Redis).
- ❌ If we outgrow the PaaS, there's a migration to do — but by then the team
  knows the concepts, which was the point.

## For the curriculum

Kubernetes is a fine future sprint. Starting there would have spent the whole
sprint on YAML and cluster setup instead of the ideas (release phases, health
checks) that make a deploy safe. Learn the safety concepts on easy mode first.
