# Moonshot Stock Picker - Product Requirements Document

## Source Repository
**GitHub**: https://github.com/neerajsd22/MoonshotStockPicker.git
*(Make sure repo is public when cloning)*

## Access Credentials
- **User Access Code**: `MOONSHOT` (unlimited uses, persistent)
- **Admin Password**: `z7&G2#kL9!pX`
- **Admin URL**: `/admin`

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, shadcn/ui components, Recharts
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **External API**: yfinance for stock data

## Key Files
```
/app/frontend/src/App.js           - Main app component (HomePage with all stock features)
/app/frontend/src/CategoryPage.js  - Category detail page
/app/frontend/src/components/AdminPage.js - Admin dashboard
/app/frontend/src/components/AccessGate.js - Access code authentication
/app/frontend/src/App.css          - Global styles
/app/backend/server.py             - FastAPI backend with all endpoints
```

## Core Features Implemented

### Stock Display & Management
- Stock search with autocomplete
- **Stack up to 10 stocks** - displays one below the other
- **Dismiss button** - removes individual stocks from display
- **Dense/Expand view toggle** - Dense shows compact table with Key Stats columns
- Historical price charts with time periods (1M, 3M, 6M, 1Y, 5Y)
- Key Stats: Day Open/High/Low, Market Cap, P/E, Dividend, 52W High/Low, Volume
- Bull/Bear sentiment analysis
- Latest news section
- Pin/Unpin stocks functionality

### Categories
- Pre-defined categories (Finance, Technology, AI, Semiconductors, etc.)
- Indian market categories (Nifty 50, Nifty IT, Nifty Bank, etc.)
- **Custom categories** - users can create their own with up to 10 tickers
- Category names display correctly on category pages

### Admin Features
- Generate unlimited-use access codes
- **Expire codes** - manually deactivate codes
- **Reactivate codes** - restore expired codes
- Delete codes permanently

### UI/UX
- 🚀 **Fun loading animation** when fetching stock data (rocket, sparkles, progress bar)
- Confetti celebration on first login
- Dark theme with gold/pink accents
- Responsive design

## API Endpoints
```
GET  /api/stocks/search?q={query}     - Search stocks
GET  /api/stocks/{ticker}/quote       - Get stock quote
GET  /api/stocks/{ticker}/history     - Get historical data
GET  /api/stocks/category/{name}      - Get category stocks
POST /api/access/verify               - Verify access code
POST /api/admin/login                 - Admin login
GET  /api/admin/access-codes          - List all codes
POST /api/admin/access-codes          - Generate new codes
PUT  /api/admin/access-codes/{code}/expire     - Expire a code
PUT  /api/admin/access-codes/{code}/reactivate - Reactivate a code
POST /api/custom-categories           - Create custom category
GET  /api/custom-categories           - List custom categories
```

## Session History

### Jan 28, 2026
1. Cloned codebase from GitHub
2. Added dismiss button on stock cards
3. Implemented stock stacking (up to 10)
4. Added Dense/Expand view toggle with Key Stats table
5. Fixed custom category name display bug
6. Fixed admin login and made access codes persistent (unlimited uses)
7. Added Expire/Reactivate functionality for codes
8. Changed admin password
9. Added fun loading animation (rocket + sparkles)

## Backlog (Future Features)
### P1
- Persist stacked stocks across sessions (localStorage)
- Export stacked stocks to CSV
- Compare charts overlay

### P2
- Custom columns in Dense view
- Drag-and-drop reordering of stacked stocks
- Price alerts notifications
- Watchlist sync across devices

---
*Last Updated: Jan 28, 2026*
