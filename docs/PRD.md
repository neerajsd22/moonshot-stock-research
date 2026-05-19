# Moonshot — Product Requirements Document (PRD)

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Product**      | Moonshot — _Discover Your Next Big Win_           |
| **Status**       | Live (invite-only)                                |
| **Owner**        | Moonshot core team                                |
| **Last updated** | Feb 2026                                          |
| **Companions**   | [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) |

---

## 1. Vision & elevator pitch

**Vision.** Make sophisticated stock analysis feel as easy as scrolling Instagram — on any device.

**Elevator pitch.** Moonshot is a premium, invite-only web app that lets retail investors search any stock, stack up to 10 at once, and instantly see an AI-driven 8-quarter health report, an Intelligence Hub of behavioural signals (insider trades, whale moves, pre-earnings drift), and a portfolio tracker that benchmarks them against the S&P 500 in real time — all with a native-feeling mobile UX.

**Tagline.** _Discover Your Next Big Win._

---

## 2. Problem statement

Retail investors today juggle 4–5 disconnected tools:

| Pain                                              | Why it matters                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Quote sites (Yahoo, Google Finance) are too basic | No risk scoring, no behavioural signals, no portfolio P&L              |
| Pro platforms (Bloomberg, Koyfin) are too dense   | Steep learning curve; nothing native-feeling on mobile                 |
| Spreadsheet portfolios go stale instantly         | Manual price updates; no benchmark comparison                          |
| News + filings are buried                         | Earnings calendars, insider trades, similar-stock discovery are hidden |
| Mobile UX is an afterthought                      | Most platforms shoehorn desktop tables into a phone                    |

**Moonshot's wedge:** _one_ surface, _one_ stack, _one_ tap to go from "I heard about NVDA" to "I see the 8-quarter risk, the whale watch, my position size, and how it compares to the S&P".

---

## 3. Target users & personas

| Persona               | Profile                                                          | Top jobs-to-be-done                                                                  |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Avid Retail (P1)**  | 25-45y, owns 5-30 positions, checks markets daily                | Stack candidates · check earnings & insider moves · track P&L vs S&P 500             |
| **Power User (P2)**   | Active trader, runs dense screens, uses multiple monitors        | Dense view · candlestick + indicators · custom watchlists · CSV export               |
| **Casual (P3)**       | Owns 2-5 positions, checks weekly                                | Pin favourites · get price alerts · readable charts on phone                         |
| **Admin / Operator**  | Moonshot team                                                    | Mint / revoke access codes · monitor usage                                           |

---

## 4. Goals & non-goals

### Goals
- **G1.** Make the time-to-first-insight (search → quote + AI summary) under **3 seconds** on a warm cache.
- **G2.** Deliver a mobile experience indistinguishable from a native app (FAB, bottom sheets, pull-to-refresh, animations).
- **G3.** Support **invite-only** distribution via access codes — no public sign-ups in v1.
- **G4.** Surface differentiating insights (Intelligence Hub, AI Deep Analysis) that **no free competitor offers**.
- **G5.** Let users import portfolios from **any major US broker** without manual column mapping.

### Non-goals (v1)
- Real-money trading / brokerage integration.
- Real-time tick streaming (we poll on demand).
- Options / futures / crypto coverage.
- Multi-user collaboration (shared watchlists, comments).
- Mobile native apps (iOS/Android) — we ship mobile-web only.

---

## 5. Core feature catalogue

### 5.1 Stock discovery & display
| Feature                         | Description                                                                                       | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Fuzzy search                    | Ticker OR full company name (e.g. _"Salesforce"_ → CRM). Filters US / India / All exchanges.       | ✅ Done |
| Stacked stocks                  | Up to **10** stocks open simultaneously; persisted to `localStorage`; auto-scroll to newest.       | ✅ Done |
| Pinned stocks                   | Drag-and-drop reorder (persisted via `/pinned-stocks/reorder`).                                    | ✅ Done |
| Categories ("Explore")          | Predefined: Finance, Technology, AI, Semiconductors, FMCG, Materials, Healthcare, Energy, Nifty 50, Nifty IT, Nifty Bank, Nifty Pharma, Adani Group, Tata Group, etc. | ✅ Done |
| Custom categories               | User-defined tickers + emoji label.                                                                | ✅ Done |
| Watchlists                      | Sidebar manager with CRUD + add/remove tickers.                                                    | ✅ Done |
| Compact / Spacious view         | Toggle between sparkline-only "Condense" and full-card "Spacious".                                 | ✅ Done |

### 5.2 Per-stock detail (inline accordion under each card)
| Feature                         | Description                                                                                       | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Advanced chart                  | Candlestick + line · 1M / 6M / 1Y / 5Y · technical indicators (RSI, MACD).                         | ✅ Done |
| Key stats                       | Market cap · 52W H/L · P/E · dividend yield · ROE · debt/equity (all `safe_float` scrubbed).        | ✅ Done |
| News                            | Latest articles via `yfinance.news`.                                                               | ✅ Done |
| Earnings snapshot               | Last reported EPS · revenue · surprise %.                                                          | ✅ Done |
| **AI Deep Analysis**            | 8-quarter health report · revenue/EPS trajectories · risk scorecard · bull/bear verdicts.          | ✅ Done |
| **Intelligence Hub**            | 6 modules — see below.                                                                             | ✅ Done |

### 5.3 Intelligence Hub modules
| Module                          | Insight                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| 5 Signals                       | Composite scoring across price, volume, fundamentals, sentiment, sector momentum.                  |
| Pre-Earnings Intelligence       | Drift, IV, analyst-revision flow before next earnings date.                                        |
| Why Moving                      | Headline + sector-driver attribution for today's move.                                             |
| Insider Alerts                  | Form 4 buys / sells over last 90 days.                                                             |
| Whale Watch                     | Institutional holdings changes (13F deltas).                                                       |
| Similar Stocks                  | Sector + market-cap matched peer suggestions.                                                      |

### 5.4 Portfolio Tracker (`/portfolio`)
| Feature                         | Description                                                                                       | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| CSV upload                      | Drag/drop a brokerage export.                                                                      | ✅ Done |
| Paste-text import               | Paste any tab/comma/space-delimited blob; auto-detects broker (Robinhood, Fidelity, Schwab, Vanguard, E\*TRADE, Webull). | ✅ Done |
| Per-position card               | Avg cost → current · market value · today $/% · unrealized P&L (gold highlight on positive).        | ✅ Done |
| Summary card                    | Total value · today P&L · all-time P&L · best/worst chips · rainbow allocation bar.                | ✅ Done |
| **S&P 500 benchmark**           | Cost-weighted return across each position's holding period; "+X% vs +Y% S&P 500 [beating / trailing]" pill. | ✅ Done |
| Header pill pulse dot           | Live green/red pulse on the global header reflecting today's portfolio direction (polled 60s).      | ✅ Done |
| Inline edit / delete            | No modal — direct on the position card.                                                            | ✅ Done |

### 5.5 Alerts
| Feature                         | Description                                                                                       | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Price Alerts                    | Above / below + target price. Bell icon on stock card opens a quick-set popover.                   | ✅ Done |
| Distance tracking               | Sidebar shows "$3.42 away" inline.                                                                 | ✅ Done |
| Alert count badge               | Red badge on Menu button when ≥ 1 active.                                                          | ✅ Done |
| Generic alert manager           | Sidebar search dropdown to set alerts on any stock (not just the active one).                      | ✅ Done |

### 5.6 UX / aesthetics
| Feature                         | Description                                                                                       | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Dark theme + gold accents       | Premium palette (`#d946ef` magenta + gold gradients).                                              | ✅ Done |
| 6 animated backgrounds          | Particle Network · Aurora Borealis · Matrix Rain · Bokeh Blur · Noise Gradient · Mesh Gradient (+ None). | ✅ Done |
| Mobile bottom-sheet search      | Bottom-left magenta FAB → slide-up search sheet with live results.                                 | ✅ Done |
| Pull-to-refresh                 | Native touch gesture refreshes stock prices.                                                       | ✅ Done |
| Landing page                    | Vertical-spotlight scroll: Hero · AI Deep Analysis showcase · Intelligence Hub showcase · features · access-code embed. | ✅ Done |
| About Us modal                  | Bottom-right FAB → philosophy + disclaimer.                                                        | ✅ Done |
| Pixel-perfect responsive        | 3 viewports — mobile (375 +) · tablet · desktop — every component tested at 390 × 800 and 1280 × 800. | ✅ Done |

### 5.7 Auth & admin
| Feature                         | Description                                                                                       | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Access-code gate                | Invite-only — single-input redemption screen.                                                      | ✅ Done |
| Admin panel (`/admin`)          | Mint / expire / reactivate / delete access codes.                                                  | ✅ Done |

---

## 6. Success metrics (north-star & guardrails)

| Metric                              | Target           | Why it matters                                          |
| ----------------------------------- | ---------------- | ------------------------------------------------------- |
| Time-to-first-insight (TTFI)        | ≤ 3 s p50        | Defines whether the product feels "instant"             |
| Weekly Active Users / invited       | ≥ 60 %           | Retention proxy for an invite-only product              |
| Stocks stacked per session (p50)    | ≥ 3              | Measures whether multi-stack is a real workflow         |
| % sessions touching Intelligence Hub | ≥ 35 %          | Validates our differentiated insight modules             |
| Portfolio import success rate       | ≥ 90 %           | Broker parser quality                                    |
| Mobile share of sessions            | ≥ 50 %           | Confirms mobile-first bet                                |
| Backend p95 latency (cached)        | ≤ 300 ms         | Performance guardrail                                    |
| Backend p95 latency (cold yfinance) | ≤ 1500 ms        | Performance guardrail                                    |
| Error rate (5xx)                    | < 0.5 %          | Stability guardrail                                      |

---

## 7. Functional requirements (selected, by area)

### FR-AUTH
- **FR-AUTH-1.** Users must enter a valid access code to unlock the app shell. Invalid codes show a friendly error and never reveal whether the code exists.
- **FR-AUTH-2.** Once verified, the access code is stored in `localStorage` and re-validated on each app load.
- **FR-AUTH-3.** Admins authenticate with a single bcrypt-hashed password and receive a short-lived JWT.

### FR-SEARCH
- **FR-SEARCH-1.** Search must accept partial tickers _and_ partial company names.
- **FR-SEARCH-2.** Dropdown must debounce input by **220 ms**; stale responses must not overwrite later results.
- **FR-SEARCH-3.** Foreign-exchange duplicates (London, Hong Kong, etc.) are filtered out.
- **FR-SEARCH-4.** Exchange filter chips: All / US / India.

### FR-STACK
- **FR-STACK-1.** Max **10** stocks; FIFO eviction on overflow.
- **FR-STACK-2.** Latest stock auto-expands its inline detail accordion; older stocks show a "Show full analysis" toggle.
- **FR-STACK-3.** Stack persists across page reloads via `localStorage`.

### FR-PORTFOLIO
- **FR-PORTFOLIO-1.** Accept CSV with **or without** headers; auto-detect ticker / shares / cost / date columns.
- **FR-PORTFOLIO-2.** Paste-text fallback parses tab / comma / space / colon / parens / `$` / `@`-sign formats.
- **FR-PORTFOLIO-3.** S&P 500 benchmark is **cost-weighted** across each position's holding period (uses `buy_date` if present, else YTD).
- **FR-PORTFOLIO-4.** Background polling refreshes positions every **60 s**; S&P history cached for **10 min** to avoid Yahoo rate limits.

### FR-ALERTS
- **FR-ALERTS-1.** Alert direction is `above` or `below` only; target price is positive float.
- **FR-ALERTS-2.** Alert state machine: `active` → `triggered` → `dismissed` → (manual) `reset`.

### FR-RESILIENCE
- **FR-RESILIENCE-1.** Every numeric field surfaced from `yfinance` must pass through `safe_float / safe_int / safe_pct` before serialization. Endpoints must **never** return `NaN` or `Infinity`.
- **FR-RESILIENCE-2.** `_id` (BSON `ObjectId`) is excluded from every MongoDB response.

_Full functional spec lives in code + tests under `backend/tests/` and the route-level docstrings in `backend/server.py`._

---

## 8. Non-functional requirements

| Category        | Requirement                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **Performance** | p95 < 300 ms (cached) / < 1500 ms (cold). Pages must be interactive on mobile within 2 s on 4G.     |
| **Reliability** | 99.5 % monthly uptime. yfinance failures degrade gracefully — UI shows partial data + error toast.  |
| **Security**    | Access-code rate limiting (10 attempts / IP / hour). Admin JWT with 24 h TTL. No PII stored.        |
| **Privacy**     | No analytics SDKs leaking ticker queries to third parties. Portfolio data is local to the deployment. |
| **A11y**        | Keyboard-navigable (in progress); colour contrast ≥ 4.5 : 1 for text; reduced-motion CSS respected.  |
| **Browser**     | Latest Chrome / Safari / Firefox / Edge. Mobile Safari + Chrome Android. IE11: not supported.        |

---

## 9. Out of scope (v1)

- Real-money brokerage execution
- Tick-level streaming
- Options / futures / crypto data
- Multi-account / team features
- Native iOS / Android apps

---

## 10. Release log (high-level — full log lives in `/app/memory/PRD.md`)

| Phase            | Highlights                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| **May 2026**     | Full mobile responsive overhaul · pull-to-refresh · landing page · pinned-stocks DnD · Compact view · Price Alerts. |
| **Feb 2026**     | Fuzzy company-name search · App.js refactor · per-stock inline accordion · About Us · NaN/Inf hardening · **Portfolio Tracker with S&P 500 benchmark** · Mobile FAB search · Category-page mobile cards · Search dropdown debounce. |

---

## 11. Backlog & roadmap

### P0 (Critical) — _none open_

### P1 (Important)
- Keyboard shortcuts (`/` to focus search, `Esc` to close modals/sidebar).
- Confirmation dialog before "Dismiss All".
- React Native mobile app (separate codebase).
- Shareable portfolio snapshot card (export PNG for social).

### P2 (Nice to have)
- Side-by-side stock comparison tool.
- Earnings-day countdown + calendar view.
- Sector rotation heatmap.
- Multi-portfolio support per user.

### Technical debt (tracked, not user-facing)
- Split `server.py` (~4 000 LoC) into `routes/` per resource (search, quotes, alerts, intelligence, portfolio).
- Reduce `App.js` (~1 950 LoC) by extracting `Header`, `Sidebar`, `StockList`.
- Move predefined ticker dictionaries out of `search_stocks()` to module-level constants.
- Add a TTL cache around `yf.Search` lookups (rate-limit defence).
- Replace in-process cache with Redis once we scale beyond a single backend replica.
- Remove orphaned `CategoriesPage.js` (still routed, replaced by Explore popover).

---

## 12. Open questions

1. Do we open a **paid tier** with Bloomberg-grade data once we exceed yfinance reliability ceilings?
2. Do we add **community signals** (most-stacked stocks across all users) — and how do we respect privacy?
3. Should the admin panel grow into a **growth dashboard** (cohort retention, code redemption funnel)?

---

_For technical detail of any feature above, see [`ARCHITECTURE.md`](./ARCHITECTURE.md). For scaling / ops / trade-offs, see [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md)._
