# OPCHUB Coding Packs — Vibecode Kit v5.0

> AI Quality Command Center — Coding Packs for OPCHUB (OPC Hub Community — opchub.community)
> Generated from Vibecode Kit v5.0 framework

## How to Use

### Power Triangle

```
CON NGUOI (Chu nha)          ← You: Approve, decide, relay
      |
  ----+----
  |        |
CLAUDE CHAT               CLAUDE CODE
(Chu thau)                (Tho thi cong)
Design, interview         Implement TIPs
Orchestrate              Self-test, report
```

### Workflow

1. **Read `00-PROJECT-CONTEXT.md`** — Understand project context
2. **Read `02-TASK-GRAPH.md`** — See task dependencies + sequence
3. **Pick a TIP** from `tips/` folder (follow dependency order)
4. **Paste TIP into Claude Code** — Builder implements it
5. **Builder returns Completion Report** — Relay to Architect
6. **Repeat** until all TIPs done

## File Structure

```
coding-packs/
├── README.md                         # This file
├── 00-PROJECT-CONTEXT.md             # Scan Report + Vision
├── 01-REQUIREMENTS-MATRIX.md         # Requirements traceability
├── 02-TASK-GRAPH.md                  # Task dependency graph
├── BUILDER-HANDOFF.md                # Builder instructions
├── product/                          # mission / roadmap / tech-stack
├── plans/  reports/
└── tips/                             # TIP files (populated by /vibecode:tip)
```

## Tech Stack (đề xuất trong SRS, chờ chốt ở RRI/Vision)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Ant Design 5 (+ Pro cho Admin), TanStack Query |
| Backend | NestJS + Prisma — modular monolith + workers |
| Realtime | Socket.IO + Redis adapter |
| Data | PostgreSQL (primary/replica), Redis, BullMQ, S3, OpenSearch |
| Identity | Keycloak OIDC (Google/Facebook/LinkedIn SSO), JWT 15' + refresh 7d |
| Integrations | Brevo SMTP, SePay/Casso/PayOS webhook (VCB), tra cứu MST, Google Maps |
| Infra | Docker, Kubernetes, GitLab CI/CD, Prometheus/Grafana/Loki, Sentry |

## Source Documents

- Đặc tả: `../OPCHUB Thiết kế giải pháp cộng đồng/deploy/dac-ta.html` (OPCHUB-SRS-2.0)
- Prototype tương tác: `../OPCHUB Thiết kế giải pháp cộng đồng/deploy/index.html`
- Scan Report: `00-PROJECT-CONTEXT.md`
- Requirements: `01-REQUIREMENTS-MATRIX.md`

---

*Generated: 2026-10-16 | Framework: Vibecode Kit v5.0 | Project: OPCHUB*
