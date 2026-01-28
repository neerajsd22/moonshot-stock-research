# Moonshot Stock Picker - PRD

## Original Problem Statement
Add three features to the Moonshot stock picker app:
1. Dismiss button on stock ticker cards to remove them
2. Ability to stack multiple stock tickers (up to 10) one below the other
3. Dense/Expand view toggle - Dense shows only ticker + Key Stats in table columns

## Architecture & Tech Stack
- **Frontend**: React.js with Tailwind CSS, shadcn/ui components
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **External API**: yfinance for stock data

## Core Features Implemented

### Session: Jan 28, 2026
1. **Dismiss Button** - Each stock card now has a red "Dismiss" button that removes the stock from display
2. **Stock Stacking (up to 10)** - Users can search and add multiple stocks that display one below the other
3. **Dense/Expand View Toggle**:
   - Dense mode: Compact table showing Ticker, Price, Change, Day Open, Day High, Day Low, Market Cap, P/E, 52W High, 52W Low, Volume
   - Expand mode: Full detailed view with charts, analysis, news
   - Button text changes between "Dense" and "Expand" based on current mode

### Existing Features
- Stock search with autocomplete
- Historical price charts
- Bull/Bear sentiment analysis
- Latest news section
- Watchlist management
- Price alerts
- Category exploration
- Pin/Unpin stocks

## User Personas
- Individual investors researching stocks
- Day traders comparing multiple tickers
- Long-term investors tracking portfolio

## Backlog (P0/P1/P2)
### P1
- Persist stacked stocks across sessions
- Export stacked stocks to CSV

### P2  
- Side-by-side comparison mode for charts
- Custom columns in Dense view
- Drag-and-drop reordering of stacked stocks
