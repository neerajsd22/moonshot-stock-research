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
- React Native mobile app (separate codebase)

### P2 (Nice to have)
- Drag-and-drop reordering for pinned stocks
- Keyboard shortcuts (/ to focus search, Esc to close)
- Confirmation dialog before "Dismiss All"
- Compact view mode (ticker + mini sparkline + price)
- Portfolio tracker with P&L dashboard
- Price alert notifications
- Side-by-side stock comparison tool

### Refactoring
- Remove orphaned CategoriesPage.js (still routed but functionally duplicated)
- Break down App.js (~2200+ lines) into smaller modules
