# Moonshot - Stock Analysis Platform

## Original Problem Statement
Build a comprehensive stock analysis application called "Moonshot" with stock search, financial charts, AI-powered analysis, and intelligence modules. The app should support responsive mobile/tablet/desktop views with a premium dark theme.

## User Personas
- **Retail Investors**: Search stocks, view charts, pin favorites, explore categories
- **Power Users**: Dense view mode, stock comparison, advanced charts, export to CSV
- **Admin**: Manage access codes at `/admin`

## Core Requirements
1. **Stock Management**: Search, stack (up to 10), pin, dismiss stocks
2. **Financial Charts & Data**: Interactive charts with Y-axis dollar values, key stats, news, earnings
3. **AI Deep Analysis**: 8-quarter health report with risk scorecard
4. **Intelligence Hub (Beta)**: Accordion layout with 5 Signals, Pre-Earnings Intelligence Report, Why Moving, Insider Alerts, Whale Watch, Similar Stocks
5. **UI/UX**: Dark theme with tagline "Discover Your Next Big Win", category exploration, animated backgrounds (Particle Network, Aurora Borealis, Matrix Rain, Bokeh Blur, Noise Gradient, Mesh Gradient)
6. **Performance**: Backend yfinance TickerCache to prevent redundant API calls
7. **Responsive Design**: Mobile-optimized layout across all viewports (375px+)

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + yfinance (with TickerCache)
- **Frontend**: React + axios + recharts + shadcn/ui
- **Database**: MongoDB (access_codes, custom_categories, pinned_stocks)
- **Auth**: Access code system with admin panel

> 📐 **Full system design with Mermaid diagrams:** see [`/app/memory/ARCHITECTURE.md`](./ARCHITECTURE.md) — covers high-level architecture, request flow, component tree, backend module map, data model (ERD), API surface, caching strategy, deployment topology, and architectural decisions.

## What's Been Implemented
- Stock search, stacking (up to 10), pinning, dismissal
- Financial charts with Y-axis labels, key stats, news, earnings snapshots
- AI Deep Analysis (8-quarter health report + risk scorecard + verdicts)
- Intelligence Hub (Beta) with accordion: 5 Signals, PEIR, Why Moving, Insider Alerts, Whale Watch, Similar Stocks
- 6 animated background themes + None option
- Backend TickerCache for yfinance optimization
- S&P 500 comprehensive test suite (100% pass)
- **[May 2026] Full responsive mobile optimization** - 3-viewport adaptive layout (mobile/tablet/desktop)
- **[May 2026] Pull-to-refresh** - Native touch gesture for mobile data refresh
- **[May 2026] Landing page** - Vertical spotlight scroll with Hero, AI Deep Analysis showcase, Intelligence Hub showcase, features grid, stats strip, and embedded access code input
- **[May 2026] Drag-and-drop pinned stocks** - Reorder pinned stocks by dragging, persists to backend via order field
- **[May 2026] Categories popover** - Moved categories from home page into a compact header popover flyout (Explore button), with market tabs and scrollable list
- **[May 2026] Stock visibility fix** - Categories auto-hide when stocks are stacked; auto-scroll to newly selected stock
- **[May 2026] Compact view** - Replaced Dense table with compact sparkline view (ticker + mini chart + price + change%), toggled via header button
- **[May 2026] Price Alerts (Option C)** - Bell icon on stock cards with quick-set popover (above/below + target price), alert count badge on Menu button, inline alert summary in sidebar with distance tracking and delete
- **[May 2026] Price Alerts generic search** - Sidebar Price Alert Manager now includes search dropdown to set alerts on any stock (not just the active one)
- **[Feb 2026] Stock search fuzzy lookup** - Full company names like "Salesforce" and "Abbott Laboratories" now resolve to correct tickers (CRM, ABT) via yfinance Search supplementing the predefined ticker dictionaries; foreign exchange listings filtered out
- **[Feb 2026] App.js refactor (pass 1)** - Extracted `CategoryIcon` (+ LUCIDE_ICONS), `SortablePinnedStock`, and `BACKGROUND_OPTIONS` into dedicated files under `/components`. App.js reduced from 2,411 to 2,335 lines with no behavior changes.
- **[Feb 2026] Per-stock inline details accordion (Option A)** - Previously only the latest stacked stock showed Financials/Analysis/News/Intelligence Hub/AI Deep Analysis. Now: the last stock auto-expands those sections inline below its card, and older stocks each get a "Show full analysis" toggle button that expands an inline `StockDetailsBlock` for that specific ticker. Per-ticker refresh state (`refreshingTickers` Set) supports parallel refreshes. Old standalone selectedStock detail block removed.
- **[Feb 2026] About Us modal** - Floating bottom-left pill button + full content modal on landing and authenticated views (with Disclaimer, Philosophy cards, mission).
- **[Feb 2026] /history NaN fix** - get_stock_history drops rows with NaN OHLC (ex-dividend markers) before serializing. Fixed MSFT crash.
- **[Feb 2026] Defensive NaN/Inf hardening** - safe_int + safe_pct helpers; /quote, /earnings-snapshot, /health-report all numeric fields run through safe helpers. 87/87 pytest verifying no NaN/Inf leakage across 20 tickers.
- **[Feb 2026] Portfolio Tracker with P&L Dashboard** - New `/portfolio` route. Header pill button with pulsing green/red dot reflecting today's P&L direction (Option 4 placement). Card-stack dashboard (Option B): summary card (total value · today · all-time P&L · best/worst chips · rainbow allocation bar) + per-position cards (avg cost → current, market value, today $/%, gold-highlighted unrealized P&L). Inline edit & delete. Two-phase import: CSV upload OR paste-text → preview with detected broker (Robinhood/Fidelity/Schwab/Vanguard/E*TRADE/Webull) → confirm. Tolerant parser handles $/commas/parens/colons/@-signs/spaces/tabs. Live quotes via yfinance polled every 60s for header dot. Backend: `/api/portfolio` CRUD + `/portfolio/summary` + `/portfolio/import`. Tested: 20/20 backend pytest + full frontend Playwright happy path.
- **[Feb 2026] Portfolio vs S&P 500 benchmark** - Summary card now shows inline "+X% vs +Y% S&P 500 [↑ beating / ↓ trailing] by Z%" pill under Total P&L. Backend: cost-weighted S&P return across each position's holding period (uses buy_date or YTD fallback). 10-min TTL cache on ^GSPC history to avoid yfinance rate-limiting from 60s polling. 27/27 pytest passing.
- **[Feb 2026] Search dropdown jitter fix** - Search input now debounces queries by 220ms and uses an incrementing requestId ref so stale in-flight responses can't overwrite the latest results. Stops per-keystroke resize of the dropdown.
- **[Feb 2026] Mobile Category page redesign** - `CategoryPage.js` now renders a stacked card layout on `<md` (ticker/price header → full-width sparkline → 3-column Mkt Cap / 52W High / 52W Low grid). Desktop keeps the original 12-col table. Fixes overlapping prices/market-cap/52W columns on 390px viewports.
- **[Feb 2026] Capital Deployments (Intelligence Hub)** - New accordion module sourced from SEC EDGAR. Section 1: Public-Stock Holdings (13F-HR) with `New This Quarter` / `Current Book` tabs, NEW/TOPUP/EXITED badges, +N% QoQ tooltip, and `Show all N holdings`/`Show 5 only` collapse. Section 2: Acquisitions — Last 12 Months from 8-K filings (Item 1.01 / 2.01) with regex-based target-name + deal-size extraction. Graceful empty states for non-13F filers (AAPL/TSLA). Backend: `/api/stocks/:ticker/capital-deployments` + `backend/sec_edgar.py` with 24h TTL cache, CUSIP consolidation across insurance subs (Berkshire-safe), 35-entry name→ticker hint dictionary, and post-2023 dollar-vs-thousands value-scale detection. Tested 7/7 backend pytest + frontend 9/9 scenarios (NVDA shows CRWV +94%, COHR NEW, GENB NEW; BRK-B shows AAPL ~$57.8B as top holding; AAPL/TSLA empty-state).
- **[Feb 2026] Capital Deployments — verifiable sources** - Each acquisition row's date is now a clickable link to that specific 8-K filing (Option C). Module footer replaced with a 3-pill "Data verified against SEC EDGAR" card (Option D) exposing `View 13F-HR` (specific filing), `View 8-K filings` (list), `EDGAR profile` (company landing). Non-13F filers correctly hide the 13F link. Source card also renders in the empty-both state so users can verify non-filer status. Backend response augmented with `thirteenf_filing_url`, `all_13f_url`, `all_8k_url`, `edgar_profile_url`. 9/9 backend pytests passing (+2 new contract tests for URL shape).

## Responsive Design Implementation (May 2026)
- HTML font-size scaling: 16px mobile -> 18px tablet -> 20.8px desktop
- Header: compact on mobile (icon-only buttons), full on desktop
- Category grid: 3-col mobile -> 4-col tablet -> 6-col desktop
- Stock card stats: 3-col mobile -> 5-col tablet -> 9-col desktop
- Sidebar: 85vw on mobile, 18rem on desktop
- Modals: bottom-sheet style on mobile, centered on desktop
- Touch optimization: hover effects only on hover-capable devices
- Scrollable period tabs and horizontally scrollable data tables
- **Pull-to-refresh**: Native touch gesture to refresh stock prices (when stocks loaded) or home data (on home page). Shows animated indicator with progress feedback.

## Prioritized Backlog

### P0 (Critical) - None

### P1 (Important)
- Keyboard shortcuts (/ to focus search, Esc to close modals/sidebar)
- React Native mobile app (separate codebase)

### P2 (Nice to have)
- Confirmation dialog before "Dismiss All"
- Portfolio tracker with P&L dashboard
- Side-by-side stock comparison tool

### Refactoring
- Remove orphaned CategoriesPage.js (still routed but functionally duplicated)
- Continue breaking down App.js (still ~1,950 lines). Next candidates: Header, Sidebar, StockList layout sections.
- Modularize server.py (~4,000 lines) into routers/services per resource (search, quotes, alerts, intelligence). Move predefined ticker dictionaries out of `search_stocks()` to module-level constants.
- Add TTL cache (~60s) around yfinance Search lookups to reduce rate-limit risk.

### Code-quality backlog (from Feb 2026 code-review audit)
- **React hook dependency warnings** (~40 sites across `usePullToRefresh`, `use-toast`, `ComparisonChart`, `AILoadingAnimation`, `usePortfolioSummary`, `PortfolioPage`, `WatchlistManager`, `PriceAlertManager`). Needs a dedicated PR with regression testing — risk of subtle stale-closure bugs.
- **Array-index keys** (~40 sites across `StockDetailsBlock`, `HealthReportCard`, `NewsCard`, `ComparisonChart`, `AILoadingAnimation`, portfolio components). Replace with stable IDs.
- **localStorage / sessionStorage security** (`App.js:976`, `AdminPage.js:28/58/69`). Move auth tokens to httpOnly cookies, encrypt other sensitive data, or move to memory-only session storage. Needs backend session-cookie design first.
- **Oversized components** to split: `AccessGate.js` (420), `AdminPage.js` (394), `AdvancedChart.js` (549), `PriceAlertManager.js` (504), `StockDetailsBlock.js` (484).
- **`portfolio_import.py` complexity**: `parse_input()` (20 CC), `_score_content()` (16 CC, 6 nesting levels), `detect_columns()` (13 CC), `_read_rows()` (11 CC) — break into focused helpers + lookup tables.
- **Python type-hint coverage** is ~11% (vs target 80%). Bulk pass needed on `server.py`, `portfolio_import.py`, all `tests/`.
- **Test files use `is`-comparison for non-bool literals** (~100 sites across `test_portfolio_tracker.py`, `test_price_alerts.py`, `test_new_features.py`). Replace with `==`. (`test_capital_deployments.py` already cleaned up.)
- **`search_stocks()` in `server.py:483`** has 32 CC / 306 lines / 8 nesting levels — extract filter / scoring / formatting helpers.
