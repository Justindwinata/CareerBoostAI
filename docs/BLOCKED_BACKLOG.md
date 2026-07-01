# Blocked Backlog

This backlog tracks approved engineering work that is intentionally paused because validation depends on an unavailable external capability.

Blocked work must not be implemented speculatively. Each item should resume only when its blocking condition is removed and validation can be completed.

## Active Blockers

| ID | Contract | Reason | Resume Condition |
| --- | --- | --- | --- |
| BLK-0001 | EC-0105 Docker Compose Development Stack | Docker Compose is unavailable in the current environment | `docker compose version` succeeds |
| BLK-0002 | EC-0106 Dockerfiles | Docker build validation is unavailable in the current environment | `docker --version` succeeds and image builds can run |
| BLK-0003 | EC-0107 Docker Development Workflow | Docker-backed development commands cannot be validated | Compose stack can start and health checks can be verified |

## Current Runtime Evidence

The following commands were checked during Sprint 1 and were unavailable:

```bash
docker --version
docker compose version
podman --version
colima version
```

## Handling Rule

Docker work remains blocked until a compatible runtime is available. Do not create Dockerfiles, Compose files, or Docker workflow documentation that cannot be validated locally or in CI.
