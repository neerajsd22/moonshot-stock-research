# Moonshot — System Design & Architecture

> Companion to `/app/memory/PRD.md`. All diagrams are Mermaid — they render natively on GitHub, VS Code (with Mermaid plugin), Obsidian, and most Markdown viewers.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Client Layer"]
        Browser["Browser / Mobile WebView<br/>(React SPA)"]
    end

    subgraph EDGE["☁️ Edge / Ingress"]
        Ingress["Kubernetes Ingress<br/>/api/* → backend:8001<br/>/*    → frontend:3000"]
    end

    subgraph FE["⚛️ Frontend (React)"]
        ReactApp["React 18 + React Router<br/>shadcn/ui + Tailwind<br/>axios · recharts · dnd-kit"]
    end

    subgraph BE["🐍 Backend (FastAPI)"]
        FastAPI["FastAPI + Uvicorn (port 8001)<br/>api_router prefix=/api<br/>Motor async MongoDB driver"]
        Cache["In-process TickerCache<br/>(yfinance.Ticker dedupe)<br/>+ S&P 500 history TTL cache (10 min)"]
        Portfolio["portfolio_import.py<br/>Broker auto-detect parser"]
    end

    subgraph DATA["🗄️ Persistence"]
        Mongo[("MongoDB<br/>(Motor async)")]
    end

    subgraph EXT["🌐 External Services"]
        YF["yfinance<br/>(Yahoo Finance)"]
    end

    Browser -->|HTTPS| Ingress
    Ingress --> ReactApp
    Ingress -->|/api/*| FastAPI
    ReactApp -.->|REACT_APP_BACKEND_URL| Ingress
    FastAPI --> Cache
    FastAPI --> Portfolio
    FastAPI -->|Motor| Mongo
    Cache -->|HTTP| YF

    classDef ext fill:#1e293b,stroke:#d946ef,color:#fff
    classDef be fill:#0f172a,stroke:#10b981,color:#fff
    classDef fe fill:#0f172a,stroke:#60a5fa,color:#fff
    classDef data fill:#0f172a,stroke:#f59e0b,color:#fff
    class YF ext
    class FastAPI,Cache,Portfolio be
    class ReactApp fe
    class Mongo data
```

**Key facts:**
- Single-page React app served at `/`, FastAPI mounted at `/api/*` behind a shared K8s ingress.
- Backend never holds long sessions — every request is stateless aside from the in-process `TickerCache`.
- All external data (prices, fundamentals, news) flows through `yfinance` and is normalised through `safe_float / safe_int / safe_pct` helpers before serialization.

---

## 2. Request Flow — Stock Search & Selection

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as React (App.js)
    participant DB as Debounce (220ms)
    participant API as FastAPI /api
    participant TC as TickerCache
    participant YF as yfinance
    participant M as MongoDB

    U->>FE: types "appl" in search input
    FE->>DB: schedule searchStocks (cancel prior timer)
    Note over DB: waits 220ms<br/>requestId++ on fire
    DB->>API: GET /stocks/search?q=appl&exchange=all
    API->>API: predefined ticker dict lookup
    API->>YF: yf.Search(query) (supplement, foreign filtered)
    YF-->>API: candidate matches
    API-->>FE: [{ticker, name, exchange}]
    FE->>FE: drop result if requestId stale
    FE-->>U: dropdown renders (no jitter)

    U->>FE: selects AAPL
    FE->>API: GET /stocks/AAPL/quote
    API->>TC: get_ticker("AAPL")
    TC-->>API: cached yf.Ticker
    API->>YF: ticker.info (if not cached)
    API->>API: safe_float on every numeric field
    API-->>FE: StockQuote (Pydantic model, _id excluded)
    FE->>FE: push to stackedStocks (max 10) → localStorage
    FE->>API: GET /stocks/AAPL/history?period=1y (parallel)
    FE->>API: GET /stocks/AAPL/news (parallel)
    FE->>API: GET /stocks/AAPL/earnings-snapshot (parallel)
    par parallel responses
        API-->>FE: history
        API-->>FE: news
        API-->>FE: earnings
    end
    FE->>M: POST /pinned-stocks (if user pins)
```

**Why this matters:**
- The debounce + requestId pattern (introduced Feb 2026) is what stops dropdown jitter on every keystroke.
- All Yahoo Finance calls go through `TickerCache` so the same ticker isn't fetched multiple times within a request burst.
- `safe_float / safe_int` wrappers convert NaN / Infinity / pandas-NA into `None` before Pydantic serialization — otherwise FastAPI's JSON encoder crashes.

---

## 3. Frontend Component Tree

```mermaid
graph TD
    Root["index.js"]
    Root --> AppRouter["App.js (Router)"]

    AppRouter --> Landing["LandingPage<br/>(unauth) + AccessGate"]
    AppRouter --> Home["HomePage (auth)"]
    AppRouter --> Admin["AdminPage"]
    AppRouter --> Portfolio["PortfolioPage"]
    AppRouter --> Category["CategoryPage<br/>(mobile card / desktop table)"]

    Home --> Header["Header<br/>logo · search · Explore · Portfolio · Condense · Menu"]
    Home --> MobileSearch["MobileSearchSheet<br/>(bottom-sheet + FAB)"]
    Home --> Pinned["Pinned Stocks Strip<br/>(dnd-kit Sortable)"]
    Home --> Stack["StackedStocks (max 10)"]
    Home --> About["AboutUs Modal<br/>(bottom-right FAB)"]
    Home --> Sidebar["Sidebar Drawer<br/>· Themes<br/>· PriceAlertManager<br/>· WatchlistManager"]

    Stack --> StockCard["Stock Card<br/>(ticker · price · ΔPct · sparkline)"]
    StockCard --> Details["StockDetailsBlock<br/>(inline accordion)"]
    Details --> Charts["AdvancedChart (recharts)"]
    Details --> AIDeep["AI Deep Analysis<br/>(8-quarter health report)"]
    Details --> IHub["IntelligenceHub<br/>· 5 Signals<br/>· PEIR<br/>· Why Moving<br/>· Insider<br/>· Whale Watch<br/>· Similar"]
    Details --> News["News & Earnings"]

    Portfolio --> PortHeader["Summary Card<br/>· Total Value · Today P&L<br/>· S&P 500 benchmark pill<br/>· Best/Worst chips · Allocation bar"]
    Portfolio --> PortRows["Per-position Cards<br/>(inline edit/delete)"]
    Portfolio --> Import["ImportDialog<br/>CSV upload OR paste-text<br/>→ broker auto-detect preview"]

    classDef new fill:#1e293b,stroke:#d946ef,color:#fff
    class MobileSearch,Details,Portfolio,Import,About new
```

**Key state managed in `App.js`:**
- `stackedStocks` (persisted to `localStorage`)
- `pinnedStocks`, `searchQuery`, `searchResults`
- `searchTimeoutRef`, `searchRequestIdRef` — power the debounce-safe search
- `viewMode` (`spacious` ↔ `dense/condense`), `selectedMarket`, `selectedBackground`

---

## 4. Backend Module Map

```mermaid
graph LR
    subgraph SRV["server.py (~4,000 lines)"]
        Auth["Access codes<br/>/access/verify · /admin/*"]
        Search["/stocks/search<br/>(predefined dict + yf.Search)"]
        Quote["/stocks/:t/quote · /history<br/>· /earnings-snapshot · /news<br/>· /health-report"]
        Pinned["/pinned-stocks<br/>(CRUD + reorder)"]
        Categories["/stocks/category/:name<br/>+ custom-categories CRUD"]
        Watchlists["/watchlists CRUD"]
        Alerts["/price-alerts<br/>(CRUD · check · dismiss · reset)"]
        Intel["Intelligence Hub<br/>/five-signals · /earnings-intelligence<br/>/why-moving · /insider-alerts<br/>/whale-watch · /similar-stocks"]
        PortAPI["/portfolio CRUD<br/>/portfolio/summary<br/>/portfolio/import"]
        AI["AI Deep Analysis<br/>/ai-analysis · /bull-bear-sentiment"]
        Indicators["/candlestick · /indicators"]
    end

    PortImp["portfolio_import.py<br/>(broker auto-detect parser)"]
    Models["models/<br/>(Pydantic schemas)"]
    Tests["tests/<br/>(pytest fixtures)"]

    SRV --> PortImp
    SRV --> Models
    Tests --> SRV
```

**Defensive serialization layer (shared):**
- `safe_float(x)` → returns `None` if `NaN / Inf / pandas-NA`, else `float(x)`
- `safe_int(x)` → analog for ints
- `safe_pct(x)` → returns `None` for invalid percent values
- `_id` is **always excluded** from MongoDB responses via projection or Pydantic models.

---

## 5. Data Model (MongoDB Collections)

```mermaid
erDiagram
    access_codes {
        string code PK
        bool is_active
        datetime created_at
        datetime expired_at
    }
    pinned_stocks {
        string id PK
        string ticker
        int order
        datetime created_at
    }
    custom_categories {
        string id PK
        string name
        string slug
        list tickers
        datetime created_at
    }
    watchlists {
        string id PK
        string name
        list tickers
        datetime created_at
    }
    price_alerts {
        string id PK
        string ticker
        string direction "above|below"
        float target_price
        bool is_active
        datetime created_at
    }
    portfolios {
        string id PK
        list positions "[{ticker, shares, avg_cost, buy_date}]"
        datetime updated_at
    }

    pinned_stocks ||--o{ price_alerts : "ticker"
    watchlists ||--o{ price_alerts : "ticker"
    custom_categories ||--o{ pinned_stocks : "tickers"
```

No relational FKs — joins happen application-side (by ticker string).

---

## 6. API Surface Map (Grouped)

| Group               | Endpoints                                                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth / Admin**    | `POST /access/verify` · `POST /admin/login` · `GET/POST/PUT/DELETE /admin/access-codes`                                                                                                                                                              |
| **Search & Quote**  | `GET /stocks/search` · `GET /stocks/:t/quote` · `/history` · `/news` · `/earnings-link` · `/earnings-snapshot` · `/health-report` · `/candlestick` · `/indicators`                                                                                   |
| **Pinned**          | `GET/POST/DELETE /pinned-stocks` · `PUT /pinned-stocks/reorder`                                                                                                                                                                                      |
| **Categories**      | `GET /stocks/category/:name` · `GET/POST/DELETE /custom-categories`                                                                                                                                                                                  |
| **Watchlists**      | full CRUD + `/stocks/:ticker` add/remove                                                                                                                                                                                                             |
| **Price Alerts**    | `GET/POST/DELETE /price-alerts` · `GET /price-alerts/check` · `POST /price-alerts/:id/dismiss` · `/reset`                                                                                                                                             |
| **AI / Intel**      | `/ai-analysis` · `/bull-bear-sentiment` · `/five-signals` · `/earnings-intelligence` · `/smart-earnings` · `/why-moving` · `/insider-alerts` · `/whale-watch` · `/similar-stocks`                                                                     |
| **Portfolio**       | `GET /portfolio` · `GET /portfolio/summary` · `POST/PUT/DELETE /portfolio` · `POST /portfolio/import`                                                                                                                                                |
| **Health**          | `GET /health` · `GET /api/health`                                                                                                                                                                                                                    |

---

## 7. Caching Strategy

```mermaid
flowchart LR
    Req["API Request"] --> Hit{"TickerCache<br/>hit?"}
    Hit -- "Yes" --> Reuse["Reuse yf.Ticker<br/>(in-memory)"]
    Hit -- "No" --> Fetch["yf.Ticker(symbol)"]
    Fetch --> Store["Store in TickerCache"]
    Store --> Reuse
    Reuse --> Norm["safe_float/_int/_pct<br/>scrub NaN & Inf"]
    Norm --> Resp["JSON Response"]

    SP500["/portfolio/summary"] --> SPCache{"S&P 500 TTL<br/>(10 min)"}
    SPCache -- "fresh" --> SPReuse["Reuse history df"]
    SPCache -- "stale" --> SPFetch["yfinance ^GSPC<br/>history"]
    SPFetch --> SPStore["Store with timestamp"]
    SPStore --> SPReuse
```

- **TickerCache** prevents redundant `yf.Ticker` instantiations within a single backend process. Lifetime = process lifetime (cleared on backend restart).
- **S&P 500 history cache** is a separate dict keyed by `(period, start_date)` with a 10-minute TTL — added to handle the 60-second portfolio polling without rate-limiting Yahoo.
- No Redis / external cache — kept in-process for simplicity.

---

## 8. Deployment Topology

```mermaid
graph LR
    Dev["Developer<br/>(Emergent Preview)"]
    Prod["Production Deployment<br/>moonshot-stock-viz.emergent.host"]

    subgraph Pod["Kubernetes Pod (per env)"]
        Supervisor["supervisord"]
        Supervisor --> BE["backend (uvicorn :8001)"]
        Supervisor --> FE["frontend (CRA dev/build :3000)"]
        Supervisor --> Mongo[("mongod (local volume)")]
    end

    Dev -->|hot reload| Supervisor
    Prod -->|built bundle| Supervisor
```

- Both **preview** and **production** are the same image / topology, just different ingress hostnames.
- Hot reload enabled in preview only (FastAPI reload + CRA dev server).
- All secrets (`MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL`) come from `.env` files mounted into the pod.

---

## 9. Key Architectural Decisions

| Decision                                        | Rationale                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Stateless backend + localStorage stacks**     | Avoids per-user auth complexity. Users keep their stack across reloads without a DB write per interaction. |
| **Single-process TickerCache** (no Redis)       | Fast enough for current scale; avoids ops burden. Trade-off: cache is per-replica.                         |
| **Predefined ticker dict + yfinance Search**    | Predefined is instant for the top ~500 tickers; yfinance.Search supplements long-tail names like "Salesforce". |
| **Per-card inline accordion** (Option A)        | Replaces a single-selected-stock detail block with per-ticker expandable panels; supports parallel refresh. |
| **Mobile card layout for CategoryPage**         | 12-col grid table overlaps badly on 390px; cards eliminate horizontal cramping while keeping desktop table.|
| **220ms search debounce + requestId guard**     | Prevents per-keystroke dropdown jitter and stale-response overwrites.                                      |
| **safe_float / safe_int everywhere**            | yfinance leaks NaN/Inf which break FastAPI's `JSONEncoder`. One-line guard at every numeric assignment.    |
| **Broker-agnostic CSV parser**                  | Lets users paste statements from Robinhood/Fidelity/Schwab/Vanguard/E*TRADE/Webull without manual mapping. |
| **Access-code auth (not OAuth)**                | Invite-only product; keeps friction low and removes OAuth-provider dependency.                             |

---

## 10. Known Tech Debt / Refactor Backlog

- `App.js` is still ~1,950 lines. Next extraction candidates: `Header`, `Sidebar`, `StockList`.
- `server.py` is ~4,000 lines. Should split into `routes/` per resource (search, quotes, alerts, intelligence, portfolio).
- Predefined ticker dictionaries should move out of `search_stocks()` into a module-level constant.
- Add a TTL cache around `yf.Search` results to reduce rate-limit risk.
- Replace in-process caches with Redis once we add a second backend replica.
- Remove orphaned `CategoriesPage.js` (still routed, functionally duplicated by the Explore popover).

---

_Last updated: Feb 2026 — to be regenerated whenever a route group or major component is added._
