from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import yfinance as yf
import asyncio
import pandas as pd
from emergentintegrations.llm.chat import LlmChat, UserMessage
import secrets
import string


# Helper function to sanitize float values for JSON
def safe_float(value, default=None):
    """Convert value to float, returning default if NaN, Inf, or None"""
    if value is None:
        return default
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def safe_round(value, decimals=1, default=None):
    """Round a value safely, handling NaN and None"""
    f = safe_float(value)
    if f is None:
        return default
    return round(f, decimals)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with fallback for deployment
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME')
if not db_name:
    raise ValueError("DB_NAME environment variable is required")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app without a prefix
app = FastAPI(title="Moonshot API", version="1.0.0")

# Health check endpoint for Kubernetes (root level) - Updated Jan 28, 2026
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {"status": "healthy", "service": "moonshot-backend", "version": "1.0.0"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint under /api prefix
@api_router.get("/health")
async def api_health_check():
    """Health check endpoint accessible via /api/health"""
    return {"status": "healthy", "service": "moonshot-backend", "version": "1.0.0"}


# Define Models
class PinnedStock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    company_name: str
    pinned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    tickers: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomCategoryCreate(BaseModel):
    name: str
    tickers: List[str] = Field(max_length=10)


# Watchlist Models
class Watchlist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    tickers: List[str] = []
    color: str = "#a855f7"  # Default purple
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WatchlistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tickers: List[str] = []
    color: str = "#a855f7"


class WatchlistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tickers: Optional[List[str]] = None
    color: Optional[str] = None


# Price Alert Models
class PriceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    company_name: str
    target_price: float
    condition: str  # "above" or "below"
    is_triggered: bool = False
    is_active: bool = True
    triggered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PriceAlertCreate(BaseModel):
    ticker: str
    company_name: str
    target_price: float
    condition: str  # "above" or "below"


class TriggeredAlert(BaseModel):
    id: str
    ticker: str
    company_name: str
    target_price: float
    condition: str
    current_price: float
    triggered_at: datetime


# Authentication Models
class PinnedStockCreate(BaseModel):
    ticker: str
    company_name: str

class StockSearchResult(BaseModel):
    ticker: str
    name: str
    exchange: Optional[str] = None

class StockQuote(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    high_52week: Optional[float] = None
    low_52week: Optional[float] = None
    company_name: str
    currency: str = "USD"
    day_open: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    market_state: Optional[str] = None

class NewsArticle(BaseModel):
    title: str
    publisher: str
    link: str
    published_date: str
    thumbnail: Optional[str] = None
    summary: Optional[str] = None

class HistoricalData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


# Helper function to run blocking yfinance calls in thread pool
async def run_in_threadpool(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, func, *args, **kwargs)


# Simple access code helpers
def generate_access_code(length: int = 8) -> str:
    """Generate a random access code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


# Admin password - you can change this
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'z7&G2#kL9!pX')
ADMIN_TOKEN = secrets.token_urlsafe(32)


# ==================== ACCESS CODE ENDPOINTS ====================

@api_router.post("/access/verify")
async def verify_access_code(data: dict):
    """Verify an access code"""
    code = data.get('code', '').upper().strip()
    skip_decrement = data.get('skip_decrement', False)  # For re-verification calls
    
    if not code:
        raise HTTPException(status_code=400, detail="Access code required")
    
    # Check if code exists and is active
    access_code = await db.access_codes.find_one(
        {"code": code, "is_active": True},
        {"_id": 0}
    )
    
    if not access_code:
        raise HTTPException(status_code=401, detail="Invalid access code")
    
    # Check uses_remaining: -1 means unlimited, otherwise decrement
    uses_remaining = access_code.get('uses_remaining', -1)  # Default to unlimited
    
    # Only process usage tracking for limited-use codes (not -1 unlimited)
    if uses_remaining != -1 and not skip_decrement:
        if uses_remaining > 1:
            await db.access_codes.update_one(
                {"code": code},
                {"$inc": {"uses_remaining": -1}}
            )
        elif uses_remaining == 1:
            await db.access_codes.update_one(
                {"code": code},
                {
                    "$set": {
                        "is_active": False,
                        "used_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    
    return {"valid": True, "message": "Access granted"}


@api_router.post("/admin/login")
async def admin_login(data: dict):
    """Admin login with password"""
    password = data.get('password', '')
    
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    # Generate a session token
    token = secrets.token_urlsafe(32)
    
    # Store token in database
    await db.admin_sessions.insert_one({
        "token": token,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"token": token, "message": "Admin access granted"}


async def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    """Verify admin token from header"""
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Admin token required")
    
    session = await db.admin_sessions.find_one({"token": x_admin_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    
    return True


@api_router.get("/admin/access-codes")
async def get_access_codes(x_admin_token: str = Header(None)):
    """Get all access codes (admin only)"""
    await verify_admin_token(x_admin_token)
    
    codes = await db.access_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return codes


@api_router.post("/admin/access-codes")
async def create_access_codes(data: dict, x_admin_token: str = Header(None)):
    """Generate new access codes (admin only)"""
    await verify_admin_token(x_admin_token)
    
    count = min(data.get('count', 1), 10)  # Max 10 at a time
    codes = []
    
    for _ in range(count):
        code = generate_access_code()
        await db.access_codes.insert_one({
            "code": code,
            "is_active": True,
            "uses_remaining": -1,  # -1 means unlimited uses (persistent code)
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used_at": None,
            "expired_at": None
        })
        codes.append(code)
    
    return {"codes": codes, "count": len(codes)}


@api_router.put("/admin/access-codes/{code}/expire")
async def expire_access_code(code: str, x_admin_token: str = Header(None)):
    """Expire an access code (admin only) - makes it inactive"""
    await verify_admin_token(x_admin_token)
    
    result = await db.access_codes.update_one(
        {"code": code.upper()},
        {
            "$set": {
                "is_active": False,
                "expired_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    
    return {"message": "Access code expired"}


@api_router.put("/admin/access-codes/{code}/reactivate")
async def reactivate_access_code(code: str, x_admin_token: str = Header(None)):
    """Reactivate an expired access code (admin only)"""
    await verify_admin_token(x_admin_token)
    
    result = await db.access_codes.update_one(
        {"code": code.upper()},
        {
            "$set": {
                "is_active": True,
                "expired_at": None
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    
    return {"message": "Access code reactivated"}


@api_router.delete("/admin/access-codes/{code}")
async def delete_access_code(code: str, x_admin_token: str = Header(None)):
    """Delete an access code (admin only)"""
    await verify_admin_token(x_admin_token)
    
    result = await db.access_codes.delete_one({"code": code.upper()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    
    return {"message": "Access code deleted"}


@api_router.get("/")
async def root():
    return {"message": "Stock Picker API"}


# Search stocks endpoint
@api_router.get("/stocks/search")
async def search_stocks(q: str, exchange: str = "all"):
    """Search for stocks by ticker or company name. Exchange: 'all', 'us', 'nse', 'bse'"""
    try:
        query = q.strip()
        if not query:
            return []
        
        # US Popular stocks
        us_stocks = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'GOOG': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'META': 'Meta Platforms Inc.',
            'NVDA': 'NVIDIA Corporation',
            'BRK.B': 'Berkshire Hathaway Inc.',
            'JPM': 'JPMorgan Chase & Co.',
            'V': 'Visa Inc.',
            'JNJ': 'Johnson & Johnson',
            'WMT': 'Walmart Inc.',
            'PG': 'Procter & Gamble Co.',
            'MA': 'Mastercard Inc.',
            'HD': 'Home Depot Inc.',
            'DIS': 'Walt Disney Co.',
            'NFLX': 'Netflix Inc.',
            'BAC': 'Bank of America Corp.',
            'ADBE': 'Adobe Inc.',
            'CSCO': 'Cisco Systems Inc.',
            'PFE': 'Pfizer Inc.',
            'KO': 'Coca-Cola Co.',
            'INTC': 'Intel Corporation',
            'NKE': 'Nike Inc.',
            'AMD': 'Advanced Micro Devices Inc.',
            'T': 'AT&T Inc.',
            'VZ': 'Verizon Communications Inc.',
            'PYPL': 'PayPal Holdings Inc.',
            'ORCL': 'Oracle Corporation',
            'IBM': 'International Business Machines Corp.',
            'BA': 'Boeing Co.',
            'GE': 'General Electric Co.',
            'F': 'Ford Motor Co.',
            'GM': 'General Motors Co.',
            'UBER': 'Uber Technologies Inc.',
            'LYFT': 'Lyft Inc.',
            'SNAP': 'Snap Inc.',
            'SQ': 'Block Inc.',
            'SHOP': 'Shopify Inc.',
        }
        
        # Indian NSE stocks (top 100+ stocks)
        nse_stocks = {
            'RELIANCE.NS': 'Reliance Industries Ltd.',
            'TCS.NS': 'Tata Consultancy Services Ltd.',
            'HDFCBANK.NS': 'HDFC Bank Ltd.',
            'INFY.NS': 'Infosys Ltd.',
            'ICICIBANK.NS': 'ICICI Bank Ltd.',
            'HINDUNILVR.NS': 'Hindustan Unilever Ltd.',
            'SBIN.NS': 'State Bank of India',
            'BHARTIARTL.NS': 'Bharti Airtel Ltd.',
            'ITC.NS': 'ITC Ltd.',
            'KOTAKBANK.NS': 'Kotak Mahindra Bank Ltd.',
            'LT.NS': 'Larsen & Toubro Ltd.',
            'HCLTECH.NS': 'HCL Technologies Ltd.',
            'AXISBANK.NS': 'Axis Bank Ltd.',
            'ASIANPAINT.NS': 'Asian Paints Ltd.',
            'MARUTI.NS': 'Maruti Suzuki India Ltd.',
            'SUNPHARMA.NS': 'Sun Pharmaceutical Industries Ltd.',
            'TITAN.NS': 'Titan Company Ltd.',
            'BAJFINANCE.NS': 'Bajaj Finance Ltd.',
            'DMART.NS': 'Avenue Supermarts Ltd. (DMart)',
            'ULTRACEMCO.NS': 'UltraTech Cement Ltd.',
            'WIPRO.NS': 'Wipro Ltd.',
            'ONGC.NS': 'Oil and Natural Gas Corporation Ltd.',
            'NTPC.NS': 'NTPC Ltd.',
            'POWERGRID.NS': 'Power Grid Corporation of India Ltd.',
            'M&M.NS': 'Mahindra & Mahindra Ltd.',
            'TATAMOTORS.NS': 'Tata Motors Ltd.',
            'TATASTEEL.NS': 'Tata Steel Ltd.',
            'JSWSTEEL.NS': 'JSW Steel Ltd.',
            'ADANIENT.NS': 'Adani Enterprises Ltd.',
            'ADANIPORTS.NS': 'Adani Ports and SEZ Ltd.',
            'COALINDIA.NS': 'Coal India Ltd.',
            'GRASIM.NS': 'Grasim Industries Ltd.',
            'BAJAJFINSV.NS': 'Bajaj Finserv Ltd.',
            'TECHM.NS': 'Tech Mahindra Ltd.',
            'NESTLEIND.NS': 'Nestle India Ltd.',
            'DIVISLAB.NS': 'Divi\'s Laboratories Ltd.',
            'DRREDDY.NS': 'Dr. Reddy\'s Laboratories Ltd.',
            'CIPLA.NS': 'Cipla Ltd.',
            'APOLLOHOSP.NS': 'Apollo Hospitals Enterprise Ltd.',
            'BRITANNIA.NS': 'Britannia Industries Ltd.',
            'EICHERMOT.NS': 'Eicher Motors Ltd.',
            'HEROMOTOCO.NS': 'Hero MotoCorp Ltd.',
            'BAJAJ-AUTO.NS': 'Bajaj Auto Ltd.',
            'SHREECEM.NS': 'Shree Cement Ltd.',
            'INDUSINDBK.NS': 'IndusInd Bank Ltd.',
            'SBILIFE.NS': 'SBI Life Insurance Company Ltd.',
            'HDFCLIFE.NS': 'HDFC Life Insurance Company Ltd.',
            'HINDALCO.NS': 'Hindalco Industries Ltd.',
            'BPCL.NS': 'Bharat Petroleum Corporation Ltd.',
            'IOC.NS': 'Indian Oil Corporation Ltd.',
            'TATACONSUM.NS': 'Tata Consumer Products Ltd.',
            'VEDL.NS': 'Vedanta Ltd.',
            'GAIL.NS': 'GAIL (India) Ltd.',
            'PIDILITIND.NS': 'Pidilite Industries Ltd.',
            'HAVELLS.NS': 'Havells India Ltd.',
            'DABUR.NS': 'Dabur India Ltd.',
            'GODREJCP.NS': 'Godrej Consumer Products Ltd.',
            'MARICO.NS': 'Marico Ltd.',
            'BERGEPAINT.NS': 'Berger Paints India Ltd.',
            'ICICIPRULI.NS': 'ICICI Prudential Life Insurance Co. Ltd.',
            'LTIM.NS': 'LTIMindtree Ltd.',
            'PERSISTENT.NS': 'Persistent Systems Ltd.',
            'COFORGE.NS': 'Coforge Ltd.',
            'MPHASIS.NS': 'Mphasis Ltd.',
            'ZOMATO.NS': 'Zomato Ltd.',
            'PAYTM.NS': 'One97 Communications Ltd. (Paytm)',
            'NYKAA.NS': 'FSN E-Commerce Ventures Ltd. (Nykaa)',
            'POLICYBZR.NS': 'PB Fintech Ltd. (PolicyBazaar)',
            'IRCTC.NS': 'Indian Railway Catering and Tourism Corp. Ltd.',
            'HAL.NS': 'Hindustan Aeronautics Ltd.',
            'BEL.NS': 'Bharat Electronics Ltd.',
            'BHEL.NS': 'Bharat Heavy Electricals Ltd.',
            'SAIL.NS': 'Steel Authority of India Ltd.',
            'NMDC.NS': 'NMDC Ltd.',
            'PNB.NS': 'Punjab National Bank',
            'BANKBARODA.NS': 'Bank of Baroda',
            'CANBK.NS': 'Canara Bank',
            'RECLTD.NS': 'REC Ltd.',
            'PFC.NS': 'Power Finance Corporation Ltd.',
            'NHPC.NS': 'NHPC Ltd.',
            'TATAPOWER.NS': 'Tata Power Company Ltd.',
            'ADANIGREEN.NS': 'Adani Green Energy Ltd.',
            'ADANIPOWER.NS': 'Adani Power Ltd.',
            'ATGL.NS': 'Adani Total Gas Ltd.',
            'AWL.NS': 'Adani Wilmar Ltd.',
            'AMBUJACEM.NS': 'Ambuja Cements Ltd.',
            'ACC.NS': 'ACC Ltd.',
            'DLF.NS': 'DLF Ltd.',
            'GODREJPROP.NS': 'Godrej Properties Ltd.',
            'OBEROIRLTY.NS': 'Oberoi Realty Ltd.',
            'PRESTIGE.NS': 'Prestige Estates Projects Ltd.',
            'LODHA.NS': 'Macrotech Developers Ltd. (Lodha)',
            'IDEA.NS': 'Vodafone Idea Ltd.',
            'TATACHEM.NS': 'Tata Chemicals Ltd.',
            'UPL.NS': 'UPL Ltd.',
            'SRF.NS': 'SRF Ltd.',
            'ATUL.NS': 'Atul Ltd.',
            'PIIND.NS': 'PI Industries Ltd.',
            'TRENT.NS': 'Trent Ltd.',
            'PAGEIND.NS': 'Page Industries Ltd.',
            'MANYAVAR.NS': 'Vedant Fashions Ltd. (Manyavar)',
        }
        
        # Indian BSE stocks (major stocks)
        bse_stocks = {
            'RELIANCE.BO': 'Reliance Industries Ltd.',
            'TCS.BO': 'Tata Consultancy Services Ltd.',
            'HDFCBANK.BO': 'HDFC Bank Ltd.',
            'INFY.BO': 'Infosys Ltd.',
            'ICICIBANK.BO': 'ICICI Bank Ltd.',
            'HINDUNILVR.BO': 'Hindustan Unilever Ltd.',
            'SBIN.BO': 'State Bank of India',
            'BHARTIARTL.BO': 'Bharti Airtel Ltd.',
            'ITC.BO': 'ITC Ltd.',
            'KOTAKBANK.BO': 'Kotak Mahindra Bank Ltd.',
            'LT.BO': 'Larsen & Toubro Ltd.',
            'HCLTECH.BO': 'HCL Technologies Ltd.',
            'AXISBANK.BO': 'Axis Bank Ltd.',
            'ASIANPAINT.BO': 'Asian Paints Ltd.',
            'MARUTI.BO': 'Maruti Suzuki India Ltd.',
            'SUNPHARMA.BO': 'Sun Pharmaceutical Industries Ltd.',
            'TITAN.BO': 'Titan Company Ltd.',
            'BAJFINANCE.BO': 'Bajaj Finance Ltd.',
            'DMART.BO': 'Avenue Supermarts Ltd. (DMart)',
            'ULTRACEMCO.BO': 'UltraTech Cement Ltd.',
            'WIPRO.BO': 'Wipro Ltd.',
            'TATAMOTORS.BO': 'Tata Motors Ltd.',
            'TATASTEEL.BO': 'Tata Steel Ltd.',
            'ADANIENT.BO': 'Adani Enterprises Ltd.',
            'COALINDIA.BO': 'Coal India Ltd.',
            'BAJAJFINSV.BO': 'Bajaj Finserv Ltd.',
            'TECHM.BO': 'Tech Mahindra Ltd.',
            'NESTLEIND.BO': 'Nestle India Ltd.',
            'DIVISLAB.BO': 'Divi\'s Laboratories Ltd.',
            'DRREDDY.BO': 'Dr. Reddy\'s Laboratories Ltd.',
        }
        
        # Indian indices
        indian_indices = {
            '^NSEI': 'Nifty 50 Index',
            '^BSESN': 'BSE Sensex Index',
            '^NSEBANK': 'Nifty Bank Index',
            'NIFTYBEES.NS': 'Nippon India Nifty BeES ETF',
            'BANKBEES.NS': 'Nippon India Bank BeES ETF',
            'GOLDBEES.NS': 'Nippon India Gold BeES ETF',
        }
        
        # US indices
        us_indices = {
            'SPY': 'SPDR S&P 500 ETF Trust',
            'QQQ': 'Invesco QQQ Trust',
            'DIA': 'SPDR Dow Jones Industrial Average ETF',
            'IWM': 'iShares Russell 2000 ETF',
            'VTI': 'Vanguard Total Stock Market ETF',
        }
        
        results = []
        query_lower = query.lower()
        query_upper = query.upper()
        
        # Build search dictionary based on exchange filter
        search_stocks = {}
        if exchange in ['all', 'us']:
            search_stocks.update(us_stocks)
            search_stocks.update(us_indices)
        if exchange in ['all', 'nse']:
            search_stocks.update(nse_stocks)
            search_stocks.update(indian_indices)
        if exchange in ['all', 'bse']:
            search_stocks.update(bse_stocks)
        
        # Search in predefined stocks
        for ticker, name in search_stocks.items():
            # Extract base ticker for matching (e.g., RELIANCE from RELIANCE.NS)
            base_ticker = ticker.split('.')[0]
            if query_lower in base_ticker.lower() or query_lower in name.lower():
                # Determine exchange
                if ticker.endswith('.NS'):
                    exch = 'NSE'
                elif ticker.endswith('.BO'):
                    exch = 'BSE'
                elif ticker.startswith('^'):
                    exch = 'Index'
                else:
                    exch = 'NASDAQ/NYSE'
                
                results.append({
                    "ticker": ticker,
                    "name": name,
                    "exchange": exch
                })
        
        # If no results in predefined stocks, try fetching from Yahoo Finance
        if not results:
            # Try different suffixes based on exchange filter
            suffixes_to_try = []
            if exchange in ['all', 'us']:
                suffixes_to_try.append('')  # US stocks
            if exchange in ['all', 'nse']:
                suffixes_to_try.append('.NS')  # NSE
            if exchange in ['all', 'bse']:
                suffixes_to_try.append('.BO')  # BSE
            
            for suffix in suffixes_to_try:
                ticker_to_try = query_upper + suffix
                
                def get_ticker_info(t):
                    stock = yf.Ticker(t)
                    info = stock.info
                    return info
                
                try:
                    info = await run_in_threadpool(get_ticker_info, ticker_to_try)
                    
                    if info and 'symbol' in info and info.get('regularMarketPrice'):
                        exch = info.get('exchange', '')
                        if suffix == '.NS':
                            exch = 'NSE'
                        elif suffix == '.BO':
                            exch = 'BSE'
                        
                        results.append({
                            "ticker": info.get('symbol', ticker_to_try),
                            "name": info.get('longName', info.get('shortName', ticker_to_try)),
                            "exchange": exch
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch info for {ticker_to_try}: {str(e)}")
        
        # Remove duplicates and limit to top 15 results
        seen = set()
        unique_results = []
        for r in results:
            if r['ticker'] not in seen:
                seen.add(r['ticker'])
                unique_results.append(r)
        
        return unique_results[:15]
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return []


# Get stock quote
@api_router.get("/stocks/{ticker}/quote", response_model=StockQuote)
async def get_stock_quote(ticker: str):
    """Get current stock quote"""
    try:
        def fetch_quote():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            hist = stock.history(period="1d")
            
            if hist.empty:
                raise ValueError("No data available")
            
            current_price = info.get('currentPrice', hist['Close'].iloc[-1])
            previous_close = info.get('previousClose', info.get('regularMarketPreviousClose', current_price))
            
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else 0
            
            # Get day's open, high, low from today's data
            day_open = info.get('open', hist['Open'].iloc[-1] if not hist.empty else None)
            day_high = info.get('dayHigh', hist['High'].iloc[-1] if not hist.empty else None)
            day_low = info.get('dayLow', hist['Low'].iloc[-1] if not hist.empty else None)
            
            # Get P/E ratio and dividend yield
            pe_ratio = info.get('trailingPE', info.get('forwardPE'))
            dividend_yield = info.get('dividendYield')
            
            # Get market state
            market_state = info.get('marketState', 'CLOSED')
            
            # Get pre-market data
            pre_market_price = info.get('preMarketPrice')
            pre_market_change = info.get('preMarketChange')
            pre_market_change_percent = info.get('preMarketChangePercent')
            
            # Get after-hours (post-market) data
            post_market_price = info.get('postMarketPrice')
            post_market_change = info.get('postMarketChange')
            post_market_change_percent = info.get('postMarketChangePercent')
            
            return {
                "ticker": ticker.upper(),
                "price": float(current_price),
                "change": float(change),
                "change_percent": float(change_percent),
                "volume": info.get('volume'),
                "market_cap": info.get('marketCap'),
                "high_52week": info.get('fiftyTwoWeekHigh'),
                "low_52week": info.get('fiftyTwoWeekLow'),
                "company_name": info.get('longName', info.get('shortName', ticker.upper())),
                "currency": info.get('currency', 'USD'),
                "day_open": float(day_open) if day_open else None,
                "day_high": float(day_high) if day_high else None,
                "day_low": float(day_low) if day_low else None,
                "pe_ratio": float(pe_ratio) if pe_ratio else None,
                "dividend_yield": float(dividend_yield * 100) if dividend_yield else None,
                "market_state": market_state,
                "pre_market": {
                    "price": float(pre_market_price) if pre_market_price else None,
                    "change": float(pre_market_change) if pre_market_change else None,
                    "change_percent": float(pre_market_change_percent * 100) if pre_market_change_percent else None
                } if pre_market_price else None,
                "post_market": {
                    "price": float(post_market_price) if post_market_price else None,
                    "change": float(post_market_change) if post_market_change else None,
                    "change_percent": float(post_market_change_percent * 100) if post_market_change_percent else None
                } if post_market_price else None
            }
        
        quote_data = await run_in_threadpool(fetch_quote)
        return quote_data
        
    except Exception as e:
        logger.error(f"Quote error for {ticker}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found or data unavailable")


# Get historical data
@api_router.get("/stocks/{ticker}/history", response_model=List[HistoricalData])
async def get_stock_history(ticker: str, period: str = "1y"):
    """Get historical stock data"""
    try:
        def fetch_history():
            stock = yf.Ticker(ticker.upper())
            hist = stock.history(period=period)
            
            if hist.empty:
                raise ValueError("No historical data available")
            
            return [
                {
                    "date": date.strftime('%Y-%m-%d'),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume'])
                }
                for date, row in hist.iterrows()
            ]
        
        history = await run_in_threadpool(fetch_history)
        return history
        
    except Exception as e:
        logger.error(f"History error for {ticker}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Historical data for {ticker} not available")


# Get earnings report link
@api_router.get("/stocks/{ticker}/earnings-link")
async def get_earnings_link(ticker: str):
    """Get link to latest earnings report"""
    try:
        def fetch_earnings_info():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            
            # Yahoo Finance earnings page
            earnings_url = f"https://finance.yahoo.com/quote/{ticker.upper()}/financials"
            
            return {
                "ticker": ticker.upper(),
                "earnings_url": earnings_url,
                "company_name": info.get('longName', info.get('shortName', ticker.upper()))
            }
        
        earnings_info = await run_in_threadpool(fetch_earnings_info)
        return earnings_info
        
    except Exception as e:
        logger.error(f"Earnings link error for {ticker}: {str(e)}")
        return {
            "ticker": ticker.upper(),
            "earnings_url": f"https://finance.yahoo.com/quote/{ticker.upper()}/financials",
            "company_name": ticker.upper()
        }


@api_router.get("/stocks/{ticker}/earnings-snapshot")
async def get_earnings_snapshot(ticker: str):
    """Get earnings snapshot with key financial metrics"""
    try:
        def fetch_earnings_snapshot():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            
            # Get financial data
            capex = info.get('capitalExpenditures')
            free_cash_flow = info.get('freeCashflow')
            gross_margins = info.get('grossMargins')
            return_on_equity = info.get('returnOnEquity')
            
            # Get earnings estimates
            earnings_estimate = info.get('earningsQuarterlyGrowth')
            revenue_estimate = info.get('revenueGrowth')
            target_mean_price = info.get('targetMeanPrice')
            recommendation = info.get('recommendationKey', 'N/A')
            
            # Additional useful metrics
            operating_margins = info.get('operatingMargins')
            profit_margins = info.get('profitMargins')
            revenue = info.get('totalRevenue')
            net_income = info.get('netIncomeToCommon')
            
            return {
                "ticker": ticker.upper(),
                "capex": capex,
                "free_cash_flow": free_cash_flow,
                "gross_margin": float(gross_margins * 100) if gross_margins else None,
                "operating_margin": float(operating_margins * 100) if operating_margins else None,
                "profit_margin": float(profit_margins * 100) if profit_margins else None,
                "return_on_equity": float(return_on_equity * 100) if return_on_equity else None,
                "earnings_growth": float(earnings_estimate * 100) if earnings_estimate else None,
                "revenue_growth": float(revenue_estimate * 100) if revenue_estimate else None,
                "target_price": target_mean_price,
                "recommendation": recommendation.upper() if recommendation else 'N/A',
                "revenue": revenue,
                "net_income": net_income
            }
        
        snapshot = await run_in_threadpool(fetch_earnings_snapshot)
        return snapshot
        
    except Exception as e:
        logger.error(f"Earnings snapshot error for {ticker}: {str(e)}")
        return {
            "ticker": ticker.upper(),
            "capex": None,
            "free_cash_flow": None,
            "gross_margin": None,
            "operating_margin": None,
            "profit_margin": None,
            "return_on_equity": None,
            "earnings_growth": None,
            "revenue_growth": None,
            "target_price": None,
            "recommendation": "N/A",
            "revenue": None,
            "net_income": None
        }


@api_router.get("/stocks/{ticker}/health-report")
async def get_stock_health_report(ticker: str):
    """Get comprehensive 8-Quarter Strategic Investment Health Report"""
    try:
        def fetch_health_report():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            
            # Get quarterly financials
            quarterly_financials = stock.quarterly_financials
            quarterly_cashflow = stock.quarterly_cashflow
            
            # Initialize quarters data
            quarters_data = []
            
            # Get up to 8 quarters of data
            if quarterly_financials is not None and not quarterly_financials.empty:
                for i, col in enumerate(quarterly_financials.columns[:8]):
                    # Format quarter with date range
                    if hasattr(col, 'strftime'):
                        quarter_end = col
                        quarter_month = quarter_end.month
                        quarter_year = quarter_end.strftime('%Y')
                        
                        # Determine quarter and date range
                        if quarter_month in [1, 2, 3]:
                            quarter_label = f"Q1 {quarter_year} (Jan-Mar)"
                        elif quarter_month in [4, 5, 6]:
                            quarter_label = f"Q2 {quarter_year} (Apr-Jun)"
                        elif quarter_month in [7, 8, 9]:
                            quarter_label = f"Q3 {quarter_year} (Jul-Sep)"
                        else:
                            quarter_label = f"Q4 {quarter_year} (Oct-Dec)"
                    else:
                        quarter_label = str(col)[:7]
                    
                    # Revenue
                    revenue = quarterly_financials.loc['Total Revenue', col] if 'Total Revenue' in quarterly_financials.index else None
                    
                    # Gross Profit & Margin
                    gross_profit = quarterly_financials.loc['Gross Profit', col] if 'Gross Profit' in quarterly_financials.index else None
                    gross_margin = (gross_profit / revenue * 100) if revenue and gross_profit else None
                    
                    # Operating Income & Margin
                    operating_income = quarterly_financials.loc['Operating Income', col] if 'Operating Income' in quarterly_financials.index else None
                    op_margin = (operating_income / revenue * 100) if revenue and operating_income else None
                    
                    # Net Income
                    net_income = quarterly_financials.loc['Net Income', col] if 'Net Income' in quarterly_financials.index else None
                    
                    # Free Cash Flow from cashflow statement
                    fcf = None
                    if quarterly_cashflow is not None and not quarterly_cashflow.empty and col in quarterly_cashflow.columns:
                        op_cashflow = quarterly_cashflow.loc['Operating Cash Flow', col] if 'Operating Cash Flow' in quarterly_cashflow.index else None
                        capex = quarterly_cashflow.loc['Capital Expenditure', col] if 'Capital Expenditure' in quarterly_cashflow.index else None
                        if op_cashflow is not None and capex is not None:
                            fcf = op_cashflow + capex  # capex is negative
                    
                    quarters_data.append({
                        "quarter": quarter_label,
                        "date": col.isoformat() if hasattr(col, 'isoformat') else str(col),
                        "revenue": float(revenue) if revenue else None,
                        "gross_margin": round(float(gross_margin), 1) if gross_margin else None,
                        "op_margin": round(float(op_margin), 1) if op_margin else None,
                        "net_income": float(net_income) if net_income else None,
                        "fcf": float(fcf) if fcf else None,
                    })
            
            # Sort quarters in descending order (most recent first)
            quarters_data.sort(key=lambda x: x.get('date', ''), reverse=True)
            
            # Get current metrics from info
            current_metrics = {
                "market_cap": info.get('marketCap'),
                "pe_ratio": info.get('forwardPE'),
                "debt_to_equity": info.get('debtToEquity'),
                "current_ratio": info.get('currentRatio'),
                "roic": info.get('returnOnAssets', 0) * 100 if info.get('returnOnAssets') else None,
                "roe": info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else None,
                "revenue_growth": info.get('revenueGrowth', 0) * 100 if info.get('revenueGrowth') else None,
                "earnings_growth": info.get('earningsQuarterlyGrowth', 0) * 100 if info.get('earningsQuarterlyGrowth') else None,
                "shares_outstanding": info.get('sharesOutstanding'),
                "float_shares": info.get('floatShares'),
                "held_by_institutions": info.get('heldPercentInstitutions', 0) * 100 if info.get('heldPercentInstitutions') else None,
                "short_ratio": info.get('shortRatio'),
                "beta": info.get('beta'),
                "target_price": info.get('targetMeanPrice'),
                "recommendation": info.get('recommendationKey', 'N/A'),
                "analyst_count": info.get('numberOfAnalystOpinions'),
                "sector": info.get('sector'),
                "industry": info.get('industry'),
            }
            
            # Calculate trend indicators
            trends = {}
            if len(quarters_data) >= 2:
                # Revenue trend
                revenues = [q['revenue'] for q in quarters_data if q['revenue']]
                if len(revenues) >= 2:
                    trends['revenue_trend'] = 'accelerating' if revenues[0] > revenues[1] else 'decelerating'
                
                # Margin trends
                margins = [q['gross_margin'] for q in quarters_data if q['gross_margin']]
                if len(margins) >= 2:
                    trends['margin_trend'] = 'improving' if margins[0] > margins[1] else 'declining'
                
                # FCF Quality
                fcfs = [q['fcf'] for q in quarters_data if q['fcf']]
                net_incomes = [q['net_income'] for q in quarters_data if q['net_income']]
                if fcfs and net_incomes:
                    fcf_quality = sum(fcfs) / sum(net_incomes) if sum(net_incomes) != 0 else 0
                    trends['fcf_quality'] = 'strong' if fcf_quality > 0.8 else 'moderate' if fcf_quality > 0.5 else 'weak'
            
            # Risk assessment (simplified)
            risk_scores = {
                "regulatory_risk": 3 if info.get('sector') in ['Technology', 'Healthcare', 'Financial Services'] else 2,
                "concentration_risk": 5 if current_metrics.get('held_by_institutions', 0) > 80 else 3,
                "debt_risk": min(10, int((info.get('debtToEquity', 0) or 0) / 50)) if info.get('debtToEquity') else 2,
            }
            
            # Sentiment assessment
            sentiment = {
                "institutional": 'bullish' if current_metrics.get('held_by_institutions', 0) > 60 else 'neutral',
                "analyst": 'bullish' if current_metrics.get('recommendation', '').lower() in ['buy', 'strong_buy'] else 'bearish' if current_metrics.get('recommendation', '').lower() in ['sell', 'strong_sell'] else 'neutral',
            }
            
            # Overall verdict
            score = 0
            if trends.get('revenue_trend') == 'accelerating':
                score += 2
            if trends.get('margin_trend') == 'improving':
                score += 2
            if trends.get('fcf_quality') == 'strong':
                score += 2
            if current_metrics.get('roe', 0) > 15:
                score += 1
            if current_metrics.get('debt_to_equity', 100) < 100:
                score += 1
            if sentiment.get('analyst') == 'bullish':
                score += 2
            
            verdict = 'BUY' if score >= 7 else 'HOLD' if score >= 4 else 'AVOID'
            
            return {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "audit_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                "quarters": quarters_data,
                "current_metrics": current_metrics,
                "trends": trends,
                "risk_scores": risk_scores,
                "sentiment": sentiment,
                "verdict": verdict,
                "score": score,
            }
        
        report = await run_in_threadpool(fetch_health_report)
        return report
        
    except Exception as e:
        logger.error(f"Health report error for {ticker}: {str(e)}")
        return {
            "ticker": ticker.upper(),
            "company_name": ticker.upper(),
            "audit_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            "quarters": [],
            "current_metrics": {},
            "trends": {},
            "risk_scores": {},
            "sentiment": {},
            "verdict": "N/A",
            "score": 0,
            "error": str(e)
        }


# Get stock news
@api_router.get("/stocks/{ticker}/news", response_model=List[NewsArticle])
async def get_stock_news(ticker: str):
    """Get top 3 news articles for a stock"""
    try:
        def fetch_news():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            company_name = info.get('longName', info.get('shortName', ticker.upper()))
            
            # Try to get news from the stock object
            articles = []
            try:
                news_data = stock.news
                
                if news_data and len(news_data) > 0:
                    for item in news_data[:5]:  # Check more items to get 3 valid ones
                        try:
                            # Handle new yfinance structure where data is nested in 'content'
                            content = item.get('content', item)
                            
                            title = content.get('title', '')
                            if not title:
                                continue
                            
                            # Create summary from title or description
                            summary = content.get('summary', content.get('description', ''))
                            if not summary:
                                summary = title[:100] + '...' if len(title) > 100 else title
                            
                            # Get publisher from provider object or direct field
                            provider = content.get('provider', {})
                            publisher = provider.get('displayName', item.get('publisher', 'Financial News'))
                            
                            # Get link from canonicalUrl or clickThroughUrl
                            canonical_url = content.get('canonicalUrl', {})
                            click_url = content.get('clickThroughUrl', {})
                            link = canonical_url.get('url') or click_url.get('url') or item.get('link', f"https://finance.yahoo.com/quote/{ticker.upper()}/news")
                            
                            # Get published date from pubDate or providerPublishTime
                            pub_date_str = content.get('pubDate', '')
                            if pub_date_str:
                                try:
                                    from dateutil import parser
                                    pub_date = parser.parse(pub_date_str)
                                    published_date = pub_date.strftime('%B %d, %Y')
                                except Exception:
                                    published_date = datetime.now(timezone.utc).strftime('%B %d, %Y')
                            else:
                                published_time = item.get('providerPublishTime', 0)
                                if published_time:
                                    published_date = datetime.fromtimestamp(published_time).strftime('%B %d, %Y')
                                else:
                                    published_date = datetime.now(timezone.utc).strftime('%B %d, %Y')
                            
                            # Get thumbnail from nested structure
                            thumbnail = None
                            thumb_data = content.get('thumbnail', item.get('thumbnail'))
                            if thumb_data:
                                resolutions = thumb_data.get('resolutions', [])
                                if resolutions and len(resolutions) > 0:
                                    # Try to get a medium-sized thumbnail
                                    for res in resolutions:
                                        if res.get('tag') in ['170x128', '140x140']:
                                            thumbnail = res.get('url')
                                            break
                                    if not thumbnail:
                                        thumbnail = resolutions[0].get('url')
                                elif thumb_data.get('originalUrl'):
                                    thumbnail = thumb_data.get('originalUrl')
                            
                            articles.append({
                                'title': title,
                                'publisher': publisher,
                                'link': link,
                                'published_date': published_date,
                                'thumbnail': thumbnail,
                                'summary': summary[:200] + '...' if len(summary) > 200 else summary
                            })
                            
                            if len(articles) >= 3:
                                break
                        except Exception as e:
                            logger.warning(f"Error parsing news item: {str(e)}")
                            continue
            except Exception as e:
                logger.warning(f"Could not fetch news from yfinance: {str(e)}")
            
            # If no articles found, create fallback articles
            if not articles:
                logger.info(f"No yfinance news found for {ticker}, using fallback")
                today = datetime.now(timezone.utc).strftime('%B %d, %Y')
                
                articles = [
                    {
                        'title': f'{company_name} Stock Analysis and Market Overview',
                        'publisher': 'Yahoo Finance',
                        'link': f'https://finance.yahoo.com/quote/{ticker.upper()}/news',
                        'published_date': today,
                        'thumbnail': None,
                        'summary': f'Latest market analysis, earnings reports, and financial news for {company_name}. Click to read more on Yahoo Finance.'
                    },
                    {
                        'title': f'{company_name} Financial Performance and Outlook',
                        'publisher': 'Market Watch',
                        'link': f'https://www.marketwatch.com/investing/stock/{ticker.lower()}',
                        'published_date': today,
                        'thumbnail': None,
                        'summary': f'Comprehensive coverage of {company_name} stock performance, analyst ratings, and market trends.'
                    },
                    {
                        'title': f'{company_name} Latest Updates and Investor Information',
                        'publisher': 'Seeking Alpha',
                        'link': f'https://seekingalpha.com/symbol/{ticker.upper()}',
                        'published_date': today,
                        'thumbnail': None,
                        'summary': f'Expert analysis and breaking news about {company_name}. Stay informed with the latest updates and investment insights.'
                    }
                ]
            
            return articles
        
        articles = await run_in_threadpool(fetch_news)
        return articles
        
    except Exception as e:
        logger.error(f"News error for {ticker}: {str(e)}")
        # Return empty list on error
        return []


# Pinned stocks endpoints
@api_router.post("/pinned-stocks", response_model=PinnedStock)
async def pin_stock(input: PinnedStockCreate):
    """Pin a stock"""
    # Check if already pinned
    existing = await db.pinned_stocks.find_one(
        {"ticker": input.ticker.upper()},
        {"_id": 0}
    )
    
    if existing:
        if isinstance(existing['pinned_at'], str):
            existing['pinned_at'] = datetime.fromisoformat(existing['pinned_at'])
        return PinnedStock(**existing)
    
    pinned_dict = input.model_dump()
    pinned_dict['ticker'] = pinned_dict['ticker'].upper()
    pinned_obj = PinnedStock(**pinned_dict)
    
    doc = pinned_obj.model_dump()
    doc['pinned_at'] = doc['pinned_at'].isoformat()
    
    await db.pinned_stocks.insert_one(doc)
    return pinned_obj


@api_router.get("/pinned-stocks", response_model=List[PinnedStock])
async def get_pinned_stocks():
    """Get all pinned stocks"""
    pinned_stocks = await db.pinned_stocks.find({}, {"_id": 0}).to_list(1000)
    
    for stock in pinned_stocks:
        if isinstance(stock['pinned_at'], str):
            stock['pinned_at'] = datetime.fromisoformat(stock['pinned_at'])
    
    return pinned_stocks


@api_router.delete("/pinned-stocks/{ticker}")
async def unpin_stock(ticker: str):
    """Unpin a stock"""
    result = await db.pinned_stocks.delete_one({"ticker": ticker.upper()})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock not found in pinned list")
    
    return {"message": f"Stock {ticker.upper()} unpinned successfully"}


# AI Analysis endpoint
@api_router.get("/stocks/{ticker}/ai-analysis")
async def get_ai_analysis(ticker: str):
    """Get AI-powered analysis of stock based on earnings reports"""
    try:
        def fetch_earnings_data():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            
            # Get quarterly earnings and financials
            try:
                quarterly_financials = stock.quarterly_financials
                quarterly_financials_dict = quarterly_financials.to_dict() if quarterly_financials is not None and not quarterly_financials.empty else {}
            except Exception as e:
                logger.warning(f"Could not fetch quarterly financials: {str(e)}")
                quarterly_financials_dict = {}
            
            try:
                income_stmt = stock.quarterly_income_stmt
                income_stmt_dict = income_stmt.to_dict() if income_stmt is not None and not income_stmt.empty else {}
            except Exception as e:
                logger.warning(f"Could not fetch income statement: {str(e)}")
                income_stmt_dict = {}
            
            # Get company info
            company_name = info.get('longName', info.get('shortName', ticker.upper()))
            sector = info.get('sector', 'N/A')
            industry = info.get('industry', 'N/A')
            
            return {
                'company_name': company_name,
                'sector': sector,
                'industry': industry,
                'quarterly_financials': quarterly_financials_dict,
                'income_stmt': income_stmt_dict,
                'info': {
                    'currentPrice': info.get('currentPrice'),
                    'targetMeanPrice': info.get('targetMeanPrice'),
                    'targetHighPrice': info.get('targetHighPrice'),
                    'targetLowPrice': info.get('targetLowPrice'),
                    'recommendationKey': info.get('recommendationKey'),
                    'numberOfAnalystOpinions': info.get('numberOfAnalystOpinions'),
                    'earningsGrowth': info.get('earningsGrowth'),
                    'revenueGrowth': info.get('revenueGrowth'),
                }
            }
        
        # Fetch earnings data
        earnings_data = await run_in_threadpool(fetch_earnings_data)
        
        # Prepare prompt for LLM
        prompt = f"""Analyze the stock {ticker.upper()} ({earnings_data['company_name']}) based on the following financial data:

Sector: {earnings_data['sector']}
Industry: {earnings_data['industry']}
Current Price: ${earnings_data['info']['currentPrice']}

Recent Quarterly Financial Data:
{str(earnings_data['quarterly_financials'])[:1500]}

Income Statement Data:
{str(earnings_data['income_stmt'])[:1500]}

Analyst Data:
- Mean Price Target: ${earnings_data['info']['targetMeanPrice']}
- High Price Target: ${earnings_data['info']['targetHighPrice']}
- Low Price Target: ${earnings_data['info']['targetLowPrice']}
- Recommendation: {earnings_data['info']['recommendationKey']}
- Number of Analysts: {earnings_data['info']['numberOfAnalystOpinions']}
- Earnings Growth: {earnings_data['info']['earningsGrowth']}
- Revenue Growth: {earnings_data['info']['revenueGrowth']}

Please provide:
1. **Earnings Report Summary**: Review the latest financial data and provide details on quarterly and yearly guidance based on available metrics (revenue, earnings, growth rates).

2. **Bull and Bear Case Price Targets**: Based on the financial data and analyst opinions, provide:
   - **Bull Case**: Next Quarter, 6 Months, 1 Year, 2 Years
   - **Bear Case**: Next Quarter, 6 Months, 1 Year, 2 Years

Format your response in clear sections with specific price targets and brief reasoning for each."""

        # Initialize LLM chat with Emergent LLM Key
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        if not llm_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"stock-analysis-{ticker.upper()}",
            system_message="You are a professional financial analyst with expertise in stock analysis and earnings reports. Provide clear, data-driven insights."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        return {
            "ticker": ticker.upper(),
            "company_name": earnings_data['company_name'],
            "analysis": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"AI Analysis error for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


# Bull vs Bear Sentiment endpoint
@api_router.get("/stocks/{ticker}/bull-bear-sentiment")
async def get_bull_bear_sentiment(ticker: str):
    """Get AI-generated bull and bear sentiment analysis"""
    try:
        def fetch_stock_data():
            stock = yf.Ticker(ticker.upper())
            info = stock.info
            
            company_name = info.get('longName', info.get('shortName', ticker.upper()))
            current_price = info.get('currentPrice', info.get('regularMarketPrice'))
            
            return {
                'company_name': company_name,
                'current_price': current_price,
                'sector': info.get('sector', 'N/A'),
                'industry': info.get('industry', 'N/A'),
                'market_cap': info.get('marketCap'),
                'pe_ratio': info.get('trailingPE'),
                'earnings_growth': info.get('earningsGrowth'),
                'revenue_growth': info.get('revenueGrowth'),
                'profit_margin': info.get('profitMargins'),
                'debt_to_equity': info.get('debtToEquity'),
                'recommendation': info.get('recommendationKey'),
                'target_mean': info.get('targetMeanPrice'),
            }
        
        # Fetch stock data
        stock_data = await run_in_threadpool(fetch_stock_data)
        
        # Prepare prompt for LLM
        prompt = f"""Analyze {ticker.upper()} ({stock_data['company_name']}) and provide bull and bear sentiment analysis.

Current Data:
- Price: ${stock_data['current_price']}
- Sector: {stock_data['sector']}
- P/E Ratio: {stock_data['pe_ratio']}
- Earnings Growth: {stock_data['earnings_growth']}
- Revenue Growth: {stock_data['revenue_growth']}
- Analyst Recommendation: {stock_data['recommendation']}

Provide EXACTLY 3 concise bullet points for bull case and 3 for bear case. Each bullet should be 1-2 sentences max, focusing on key factors verified by market data.

Format as:
BULL:
• [Point 1]
• [Point 2]
• [Point 3]

BEAR:
• [Point 1]
• [Point 2]
• [Point 3]"""

        # Initialize LLM chat with Emergent LLM Key
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        if not llm_key:
            return {
                "ticker": ticker.upper(),
                "company_name": stock_data['company_name'],
                "bull_points": [
                    "Strong market position in growing sector",
                    "Positive analyst sentiment with buy recommendations",
                    "Solid fundamentals with healthy profit margins"
                ],
                "bear_points": [
                    "Market volatility may impact short-term performance",
                    "High valuation relative to sector peers",
                    "Economic headwinds could affect growth trajectory"
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": "Default analysis provided - AI service unavailable"
            }
        
        try:
            chat = LlmChat(
                api_key=llm_key,
                session_id=f"bull-bear-{ticker.upper()}",
                system_message="You are a financial analyst. Provide concise, factual bull and bear arguments."
            ).with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse response to extract bull and bear points
            lines = response.split('\n')
            bull_points = []
            bear_points = []
            current_section = None
            
            for line in lines:
                line = line.strip()
                if 'BULL' in line.upper():
                    current_section = 'bull'
                elif 'BEAR' in line.upper():
                    current_section = 'bear'
                elif line.startswith('•') or line.startswith('-'):
                    point = line.lstrip('•-').strip()
                    if point and current_section == 'bull' and len(bull_points) < 3:
                        bull_points.append(point)
                    elif point and current_section == 'bear' and len(bear_points) < 3:
                        bear_points.append(point)
            
            # Ensure we have 3 points each
            while len(bull_points) < 3:
                bull_points.append("Positive market indicators support growth potential")
            while len(bear_points) < 3:
                bear_points.append("Market uncertainties may present challenges")
            
            return {
                "ticker": ticker.upper(),
                "company_name": stock_data['company_name'],
                "bull_points": bull_points[:3],
                "bear_points": bear_points[:3],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.warning(f"AI generation failed, using fallback: {str(e)}")
            return {
                "ticker": ticker.upper(),
                "company_name": stock_data['company_name'],
                "bull_points": [
                    f"Strong position in {stock_data['sector']} sector with growth potential",
                    f"Analyst consensus of '{stock_data['recommendation']}' suggests positive outlook",
                    "Current valuation presents opportunity for long-term investors"
                ],
                "bear_points": [
                    "Market volatility may impact near-term price action",
                    "Competitive pressures in the industry require monitoring",
                    "Macroeconomic factors could affect overall performance"
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": "Fallback analysis provided"
            }
        
    except Exception as e:
        logger.error(f"Bull/Bear sentiment error for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")


# Get stocks by category endpoint
@api_router.get("/stocks/category/{category_name}")
async def get_stocks_by_category(category_name: str):
    """Get top 10 stocks by category"""
    try:
        # Check if it's a custom category (starts with 'custom-')
        if category_name.startswith('custom-'):
            category_id = category_name.replace('custom-', '')
            custom_category = await db.custom_categories.find_one(
                {"id": category_id},
                {"_id": 0}
            )
            
            if not custom_category:
                raise HTTPException(status_code=404, detail="Custom category not found")
            
            tickers = custom_category['tickers']
            category_display_name = custom_category['name']
        else:
            # Define stock categories with top stocks
            categories = {
                # US Categories
                'finance': [
                    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'AXP', 'V'
                ],
                'technology': [
                    'AAPL', 'MSFT', 'GOOGL', 'META', 'ORCL', 'ADBE', 'CRM', 'INTC', 'CSCO', 'IBM'
                ],
                'ai': [
                    'NVDA', 'MSFT', 'GOOGL', 'META', 'ORCL', 'AMD', 'PLTR', 'SNOW', 'AI', 'PATH'
                ],
                'semiconductor': [
                    'NVDA', 'TSM', 'AVGO', 'AMD', 'INTC', 'QCOM', 'TXN', 'AMAT', 'ADI', 'MU'
                ],
                'fmcg': [
                    'PG', 'KO', 'PEP', 'COST', 'WMT', 'MDLZ', 'CL', 'KMB', 'GIS', 'K'
                ],
                'materials': [
                    'LIN', 'APD', 'SHW', 'ECL', 'DD', 'NEM', 'FCX', 'NUE', 'VMC', 'MLM'
                ],
                'healthcare': [
                    'UNH', 'JNJ', 'PFE', 'MRK', 'ABBV', 'TMO', 'ABT', 'DHR', 'BMY', 'LLY'
                ],
                'energy': [
                    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL'
                ],
                'consumer-discretionary': [
                    'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'LOW', 'BKNG', 'CMG'
                ],
                # Indian NSE Categories
                'nifty50': [
                    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
                    'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS'
                ],
                'nifty-it': [
                    'TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS', 'TECHM.NS',
                    'LTIM.NS', 'PERSISTENT.NS', 'COFORGE.NS', 'MPHASIS.NS', 'OFSS.NS'
                ],
                'nifty-bank': [
                    'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS',
                    'INDUSINDBK.NS', 'BANDHANBNK.NS', 'FEDERALBNK.NS', 'IDFCFIRSTB.NS', 'PNB.NS'
                ],
                'nifty-pharma': [
                    'SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS',
                    'TORNTPHARM.NS', 'LUPIN.NS', 'ALKEM.NS', 'AUROPHARMA.NS', 'BIOCON.NS'
                ],
                'nifty-auto': [
                    'TATAMOTORS.NS', 'M&M.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS',
                    'EICHERMOT.NS', 'ASHOKLEY.NS', 'TVSMOTOR.NS', 'BOSCHLTD.NS', 'MOTHERSON.NS'
                ],
                'nifty-fmcg': [
                    'HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'TATACONSUM.NS',
                    'DABUR.NS', 'GODREJCP.NS', 'MARICO.NS', 'COLPAL.NS', 'VBL.NS'
                ],
                'nifty-metal': [
                    'TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'VEDL.NS', 'COALINDIA.NS',
                    'NMDC.NS', 'SAIL.NS', 'NATIONALUM.NS', 'JINDALSTEL.NS', 'APLAPOLLO.NS'
                ],
                'nifty-realty': [
                    'DLF.NS', 'GODREJPROP.NS', 'OBEROIRLTY.NS', 'PRESTIGE.NS', 'LODHA.NS',
                    'PHOENIXLTD.NS', 'BRIGADE.NS', 'SOBHA.NS', 'SUNTECK.NS', 'MAHLIFE.NS'
                ],
                'nifty-psu': [
                    'SBIN.NS', 'ONGC.NS', 'NTPC.NS', 'POWERGRID.NS', 'COALINDIA.NS',
                    'BPCL.NS', 'IOC.NS', 'GAIL.NS', 'HAL.NS', 'BEL.NS'
                ],
                'adani-group': [
                    'ADANIENT.NS', 'ADANIPORTS.NS', 'ADANIGREEN.NS', 'ADANIPOWER.NS', 'ATGL.NS',
                    'AWL.NS', 'ADANITRANS.NS', 'ACC.NS', 'AMBUJACEM.NS', 'NDTV.NS'
                ],
                'tata-group': [
                    'TCS.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS', 'TATAPOWER.NS', 'TITAN.NS',
                    'TATACONSUM.NS', 'TATACHEM.NS', 'TATAELXSI.NS', 'TATACOMM.NS', 'VOLTAS.NS'
                ],
                'new-age-tech': [
                    'ZOMATO.NS', 'PAYTM.NS', 'NYKAA.NS', 'POLICYBZR.NS', 'DELHIVERY.NS',
                    'CARTRADE.NS', 'EASEMYTRIP.NS', 'IRCTC.NS', 'RAILTEL.NS', 'ROUTE.NS'
                ],
            }
            
            category_lower = category_name.lower()
            
            if category_lower not in categories:
                raise HTTPException(status_code=404, detail=f"Category {category_name} not found")
            
            tickers = categories[category_lower]
            category_display_name = category_name
        
        # Fetch basic info for each stock
        async def fetch_stock_info(ticker):
            try:
                def get_info():
                    stock = yf.Ticker(ticker)
                    info = stock.info
                    hist_1d = stock.history(period="1d")
                    
                    # Get 1 year historical data for sparkline
                    hist_1y = stock.history(period="1y")
                    
                    current_price = info.get('currentPrice', hist_1d['Close'].iloc[-1] if not hist_1d.empty else 0)
                    previous_close = info.get('previousClose', info.get('regularMarketPreviousClose', current_price))
                    
                    change = current_price - previous_close
                    change_percent = (change / previous_close * 100) if previous_close else 0
                    
                    # Prepare sparkline data (sample every 7 days to keep it light)
                    sparkline_data = []
                    if not hist_1y.empty:
                        # Sample every 7 days for ~52 data points
                        step = max(1, len(hist_1y) // 52)
                        for i in range(0, len(hist_1y), step):
                            sparkline_data.append(float(hist_1y['Close'].iloc[i]))
                    
                    return {
                        'ticker': ticker,
                        'name': info.get('longName', info.get('shortName', ticker)),
                        'price': float(current_price),
                        'change': float(change),
                        'change_percent': float(change_percent),
                        'market_cap': info.get('marketCap'),
                        'sector': info.get('sector', ''),
                        'pe_ratio': info.get('trailingPE'),
                        'high_52week': info.get('fiftyTwoWeekHigh'),
                        'low_52week': info.get('fiftyTwoWeekLow'),
                        'sparkline': sparkline_data
                    }
                
                return await run_in_threadpool(get_info)
            except Exception as e:
                logger.error(f"Error fetching {ticker}: {str(e)}")
                return None
        
        # Fetch all stocks concurrently
        tasks = [fetch_stock_info(ticker) for ticker in tickers]
        results = await asyncio.gather(*tasks)
        
        # Filter out None results and sort by market cap
        stocks = [r for r in results if r is not None]
        stocks.sort(key=lambda x: x['market_cap'] if x['market_cap'] else 0, reverse=True)
        
        return {
            "category": category_display_name,
            "stocks": stocks[:10]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch category stocks: {str(e)}")


# Custom categories endpoints
@api_router.post("/custom-categories", response_model=CustomCategory)
async def create_custom_category(input: CustomCategoryCreate):
    """Create a custom category"""
    if len(input.tickers) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 stocks allowed")
    
    category = CustomCategory(**input.model_dump())
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.custom_categories.insert_one(doc)
    return category


@api_router.get("/custom-categories", response_model=List[CustomCategory])
async def get_custom_categories():
    """Get all custom categories"""
    categories = await db.custom_categories.find({}, {"_id": 0}).to_list(100)
    
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    
    return categories


@api_router.delete("/custom-categories/{category_id}")
async def delete_custom_category(category_id: str):
    """Delete a custom category"""
    result = await db.custom_categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom category not found")
    
    return {"message": "Category deleted successfully"}


# ==================== WATCHLIST ENDPOINTS ====================

@api_router.post("/watchlists", response_model=Watchlist)
async def create_watchlist(input: WatchlistCreate):
    """Create a new watchlist"""
    watchlist = Watchlist(**input.model_dump())
    doc = watchlist.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.watchlists.insert_one(doc)
    return watchlist


@api_router.get("/watchlists", response_model=List[Watchlist])
async def get_watchlists():
    """Get all watchlists"""
    watchlists = await db.watchlists.find({}, {"_id": 0}).to_list(100)
    
    for wl in watchlists:
        if isinstance(wl.get('created_at'), str):
            wl['created_at'] = datetime.fromisoformat(wl['created_at'])
        if isinstance(wl.get('updated_at'), str):
            wl['updated_at'] = datetime.fromisoformat(wl['updated_at'])
    
    return watchlists


@api_router.get("/watchlists/{watchlist_id}", response_model=Watchlist)
async def get_watchlist(watchlist_id: str):
    """Get a single watchlist by ID"""
    watchlist = await db.watchlists.find_one({"id": watchlist_id}, {"_id": 0})
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    if isinstance(watchlist.get('created_at'), str):
        watchlist['created_at'] = datetime.fromisoformat(watchlist['created_at'])
    if isinstance(watchlist.get('updated_at'), str):
        watchlist['updated_at'] = datetime.fromisoformat(watchlist['updated_at'])
    
    return watchlist


@api_router.put("/watchlists/{watchlist_id}", response_model=Watchlist)
async def update_watchlist(watchlist_id: str, input: WatchlistUpdate):
    """Update a watchlist"""
    existing = await db.watchlists.find_one({"id": watchlist_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.watchlists.update_one({"id": watchlist_id}, {"$set": update_data})
    
    updated = await db.watchlists.find_one({"id": watchlist_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated


@api_router.delete("/watchlists/{watchlist_id}")
async def delete_watchlist(watchlist_id: str):
    """Delete a watchlist"""
    result = await db.watchlists.delete_one({"id": watchlist_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    return {"message": "Watchlist deleted successfully"}


@api_router.post("/watchlists/{watchlist_id}/stocks/{ticker}")
async def add_stock_to_watchlist(watchlist_id: str, ticker: str):
    """Add a stock to a watchlist"""
    watchlist = await db.watchlists.find_one({"id": watchlist_id}, {"_id": 0})
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    ticker_upper = ticker.upper()
    if ticker_upper in watchlist.get('tickers', []):
        return {"message": f"{ticker_upper} already in watchlist"}
    
    await db.watchlists.update_one(
        {"id": watchlist_id},
        {
            "$push": {"tickers": ticker_upper},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": f"{ticker_upper} added to watchlist"}


@api_router.delete("/watchlists/{watchlist_id}/stocks/{ticker}")
async def remove_stock_from_watchlist(watchlist_id: str, ticker: str):
    """Remove a stock from a watchlist"""
    watchlist = await db.watchlists.find_one({"id": watchlist_id}, {"_id": 0})
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    ticker_upper = ticker.upper()
    await db.watchlists.update_one(
        {"id": watchlist_id},
        {
            "$pull": {"tickers": ticker_upper},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": f"{ticker_upper} removed from watchlist"}


@api_router.get("/watchlists/{watchlist_id}/stocks")
async def get_watchlist_stocks(watchlist_id: str):
    """Get detailed stock data for all stocks in a watchlist"""
    watchlist = await db.watchlists.find_one({"id": watchlist_id}, {"_id": 0})
    
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    tickers = watchlist.get('tickers', [])
    
    if not tickers:
        return {"watchlist": watchlist.get('name'), "stocks": []}
    
    async def fetch_stock_info(ticker):
        try:
            def get_info():
                stock = yf.Ticker(ticker)
                info = stock.info
                hist_1d = stock.history(period="1d")
                
                current_price = info.get('currentPrice', hist_1d['Close'].iloc[-1] if not hist_1d.empty else 0)
                previous_close = info.get('previousClose', info.get('regularMarketPreviousClose', current_price))
                
                change = current_price - previous_close
                change_percent = (change / previous_close * 100) if previous_close else 0
                
                return {
                    'ticker': ticker,
                    'name': info.get('longName', info.get('shortName', ticker)),
                    'price': float(current_price),
                    'change': float(change),
                    'change_percent': float(change_percent),
                    'market_cap': info.get('marketCap'),
                }
            
            return await run_in_threadpool(get_info)
        except Exception as e:
            logger.error(f"Error fetching {ticker}: {str(e)}")
            return None
    
    tasks = [fetch_stock_info(ticker) for ticker in tickers]
    results = await asyncio.gather(*tasks)
    
    stocks = [r for r in results if r is not None]
    
    return {"watchlist": watchlist.get('name'), "stocks": stocks}


# ==================== PRICE ALERT ENDPOINTS ====================

@api_router.post("/price-alerts", response_model=PriceAlert)
async def create_price_alert(input: PriceAlertCreate):
    """Create a new price alert"""
    if input.condition not in ["above", "below"]:
        raise HTTPException(status_code=400, detail="Condition must be 'above' or 'below'")
    
    alert_dict = input.model_dump()
    alert_dict['ticker'] = alert_dict['ticker'].upper()
    alert = PriceAlert(**alert_dict)
    
    doc = alert.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('triggered_at'):
        doc['triggered_at'] = doc['triggered_at'].isoformat()
    
    await db.price_alerts.insert_one(doc)
    return alert


@api_router.get("/price-alerts", response_model=List[PriceAlert])
async def get_price_alerts(active_only: bool = False):
    """Get all price alerts"""
    query = {"is_active": True} if active_only else {}
    alerts = await db.price_alerts.find(query, {"_id": 0}).to_list(100)
    
    for alert in alerts:
        if isinstance(alert.get('created_at'), str):
            alert['created_at'] = datetime.fromisoformat(alert['created_at'])
        if alert.get('triggered_at') and isinstance(alert['triggered_at'], str):
            alert['triggered_at'] = datetime.fromisoformat(alert['triggered_at'])
    
    return alerts


@api_router.delete("/price-alerts/{alert_id}")
async def delete_price_alert(alert_id: str):
    """Delete a price alert"""
    result = await db.price_alerts.delete_one({"id": alert_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Price alert not found")
    
    return {"message": "Price alert deleted successfully"}


@api_router.get("/price-alerts/check")
async def check_price_alerts():
    """Check all active price alerts and return triggered ones"""
    alerts = await db.price_alerts.find(
        {"is_active": True, "is_triggered": False},
        {"_id": 0}
    ).to_list(100)
    
    triggered_alerts = []
    
    for alert in alerts:
        try:
            def get_current_price(ticker):
                stock = yf.Ticker(ticker)
                info = stock.info
                return info.get('currentPrice', info.get('regularMarketPrice', 0))
            
            current_price = await run_in_threadpool(get_current_price, alert['ticker'])
            
            should_trigger = False
            if alert['condition'] == 'above' and current_price >= alert['target_price']:
                should_trigger = True
            elif alert['condition'] == 'below' and current_price <= alert['target_price']:
                should_trigger = True
            
            if should_trigger:
                triggered_at = datetime.now(timezone.utc)
                
                await db.price_alerts.update_one(
                    {"id": alert['id']},
                    {
                        "$set": {
                            "is_triggered": True,
                            "triggered_at": triggered_at.isoformat()
                        }
                    }
                )
                
                triggered_alerts.append({
                    "id": alert['id'],
                    "ticker": alert['ticker'],
                    "company_name": alert['company_name'],
                    "target_price": alert['target_price'],
                    "condition": alert['condition'],
                    "current_price": current_price,
                    "triggered_at": triggered_at.isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error checking alert for {alert['ticker']}: {str(e)}")
            continue
    
    return {"triggered_alerts": triggered_alerts, "count": len(triggered_alerts)}


@api_router.post("/price-alerts/{alert_id}/dismiss")
async def dismiss_price_alert(alert_id: str):
    """Dismiss a triggered alert (deactivate it)"""
    result = await db.price_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Price alert not found")
    
    return {"message": "Alert dismissed"}


@api_router.post("/price-alerts/{alert_id}/reset")
async def reset_price_alert(alert_id: str):
    """Reset a triggered alert to be active again"""
    result = await db.price_alerts.update_one(
        {"id": alert_id},
        {
            "$set": {
                "is_triggered": False,
                "is_active": True,
                "triggered_at": None
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Price alert not found")
    
    return {"message": "Alert reset and active again"}


# ==================== ADVANCED CHART ENDPOINTS ====================

@api_router.get("/stocks/{ticker}/candlestick")
async def get_candlestick_data(ticker: str, period: str = "3mo"):
    """Get OHLC candlestick data for a stock"""
    try:
        def fetch_candlestick():
            stock = yf.Ticker(ticker.upper())
            hist = stock.history(period=period)
            
            if hist.empty:
                raise ValueError("No data available")
            
            return [
                {
                    "date": date.strftime('%Y-%m-%d'),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume'])
                }
                for date, row in hist.iterrows()
            ]
        
        data = await run_in_threadpool(fetch_candlestick)
        return {"ticker": ticker.upper(), "data": data}
        
    except Exception as e:
        logger.error(f"Candlestick error for {ticker}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Candlestick data for {ticker} not available")


@api_router.get("/stocks/{ticker}/indicators")
async def get_technical_indicators(ticker: str, period: str = "1y"):
    """Get technical indicators (RSI, MACD, SMA, EMA) for a stock"""
    try:
        def calculate_indicators():
            stock = yf.Ticker(ticker.upper())
            hist = stock.history(period=period)
            
            if hist.empty or len(hist) < 26:
                raise ValueError("Not enough data for indicators")
            
            close = hist['Close']
            
            # Calculate RSI (14-period)
            delta = close.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            
            # Calculate MACD
            ema_12 = close.ewm(span=12, adjust=False).mean()
            ema_26 = close.ewm(span=26, adjust=False).mean()
            macd_line = ema_12 - ema_26
            signal_line = macd_line.ewm(span=9, adjust=False).mean()
            macd_histogram = macd_line - signal_line
            
            # Calculate SMAs
            sma_20 = close.rolling(window=20).mean()
            sma_50 = close.rolling(window=50).mean()
            sma_200 = close.rolling(window=200).mean() if len(close) >= 200 else None
            
            # Calculate EMA
            ema_20 = close.ewm(span=20, adjust=False).mean()
            
            # Calculate Bollinger Bands
            bb_middle = sma_20
            bb_std = close.rolling(window=20).std()
            bb_upper = bb_middle + (bb_std * 2)
            bb_lower = bb_middle - (bb_std * 2)
            
            result = []
            for i, (date, row) in enumerate(hist.iterrows()):
                data_point = {
                    "date": date.strftime('%Y-%m-%d'),
                    "close": float(row['Close']),
                    "rsi": float(rsi.iloc[i]) if not pd.isna(rsi.iloc[i]) else None,
                    "macd": float(macd_line.iloc[i]) if not pd.isna(macd_line.iloc[i]) else None,
                    "macd_signal": float(signal_line.iloc[i]) if not pd.isna(signal_line.iloc[i]) else None,
                    "macd_histogram": float(macd_histogram.iloc[i]) if not pd.isna(macd_histogram.iloc[i]) else None,
                    "sma_20": float(sma_20.iloc[i]) if not pd.isna(sma_20.iloc[i]) else None,
                    "sma_50": float(sma_50.iloc[i]) if not pd.isna(sma_50.iloc[i]) else None,
                    "ema_20": float(ema_20.iloc[i]) if not pd.isna(ema_20.iloc[i]) else None,
                    "bb_upper": float(bb_upper.iloc[i]) if not pd.isna(bb_upper.iloc[i]) else None,
                    "bb_middle": float(bb_middle.iloc[i]) if not pd.isna(bb_middle.iloc[i]) else None,
                    "bb_lower": float(bb_lower.iloc[i]) if not pd.isna(bb_lower.iloc[i]) else None,
                }
                
                if sma_200 is not None:
                    data_point["sma_200"] = float(sma_200.iloc[i]) if not pd.isna(sma_200.iloc[i]) else None
                
                result.append(data_point)
            
            return result
        
        # Need pandas for NaN checks
        import pandas as pd
        data = await run_in_threadpool(calculate_indicators)
        return {"ticker": ticker.upper(), "indicators": data}
        
    except Exception as e:
        logger.error(f"Indicators error for {ticker}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Technical indicators for {ticker} not available")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()