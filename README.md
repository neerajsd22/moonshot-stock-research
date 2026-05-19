# 🚀 Moonshot — Discover Your Next Big Win

> A premium, invite-only stock analysis platform that turns Yahoo Finance data into actionable insight: AI-powered deep analysis, Intelligence Hub signals, a portfolio tracker with live S&P 500 benchmarking, and a native-feeling mobile UI.

**Live production deployment:** <https://moonshot-stock-viz.emergent.host>

---

## 📑 Documentation Index

| Audience                                | Read this                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| _"I just want to run it"_               | This README → [Quick start](#-quick-start)                                                 |
| Product Manager / Founder               | [`docs/PRD.md`](./docs/PRD.md) — what & why, personas, requirements, roadmap               |
| Engineering Manager                     | [`docs/PRD.md`](./docs/PRD.md) + [`docs/SYSTEM_DESIGN.md`](./docs/SYSTEM_DESIGN.md)        |
| Principal / Staff Engineer              | [`docs/SYSTEM_DESIGN.md`](./docs/SYSTEM_DESIGN.md) + [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| New backend / frontend contributor      | This README → [Project layout](#-project-layout) → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |

---

## ✨ What Moonshot does

Moonshot is a single-page web app where invited users can:

- **Search** stocks by ticker _or_ full company name (e.g. "Salesforce" → CRM) across NYSE / NASDAQ / NSE.
- **Stack** up to 10 stocks side-by-side with live quotes, candlestick + sparkline charts, and historical data.
- **Pin** favourites (drag-and-drop reorder) so they survive across sessions.
- Run an **AI Deep Analysis** on any stock — 8-quarter financial health report with a risk scorecard and bull/bear narrative.
- Explore the **Intelligence Hub**: 5 Signals, Pre-Earnings Intelligence Report, Why Moving, Insider Alerts, Whale Watch, Similar Stocks.
- Track a **Portfolio** (CSV upload or paste statements from Robinhood / Fidelity / Schwab / Vanguard / E\*TRADE / Webull). Get live P&L plus a cost-weighted S&P 500 benchmark.
- Set **Price Alerts** (above / below) and see distance-to-trigger inline.
- Use **categories** (Finance, Tech, AI, FMCG, Nifty 50, Adani Group, …) plus user-created custom watchlists.

The full product spec, persona definitions, and feature catalogue are in [`docs/PRD.md`](./docs/PRD.md).

---

## 🧱 Tech Stack

| Layer        | Tech                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend     | React 19 · React Router 7 · Tailwind CSS · shadcn/ui (Radix) · recharts · @dnd-kit · axios · sonner                                   |
| Backend      | FastAPI 0.110 · Uvicorn · Motor (async MongoDB) · Pydantic 2 · yfinance · pandas · numpy                                              |
| Database     | MongoDB (single replica, app-side joins by ticker string)                                                                             |
| External API | Yahoo Finance (via `yfinance`) for quotes, history, fundamentals, news, insider trades, institutional holdings, similar tickers      |
| Infra        | Kubernetes pod (single replica) · supervisord (backend `:8001`, frontend `:3000`, mongod) · NGINX ingress (`/api/*` → BE)             |
| Tooling      | yarn · craco · ESLint · ruff · pytest                                                                                                 |

---

## 📁 Project Layout

```
/app
├── README.md                       ← you are here
├── docs/
│   ├── PRD.md                      ← Product Requirements
│   ├── ARCHITECTURE.md             ← Technical architecture (diagrams + module map)
│   └── SYSTEM_DESIGN.md            ← System design (scaling, ops, trade-offs)
│
├── backend/
│   ├── server.py                   ← FastAPI app — all routes, ~4 000 LoC
│   ├── portfolio_import.py         ← Broker-agnostic CSV / paste-text parser
│   ├── models/                     ← Pydantic schemas
│   ├── tests/                      ← pytest suite (yfinance NaN regression + portfolio + S&P)
│   ├── requirements.txt
│   └── .env                        ← MONGO_URL, DB_NAME (NEVER commit real values)
│
├── frontend/
│   ├── src/
│   │   ├── App.js                  ← Main SPA shell (router, header, search, stack, sidebar)
│   │   ├── CategoryPage.js         ← Category drill-down (mobile-card / desktop-table responsive)
│   │   ├── components/
│   │   │   ├── stock/              ← StockDetailsBlock (inline accordion: financials / AI / Intel / news)
│   │   │   ├── portfolio/          ← PortfolioPage · PortfolioButton · ImportDialog · …
│   │   │   ├── ui/                 ← shadcn/ui primitives
│   │   │   ├── IntelligenceHub.js  ← 5 Signals, PEIR, Why Moving, Insider, Whale, Similar
│   │   │   ├── AdvancedChart.js    ← recharts candlestick + indicators
│   │   │   ├── MobileSearchSheet.js← Bottom-sheet search + FAB (mobile only)
│   │   │   ├── PriceAlertManager.js
│   │   │   ├── WatchlistManager.js
│   │   │   └── AnimatedBackground.js · AboutUs.js · AccessGate.js · AdminPage.js · …
│   │   ├── hooks/usePullToRefresh.js
│   │   └── lib/utils.js
│   ├── package.json
│   └── .env                        ← REACT_APP_BACKEND_URL only
│
└── memory/                         ← Agent / dev working notes (test_credentials, etc.)
```

---

## ⚡ Quick start

> Both services and MongoDB are pre-wired via `supervisord` in this environment. The commands below are for a local clone or a fresh contributor's machine.

### Prerequisites
- Node 18+ · yarn 1.22+
- Python 3.11+
- MongoDB 6+ (or a connection string)

### 1. Install
```bash
# backend
cd backend
pip install -r requirements.txt

# frontend
cd ../frontend
yarn install
```

### 2. Configure environment

Create `backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=moonshot
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Run
```bash
# backend (terminal 1)
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# frontend (terminal 2)
cd frontend
yarn start
```

Open <http://localhost:3000>. You'll hit the access-code gate — generate one from the admin panel:

```bash
# log into the admin panel at /admin to mint codes,
# or seed one directly via Mongo:
mongosh moonshot --eval 'db.access_codes.insertOne({code:"DEVCODE1", is_active:true, created_at:new Date()})'
```

### 4. Test
```bash
# backend
cd backend && pytest -q

# frontend lint
cd frontend && yarn eslint src
```

---

## 🛡️ Production / deployment notes

- The app is deployed on the **Emergent platform**. Preview and production share the same image; only the ingress hostname and `REACT_APP_BACKEND_URL` differ.
- All credentials and URLs come from `.env` files. **Never** hard-code or commit them.
- `_id` is always excluded from MongoDB responses (BSON `ObjectId` is not JSON-serializable). Every numeric coming from `yfinance` is run through `safe_float / safe_int / safe_pct` to scrub `NaN` / `Inf` before serialization — see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#defensive-serialization).
- Authentication is **access-code based** (invite-only) — not OAuth. Admin is gated by a single hashed password.

---

## 🤝 Contributing

1. Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/SYSTEM_DESIGN.md`](./docs/SYSTEM_DESIGN.md).
2. Pick an item from the **Backlog** in [`docs/PRD.md`](./docs/PRD.md).
3. Branch from `main`, keep PRs small (< 400 LoC where possible).
4. Add `data-testid` attributes on **every** interactive element you create.
5. Add a pytest under `backend/tests/` for any new endpoint. Run `pytest -q` before pushing.
6. For UI changes, take screenshots at **390 × 800** (mobile) and **1280 × 800** (desktop) — Moonshot is a mobile-first product.

---

## 📜 License & ownership

Proprietary — © Moonshot. Invite-only product, source not licensed for redistribution.

---

_Last updated: Feb 2026_
