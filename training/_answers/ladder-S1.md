# S1 reference: GitJira on AWS

## What breaks on the first day with 2+ tasks, if nothing changes

- Attachments on task-local disk (R2): lost, and a download of a missing file **crashes** the task.
- Socket.IO with no adapter or stickiness (R3/M4).
- An in-memory login limiter (R12): the limit multiplies per task.
- No SIGTERM handling (R9): ECS sends SIGTERM and then SIGKILL after `stopTimeout` (30 s by default), so in-flight requests and sockets drop on every deploy.
- The worker isn't deployed (R1).
- Migrations: today Fly's `release_command` runs them. ECS has no equivalent, so you must build one.

## Architecture (reference)

- **Network:** a VPC across 2 AZs. Public subnets hold the ALB. Private subnets hold the ECS tasks, RDS and ElastiCache. VPC endpoints for ECR, S3 and Secrets Manager (or a NAT gateway, which costs about $35/month plus traffic).
- **ALB:** listener 443 → target group `api` (path `/api/*` and `/socket.io/*`). The health check is `/api/health/ready` (J1). Set the idle timeout to 120 s, which must exceed the Socket.IO ping interval plus timeout (25 s + 20 s by default). The deregistration delay is 30 s, and it must be **longer** than the API's drain period. If long-polling stays enabled, turn on target-group stickiness; otherwise the client goes WebSocket-only (M4).
- **ECS Fargate:**
  - `api` service: 2+ tasks, 0.5 vCPU / 1 GB, `deploymentConfiguration.deploymentCircuitBreaker { enable: true, rollback: true }`, minimumHealthyPercent 100, maximumPercent 200.
  - `worker` service: 1–N tasks, autoscaled on the lag metric (J3/S3). Its health comes from a container `healthCheck` running a command, because it has no port. Better: expose an internal `/metrics` and treat "lag high and completed rate 0" as an alarm, not a restart.
- **RDS Postgres 16:** Multi-AZ, automated backups with PITR (7–35 days), **plus a quarterly restore drill** (INC-003). Parameter group settings: `lock_timeout` defaults for the migration role, and `log_min_duration_statement`. RDS Proxy is optional at this scale. Prisma's pool per task times the task count must stay under `max_connections`. Add Proxy when autoscaling makes that math unsafe.
- **ElastiCache Redis 7:** a replication group with Multi-AZ, `maxmemory-policy noeviction` (a BullMQ requirement), and TLS plus AUTH. Remember that the app code currently reads only `REDIS_HOST`/`REDIS_PORT` (`queue.js:7-10`, `cache.js`), so TLS and a password need code changes (use `REDIS_URL`).
- **S3:** `gitjira-attachments` (private, SSE, served through presigned GETs or a streaming proxy), `gitjira-web` (the SPA) behind CloudFront. The SPA fallback is a CloudFront error response 403/404 → `/index.html`, the equivalent of `nginx.conf`'s `try_files`.
- **Secrets:** `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` in Secrets Manager, injected by the task definition `secrets:`. `lib/env.js` still validates at boot. A missing secret stops the task, and the circuit breaker rolls back.
- **Observability:** AMP scraping `/metrics` through the ADOT sidecar (or CloudWatch agent), ALB metrics (an independent 5xx signal, M2), and logs to CloudWatch via `awslogs` (pino JSON already fits).
- **Cost (rough, us-east-1):** Fargate 3 × 0.5 vCPU ≈ $55; RDS db.t4g.medium Multi-AZ ≈ $120 plus storage; ElastiCache t4g.small 2 nodes ≈ $50; ALB ≈ $25; NAT or endpoints ≈ $40–70; CloudFront, S3 and logs ≈ $20–50. That's about $350–450/month, well inside $1.5k. RDS and the log volume grow first.

## deploy.yml (shape)

```yaml
on: { push: { tags: ['v*'] } }
permissions: { id-token: write, contents: read }
jobs:
  ci: { uses: ./.github/workflows/ci.yml } # make ci.yml reusable (on: workflow_call)
  build:
    needs: ci
    steps:
      - uses: aws-actions/configure-aws-credentials@<sha> # pinned
        with: { role-to-assume: arn:aws:iam::<acct>:role/gitjira-deploy, aws-region: us-east-1 }
      - uses: aws-actions/amazon-ecr-login@<sha>
      - run: docker build -f apps/api/Dockerfile -t $ECR/api:${{ github.sha }} . && docker push … # same for worker; web → build artifact
  deploy:
    needs: build
    environment: production # manual approval
    steps:
      - run: aws ecs run-task --task-definition gitjira-migrate:${REV} --overrides '{"containerOverrides":[{"name":"api","command":["npm","run","db:deploy","-w","@gitjira/api"]}]}' …
      - run: aws ecs wait tasks-stopped …; check exitCode == 0 or fail # "if migration fails, nothing rolls"
      - run: aws ecs update-service --cluster gj --service api --task-definition gitjira-api:${REV}
      - run: aws ecs update-service --cluster gj --service worker --task-definition gitjira-worker:${REV}
      - run: aws ecs wait services-stable --cluster gj --services api worker
      - run: aws s3 sync apps/web/dist s3://gitjira-web --delete && aws cloudfront create-invalidation --paths '/index.html'
      - run: ./scripts/smoke.sh https://app.gitjira.example # login, list, move, socket event; fail → rollback job
```

**OIDC trust policy:** pin `token.actions.githubusercontent.com:sub` to `repo:elirc/gitjira:environment:production`, not just `ref:refs/tags/v*`. Anyone who can push a tag could otherwise deploy. The environment claim ties the deploy to the approval gate. Staging gets its own role and its own account or cluster.

**Assets:** upload hashed JS/CSS with long cache headers **before** switching `index.html`, and keep old hashed assets for a week, so open tabs don't 404 on lazy chunks (`App.jsx` route splitting) during and after a deploy.

## API shutdown (required change)

On SIGTERM: fail readiness right away, so the ALB stops sending new requests during the deregistration delay. Keep serving in-flight requests. `io.close()` after sending clients a reconnect hint (they'll land on other tasks; M4 makes that safe). Then `httpServer.close()`, `prisma.$disconnect()`, exit. The total must stay under `stopTimeout`.

## Rollback runbook

- **Code-only:** `aws ecs update-service --task-definition gitjira-api:<prev>` (or the circuit breaker does it automatically). About 2–4 min, and web `index.html` is restored from the previous build.
- **After an expand-only migration:** code rollback is safe, because N−1 works with the expanded schema (ADR 0031, S2). Leave the schema.
- **After a contract migration:** code rollback is **unsafe**. The old code needs what you dropped. This is why contract releases ship alone, days after the switch, with a PITR restore point noted. The only rollback is forward, or a restore (INC-003).

## Failure modes

AZ loss: tasks and Multi-AZ RDS/ElastiCache fail over, with about 1–2 min of elevated errors, so budget for it in the SLO. RDS failover: Prisma connections error and requests 5xx for 60–120 s. Readiness then fails on **every** task at once, and when all targets are unhealthy the ALB "fails open" and routes to all of them anyway. Know this behavior: readiness protects you from one bad task, not from a shared dependency outage. Make the API retry connections and return fast 503s, not hang. The migration task dying mid-run: Prisma records a failed migration, and the next deploy refuses to proceed until it's resolved (`prisma migrate resolve`); never hand-edit `_prisma_migrations`. A bad image that is healthy but 500s: only the smoke test or the SLO burn alert catches it, which is why the smoke test gates. ECR throttling: rare. Use pull-through cache or pre-warm.
