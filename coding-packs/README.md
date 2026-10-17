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

## Tech Stack (đã chốt — xem Decisions Log + Vision)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Ant Design 6, TanStack Query 5 (phiên bản: `standards/global/tooling.md`) |
| Backend | NestJS 11 + Prisma 7 — `apps/server` một app, 3 entrypoint (api / socket / worker) |
| Realtime | Socket.IO + Redis adapter |
| Data | PostgreSQL 16 + PgBouncer, Redis 7, BullMQ, MinIO |
| Identity | Tự viết trong NestJS (passport SSO, JWT 15' + refresh 7d, argon2, TOTP admin) |
| Integrations | Brevo SMTP, SePay/Casso/PayOS webhook (VCB), tra cứu MST, Google Maps |
| Infra | 1 VPS cài native: Nginx, systemd, PgBouncer, MinIO; Cloudflare; Sentry |

## Trạng thái & thứ tự thực thi

| Giai đoạn | Trạng thái | Báo cáo |
|---|---|---|
| Scan, RRI, Vision, Standards | Xong (16/10/2026) | `00-PROJECT-CONTEXT.md`, `01-REQUIREMENTS-MATRIX.md`, `standards/` |
| FE Portal + Admin trên MSW (G0 → G6) | Xong — 205 dòng parity, 115 e2e | `reports/G0-G1-completion.md` → `reports/G6-completion.md` |
| Blueprint backend | Xong (17/10/2026) | `BUILDER-HANDOFF.md`, `02-TASK-GRAPH.md`, `plans/api-contract.md`, `plans/data-model.md` |
| Backend B1 → B6 (39 TIP) | Chưa bắt đầu | `reports/B<n>-completion.md` |

Thứ tự pha: **B1** nền tảng (server, DB, outbox, auth, guard) → **B2** thành viên & phí → **B3** cộng đồng & chat realtime →
**B4** sự kiện / dự án / nhà đầu tư → **B5** quản trị, mail, marketing, export (+ bot, dịch vụ sau flag) →
**B6** chuyển FE sang server thật, e2e + parity trên server, k6, VPS, staging. Chi tiết và phụ thuộc: `02-TASK-GRAPH.md`.

## Source Documents

- Đặc tả: `../docs/spec/dac-ta.html` (OPCHUB-SRS-2.0)
- Prototype tương tác: `../docs/spec/index.html`
- Scan Report: `00-PROJECT-CONTEXT.md`
- Requirements: `01-REQUIREMENTS-MATRIX.md` (Decisions D-01 → D-48)
- Blueprint: `BUILDER-HANDOFF.md`, `plans/api-contract.md` (193 endpoint), `plans/data-model.md`
- UI parity: `reports/ui-parity/` (screens, deviations, questions, results)

---

*Generated: 2026-10-16 | Framework: Vibecode Kit v5.0 | Project: OPCHUB*
