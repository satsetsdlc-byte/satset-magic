# Satset Orchestrator: Enterprise Multi-Agent Software Engineering Platform

An enterprise-grade platform for orchestrating autonomous multi-agent software engineering, built with **Java 21, Spring Boot 3.3, LangChain4j, and Spring AI**, featuring a **Next.js 14 Mobile Command Dashboard** and a structured task ecosystem for Google Antigravity.

---

## 📖 Complete User Guide (Required Reading)

The operational manual for human-in-the-loop workflows, from initial setup through production release, is available here:

👉 **[USER_GUIDE_OPERATIONAL_MANUAL.md](file:///c:/project/satset-magic/USER_GUIDE_OPERATIONAL_MANUAL.md)**

---

## 🚀 Quick Start

### 1. Run with Docker Compose (Full Stack)

```bash
docker compose up -d --build
```

The stack consists of the following containers:

- **Dashboard UI:** `http://localhost:3000` (Next.js, mobile-first interface)
- **Orchestrator Backend:** `http://localhost:8080` (Spring Boot API and Server-Sent Events (SSE) stream)
- **PostgreSQL Database:** `localhost:5432` (State checkpointing and audit logs)
- **Redis Cache:** `localhost:6379` (Real-time event broker)

### 2. Run Locally (Development Mode)

**Backend:**
```bash
cd orchestrator-service
java -jar target/orchestrator-service-1.0.0-SNAPSHOT.jar
```

**Frontend Dashboard:**
```bash
cd dashboard-ui
npm run start
```

---

## 📂 Project Directory Structure

```text
satset-magic/
├── .agent/skills/                         # 10 Antigravity SDLC domain skills
│   ├── spec-writer/SKILL.md               # Domain 1: PRDs and Gherkin user stories
│   ├── ui-ux-pro-max/SKILL.md             # Domain 2: Design tokens and UI quality standards
│   ├── spring-boot-enterprise/SKILL.md    # Domain 3: Clean architecture for Java
│   ├── tdd-orchestrator/SKILL.md          # Domain 4: Test-first development and >=70% coverage
│   ├── system-design-architect/SKILL.md   # Domain 5: C4 models and Architecture Decision Records (ADRs)
│   ├── appsec-auditor/SKILL.md            # Domain 6: Static Application Security Testing (SAST) and secret auditing
│   ├── senior-code-reviewer/SKILL.md      # Domain 7: Lead code review and deadlock prevention with 3 retries
│   ├── docker-compose-pro/SKILL.md        # Domain 8: Container manifests
│   ├── dast-pentest-scout/SKILL.md        # Domain 9: Dynamic Application Security Testing (DAST) with ZAP and k6 load testing
│   └── otel-instrumentor/SKILL.md         # Domain 10: OpenTelemetry metrics and distributed tracing
│
├── .antigravity/                          # MCP server configuration
│   ├── mcp-config.json                    # Filesystem, GitHub, PostgreSQL, and Playwright
│   └── agent-runtime-rules.json
│
├── docker-compose.yml                     # Multi-service container orchestration
├── USER_GUIDE_OPERATIONAL_MANUAL.md       # Step-by-step operational guide
├── docs/                                  # Technical documentation and knowledge base
├── tasks/                                 # Sequential SDLC pipeline tasks
├── orchestrator-service/                  # Java 21 Spring Boot backend
├── dashboard-ui/                          # Next.js 14 mobile-first web dashboard
└── workspace/                             # Sandbox for agent-generated outputs
```
