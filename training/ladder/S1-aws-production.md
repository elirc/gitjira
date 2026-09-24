# S1: GitJira on AWS (a design scenario)

**Context.** An enterprise customer requires AWS in `us-east-1` or `eu-west-1`, a VPC-isolated database, and audit-ready deploys. Today's delivery path (`.github/workflows/deploy.yml`) is two Fly jobs:

- staging on push to `main`, prod on `v*` tags behind the `production` GitHub Environment;
- both run `flyctl deploy` of **only the API** (`fly.toml` builds `apps/api/Dockerfile`);
- `release_command` runs `prisma migrate deploy` before rollout;
- nothing waits for `ci.yml`, and `setup-flyctl@master` is unpinned.

The worker and web images build (`apps/worker/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.prod.yml`) but are deployed nowhere. Attachments are written to the container's disk (`attachment.service.js:7`). The login rate limiter is in-process (`rate-limit.js:13`). The API has no SIGTERM handling (`server.js`).

**Scenario.** Design the AWS production setup and the new `deploy.yml`, and write the rollback runbook. You're the senior on a team of four. Budget is about $1.5k/month to start. Target: 99.9 % monthly availability for board load and saves (M2's SLOs).

**Operating constraints.**

- Zero-downtime deploys, including deploys that carry migrations. A failed deploy rolls back automatically, and a human can roll back in under 5 minutes.
- No long-lived AWS keys in GitHub. Every prod deploy is traceable to a commit, a CI run and an approver.
- WebSockets must work through the load balancer, across more than one API task (M4).
- Secrets come from a managed store. `lib/env.js` must still fail fast at boot.
- Postgres: point-in-time recovery with a tested restore (INC-003 is why). Redis: BullMQ-safe settings.

**Deliverables (design only; write them in `training/ladder/notes/S1-aws.md`).**

1. The architecture on one page: VPC and subnets, ALB, ECS Fargate services (api, worker), RDS Postgres, ElastiCache Redis, S3 plus CloudFront for the SPA, S3 for attachments, Secrets Manager or SSM, CloudWatch or AMP. Explain each choice against the simpler alternative (for example, App Runner or Elastic Beanstalk, and RDS Proxy yes or no).
2. A `deploy.yml` rewrite, as YAML:
   - `needs:` on CI and GitHub OIDC → IAM role;
   - build once and push immutable image tags to ECR (api, worker, web);
   - run migrations as a one-off ECS task (`run-task`, wait, check the exit code) **before** updating the services;
   - `aws ecs update-service` with the deployment circuit breaker on and rollback enabled, and wait for stability;
   - sync the SPA to S3 and invalidate CloudFront;
   - a post-deploy smoke test that gates promotion.
3. Say how the ALB handles Socket.IO: WebSocket upgrade, idle timeout versus the ping interval, stickiness if you keep polling, and the connection-draining deregistration delay versus the API's shutdown sequence (which you must add).
4. The rollback runbook: code-only rollback, rollback after an expand-only migration, and the case where rollback is **not** safe (a contract migration). What makes the difference?
5. The failure-mode table: the AZ goes down, RDS fails over (about 60–120 s), ElastiCache fails over, a deploy dies mid-migration, a bad image passes health checks but 500s on real routes (J1), and the ECR pull is throttled.
6. The cost estimate at the start, and what grows first.

**Explain before touching.**

1. What does Fly's `release_command` give you that ECS doesn't have built in? How will you reproduce it, including "if the migration fails, nothing rolls"?
2. Which parts of today's app break on the first day with 2+ Fargate tasks, if nothing changes? (List from the context above, R2, R3 and R12.)
3. OIDC: what claims do you pin the IAM role trust policy to (repo, ref, environment), and why is `ref:refs/tags/v*` alone not enough?
4. Where do the worker's health and readiness come from on ECS without an HTTP port?

Answer: `training/_answers/ladder-S1.md`
