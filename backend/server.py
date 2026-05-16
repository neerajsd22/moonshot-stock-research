from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import yfinance as yf
import asyncio
import pandas as pd
from emergentintegrations.llm.chat import LlmChat, UserMessage
import secrets
import string
import time


# ========== CACHING LAYER ==========
# Simple in-memory cache for yfinance data to reduce API calls
class TickerCache:
    """Simple TTL cache for yfinance ticker data"""
    def __init__(self, ttl_seconds: int = 300):  # 5 minute default TTL
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
        self.ttl = ttl_seconds
    
    def get(self, ticker: str) -> Optional[Any]:
        """Get cached ticker or None if expired/missing"""
        key = ticker.upper()
        if key in self._cache:
            if time.time() - self._timestamps[key] < self.ttl:
                return self._cache[key]
            else:
                # Expired, remove from cache
                del self._cache[key]
                del self._timestamps[key]
        return None
    
    def set(self, ticker: str, data: Any) -> None:
        """Cache ticker data"""
        key = ticker.upper()
        self._cache[key] = data
        self._timestamps[key] = time.time()
    
    def get_or_create(self, ticker: str) -> Any:
        """Get from cache or create new ticker - NO caching to avoid recursion"""
        # Simply create a new yf.Ticker each time but use for batch operations
        return yf.Ticker(ticker.upper())
    
    def clear_expired(self) -> int:
        """Remove expired entries, return count removed"""
        now = time.time()
        expired = [k for k, t in self._timestamps.items() if now - t >= self.ttl]
        for k in expired:
            del self._cache[k]
            del self._timestamps[k]
        return len(expired)

# Global ticker cache instance
ticker_cache = TickerCache(ttl_seconds=300)  # 5 minute cache


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
    order: int = Field(default=0)

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
        
        # Always supplement with Yahoo Finance fuzzy search so that full company
        # names like "Salesforce" or "Abbott Laboratories" resolve to their
        # correct tickers (CRM, ABT) even when not in our predefined dictionaries.
        try:
            def yf_search(qs):
                s = yf.Search(qs, max_results=15)
                return s.quotes or []
            
            yf_quotes = await run_in_threadpool(yf_search, query)
            
            for q in yf_quotes:
                quote_type = q.get('quoteType')
                if quote_type not in ('EQUITY', 'ETF', 'INDEX'):
                    continue
                
                sym = q.get('symbol') or ''
                if not sym:
                    continue
                
                # Determine exchange and apply exchange filter
                if sym.endswith('.NS'):
                    exch = 'NSE'
                    if exchange not in ('all', 'nse'):
                        continue
                elif sym.endswith('.BO'):
                    exch = 'BSE'
                    if exchange not in ('all', 'bse'):
                        continue
                elif sym.startswith('^'):
                    exch = 'Index'
                    # indexes available in all filters
                elif '.' in sym or '=' in sym or '-' in sym:
                    # Foreign listings (e.g. .DE, .MX, .BA, .NE) — skip to keep
                    # results focused on US / Indian exchanges
                    continue
                else:
                    exch = q.get('exchDisp') or 'NASDAQ/NYSE'
                    if exchange not in ('all', 'us'):
                        continue
                
                name = q.get('longname') or q.get('shortname') or sym
                
                results.append({
                    "ticker": sym,
                    "name": name,
                    "exchange": exch,
                })
        except Exception as e:
            logger.warning(f"Yahoo Finance Search fallback failed for '{query}': {str(e)}")
        
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
            stock = ticker_cache.get_or_create(ticker.upper())
            hist = stock.history(period=period)
            
            if hist.empty:
                raise ValueError("No historical data available")
            
            # yfinance can return rows with NaN OHLC values (e.g. ex-dividend
            # markers with no trade data). Drop those before serializing — NaN
            # is not JSON-compliant and would otherwise crash the response.
            hist = hist.dropna(subset=['Open', 'High', 'Low', 'Close'])
            
            if hist.empty:
                raise ValueError("No historical data available")
            
            rows = []
            for date, row in hist.iterrows():
                try:
                    rows.append({
                        "date": date.strftime('%Y-%m-%d'),
                        "open": float(row['Open']),
                        "high": float(row['High']),
                        "low": float(row['Low']),
                        "close": float(row['Close']),
                        "volume": int(row['Volume']) if pd.notna(row['Volume']) else 0,
                    })
                except (ValueError, TypeError):
                    # Belt-and-suspenders: skip any row that still has bad numeric data
                    continue
            return rows
        
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
                        "revenue": safe_float(revenue),
                        "gross_margin": safe_round(gross_margin, 1),
                        "op_margin": safe_round(op_margin, 1),
                        "net_income": safe_float(net_income),
                        "fcf": safe_float(fcf),
                    })
            
            # Sort quarters in descending order (most recent first)
            quarters_data.sort(key=lambda x: x.get('date', ''), reverse=True)
            
            # Get current metrics from info
            current_metrics = {
                "market_cap": safe_float(info.get('marketCap')),
                "pe_ratio": safe_float(info.get('forwardPE')),
                "debt_to_equity": safe_float(info.get('debtToEquity')),
                "current_ratio": safe_float(info.get('currentRatio')),
                "roic": safe_round(safe_float(info.get('returnOnAssets'), 0) * 100, 1) if info.get('returnOnAssets') else None,
                "roe": safe_round(safe_float(info.get('returnOnEquity'), 0) * 100, 1) if info.get('returnOnEquity') else None,
                "revenue_growth": safe_round(safe_float(info.get('revenueGrowth'), 0) * 100, 1) if info.get('revenueGrowth') else None,
                "earnings_growth": safe_round(safe_float(info.get('earningsQuarterlyGrowth'), 0) * 100, 1) if info.get('earningsQuarterlyGrowth') else None,
                "shares_outstanding": safe_float(info.get('sharesOutstanding')),
                "float_shares": safe_float(info.get('floatShares')),
                "held_by_institutions": safe_round(safe_float(info.get('heldPercentInstitutions'), 0) * 100, 1) if info.get('heldPercentInstitutions') else None,
                "short_ratio": safe_float(info.get('shortRatio')),
                "beta": safe_float(info.get('beta')),
                "target_price": safe_float(info.get('targetMeanPrice')),
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
            
            # Risk assessment (simplified) - None-safe comparisons
            held_by_inst = current_metrics.get('held_by_institutions')
            debt_eq = info.get('debtToEquity')
            
            risk_scores = {
                "regulatory_risk": 3 if info.get('sector') in ['Technology', 'Healthcare', 'Financial Services'] else 2,
                "concentration_risk": 5 if held_by_inst is not None and held_by_inst > 80 else 3,
                "debt_risk": min(10, int(debt_eq / 50)) if debt_eq is not None else 2,
            }
            
            # Sentiment assessment - None-safe comparisons
            recommendation = (current_metrics.get('recommendation') or '').lower()
            sentiment = {
                "institutional": 'bullish' if held_by_inst is not None and held_by_inst > 60 else 'neutral',
                "analyst": 'bullish' if recommendation in ['buy', 'strong_buy'] else 'bearish' if recommendation in ['sell', 'strong_sell'] else 'neutral',
            }
            
            # Overall verdict
            score = 0
            if trends.get('revenue_trend') == 'accelerating':
                score += 2
            if trends.get('margin_trend') == 'improving':
                score += 2
            if trends.get('fcf_quality') == 'strong':
                score += 2
            # None-safe comparisons: use 'or' to provide fallback when value is None
            roe_val = current_metrics.get('roe')
            if roe_val is not None and roe_val > 15:
                score += 1
            debt_val = current_metrics.get('debt_to_equity')
            if debt_val is not None and debt_val < 100:
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
        if isinstance(existing.get('pinned_at'), str):
            existing['pinned_at'] = datetime.fromisoformat(existing['pinned_at'])
        if 'order' not in existing:
            existing['order'] = 0
        return PinnedStock(**existing)
    
    # Get the next order value
    last = await db.pinned_stocks.find_one(sort=[("order", -1)], projection={"_id": 0, "order": 1})
    next_order = (last.get('order', 0) + 1) if last else 0
    
    pinned_dict = input.model_dump()
    pinned_dict['ticker'] = pinned_dict['ticker'].upper()
    pinned_obj = PinnedStock(**pinned_dict, order=next_order)
    
    doc = pinned_obj.model_dump()
    doc['pinned_at'] = doc['pinned_at'].isoformat()
    
    await db.pinned_stocks.insert_one(doc)
    return pinned_obj


@api_router.get("/pinned-stocks", response_model=List[PinnedStock])
async def get_pinned_stocks():
    """Get all pinned stocks sorted by order"""
    pinned_stocks = await db.pinned_stocks.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    for stock in pinned_stocks:
        if isinstance(stock.get('pinned_at'), str):
            stock['pinned_at'] = datetime.fromisoformat(stock['pinned_at'])
        if 'order' not in stock:
            stock['order'] = 0
    
    return pinned_stocks


@api_router.put("/pinned-stocks/reorder")
async def reorder_pinned_stocks(tickers: List[str]):
    """Reorder pinned stocks by updating order field"""
    for i, ticker in enumerate(tickers):
        await db.pinned_stocks.update_one(
            {"ticker": ticker.upper()},
            {"$set": {"order": i}}
        )
    return {"message": "Pinned stocks reordered"}
    
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
                    stock = ticker_cache.get_or_create(ticker)
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
                stock = ticker_cache.get_or_create(ticker)
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
                stock = ticker_cache.get_or_create(ticker)
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
            stock = ticker_cache.get_or_create(ticker.upper())
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
            stock = ticker_cache.get_or_create(ticker.upper())
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


# ============================================================================
# INTELLIGENCE HUB - Advanced Analysis Features
# ============================================================================

# A. Five Signals Framework - Enhanced AI Analysis
@api_router.get("/stocks/{ticker}/five-signals")
async def get_five_signals_analysis(ticker: str):
    """
    Enhanced AI Analysis using the 5 Signals Framework:
    1. Cash Generation (FCF trends, quality)
    2. Competitive Position (margins, efficiency)
    3. Smart Money Confidence (insider/institutional)
    4. Growth Quality (acceleration metrics)
    5. Valuation Sanity (PEG, EV/FCF)
    """
    try:
        def fetch_signals_data():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            
            # Get financial data
            cashflow = stock.quarterly_cashflow
            financials = stock.quarterly_financials
            
            # Initialize signals
            signals = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "analysis_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "signals": {},
                "overall_score": 0,
                "verdict": "NEUTRAL"
            }
            
            # 1. CASH GENERATION (25 points max)
            cash_score = 0
            cash_details = {}
            
            try:
                if cashflow is not None and not cashflow.empty:
                    # Free Cash Flow trend
                    if 'Free Cash Flow' in cashflow.index:
                        fcf_values = cashflow.loc['Free Cash Flow'].dropna().values[:4]
                        if len(fcf_values) >= 2:
                            fcf_latest = safe_float(fcf_values[0], 0)
                            fcf_prev = safe_float(fcf_values[1], 0)
                            fcf_trend = "improving" if fcf_latest > fcf_prev else "declining"
                            cash_details["fcf_latest"] = fcf_latest
                            cash_details["fcf_trend"] = fcf_trend
                            if fcf_latest > 0:
                                cash_score += 10
                            if fcf_trend == "improving":
                                cash_score += 5
                    
                    # FCF vs Net Income (quality check)
                    if 'Free Cash Flow' in cashflow.index and financials is not None and 'Net Income' in financials.index:
                        fcf = safe_float(cashflow.loc['Free Cash Flow'].dropna().values[0], 0) if len(cashflow.loc['Free Cash Flow'].dropna()) > 0 else 0
                        net_income = safe_float(financials.loc['Net Income'].dropna().values[0], 0) if len(financials.loc['Net Income'].dropna()) > 0 else 0
                        if net_income > 0 and fcf > net_income:
                            cash_score += 5
                            cash_details["fcf_quality"] = "excellent"
                        elif net_income > 0 and fcf > 0:
                            cash_score += 3
                            cash_details["fcf_quality"] = "good"
                        else:
                            cash_details["fcf_quality"] = "weak"
                    
                    # CapEx efficiency
                    if 'Capital Expenditure' in cashflow.index:
                        capex_values = cashflow.loc['Capital Expenditure'].dropna().values[:4]
                        if len(capex_values) >= 2:
                            capex_trend = "efficient" if abs(safe_float(capex_values[0], 0)) <= abs(safe_float(capex_values[1], 0)) else "increasing"
                            cash_details["capex_trend"] = capex_trend
                            if capex_trend == "efficient":
                                cash_score += 5
            except Exception as e:
                cash_details["error"] = str(e)
            
            signals["signals"]["cash_generation"] = {
                "score": min(cash_score, 25),
                "max_score": 25,
                "details": cash_details,
                "grade": "A" if cash_score >= 20 else "B" if cash_score >= 15 else "C" if cash_score >= 10 else "D"
            }
            
            # 2. COMPETITIVE POSITION (25 points max)
            position_score = 0
            position_details = {}
            
            try:
                # Gross margin
                gross_margin = safe_float(info.get('grossMargins'), 0) * 100
                position_details["gross_margin"] = round(gross_margin, 1)
                if gross_margin > 50:
                    position_score += 10
                elif gross_margin > 30:
                    position_score += 6
                elif gross_margin > 15:
                    position_score += 3
                
                # Operating margin
                op_margin = safe_float(info.get('operatingMargins'), 0) * 100
                position_details["operating_margin"] = round(op_margin, 1)
                if op_margin > 20:
                    position_score += 8
                elif op_margin > 10:
                    position_score += 5
                elif op_margin > 0:
                    position_score += 2
                
                # Revenue per employee (efficiency)
                revenue = safe_float(info.get('totalRevenue'), 0)
                employees = safe_float(info.get('fullTimeEmployees'), 1)
                if employees > 0:
                    rev_per_employee = revenue / employees
                    position_details["revenue_per_employee"] = round(rev_per_employee, 0)
                    if rev_per_employee > 500000:
                        position_score += 7
                    elif rev_per_employee > 250000:
                        position_score += 4
                    elif rev_per_employee > 100000:
                        position_score += 2
            except Exception as e:
                position_details["error"] = str(e)
            
            signals["signals"]["competitive_position"] = {
                "score": min(position_score, 25),
                "max_score": 25,
                "details": position_details,
                "grade": "A" if position_score >= 20 else "B" if position_score >= 15 else "C" if position_score >= 10 else "D"
            }
            
            # 3. SMART MONEY CONFIDENCE (20 points max)
            smart_money_score = 0
            smart_money_details = {}
            
            try:
                # Institutional holdings
                inst_hold = safe_float(info.get('heldPercentInstitutions'), 0) * 100
                smart_money_details["institutional_ownership"] = round(inst_hold, 1)
                if inst_hold > 70:
                    smart_money_score += 8
                elif inst_hold > 50:
                    smart_money_score += 5
                elif inst_hold > 30:
                    smart_money_score += 3
                
                # Insider holdings
                insider_hold = safe_float(info.get('heldPercentInsiders'), 0) * 100
                smart_money_details["insider_ownership"] = round(insider_hold, 1)
                if insider_hold > 10:
                    smart_money_score += 6
                elif insider_hold > 5:
                    smart_money_score += 4
                elif insider_hold > 1:
                    smart_money_score += 2
                
                # Short interest (lower is better)
                short_ratio = safe_float(info.get('shortRatio'), 10)
                smart_money_details["short_ratio"] = round(short_ratio, 1)
                if short_ratio < 2:
                    smart_money_score += 6
                elif short_ratio < 5:
                    smart_money_score += 3
            except Exception as e:
                smart_money_details["error"] = str(e)
            
            signals["signals"]["smart_money"] = {
                "score": min(smart_money_score, 20),
                "max_score": 20,
                "details": smart_money_details,
                "grade": "A" if smart_money_score >= 16 else "B" if smart_money_score >= 12 else "C" if smart_money_score >= 8 else "D"
            }
            
            # 4. GROWTH QUALITY (20 points max)
            growth_score = 0
            growth_details = {}
            
            try:
                # Revenue growth
                rev_growth = safe_float(info.get('revenueGrowth'), 0) * 100
                growth_details["revenue_growth"] = round(rev_growth, 1)
                if rev_growth > 25:
                    growth_score += 8
                elif rev_growth > 15:
                    growth_score += 6
                elif rev_growth > 5:
                    growth_score += 3
                
                # Earnings growth
                earnings_growth = safe_float(info.get('earningsGrowth'), 0) * 100
                growth_details["earnings_growth"] = round(earnings_growth, 1)
                if earnings_growth > 25:
                    growth_score += 6
                elif earnings_growth > 10:
                    growth_score += 4
                elif earnings_growth > 0:
                    growth_score += 2
                
                # Revenue acceleration (QoQ comparison)
                if financials is not None and 'Total Revenue' in financials.index:
                    rev_values = financials.loc['Total Revenue'].dropna().values[:4]
                    if len(rev_values) >= 3:
                        growth_q1 = (safe_float(rev_values[0], 0) - safe_float(rev_values[1], 1)) / max(abs(safe_float(rev_values[1], 1)), 1)
                        growth_q2 = (safe_float(rev_values[1], 0) - safe_float(rev_values[2], 1)) / max(abs(safe_float(rev_values[2], 1)), 1)
                        if growth_q1 > growth_q2:
                            growth_score += 6
                            growth_details["revenue_acceleration"] = "accelerating"
                        else:
                            growth_details["revenue_acceleration"] = "decelerating"
            except Exception as e:
                growth_details["error"] = str(e)
            
            signals["signals"]["growth_quality"] = {
                "score": min(growth_score, 20),
                "max_score": 20,
                "details": growth_details,
                "grade": "A" if growth_score >= 16 else "B" if growth_score >= 12 else "C" if growth_score >= 8 else "D"
            }
            
            # 5. VALUATION SANITY (10 points max)
            valuation_score = 0
            valuation_details = {}
            
            try:
                # PEG ratio
                peg = safe_float(info.get('pegRatio'), 99)
                valuation_details["peg_ratio"] = round(peg, 2) if peg < 99 else None
                if peg < 1:
                    valuation_score += 5
                elif peg < 1.5:
                    valuation_score += 4
                elif peg < 2:
                    valuation_score += 2
                
                # Forward P/E vs trailing P/E
                forward_pe = safe_float(info.get('forwardPE'), 0)
                trailing_pe = safe_float(info.get('trailingPE'), 0)
                valuation_details["forward_pe"] = round(forward_pe, 1) if forward_pe else None
                valuation_details["trailing_pe"] = round(trailing_pe, 1) if trailing_pe else None
                if forward_pe > 0 and trailing_pe > 0 and forward_pe < trailing_pe:
                    valuation_score += 3
                    valuation_details["pe_trend"] = "improving"
                
                # Price to FCF
                market_cap = safe_float(info.get('marketCap'), 0)
                if cashflow is not None and 'Free Cash Flow' in cashflow.index:
                    fcf = safe_float(cashflow.loc['Free Cash Flow'].dropna().values[0], 0) if len(cashflow.loc['Free Cash Flow'].dropna()) > 0 else 0
                    if fcf > 0:
                        price_to_fcf = market_cap / (fcf * 4)  # Annualized
                        valuation_details["price_to_fcf"] = round(price_to_fcf, 1)
                        if price_to_fcf < 15:
                            valuation_score += 2
            except Exception as e:
                valuation_details["error"] = str(e)
            
            signals["signals"]["valuation_sanity"] = {
                "score": min(valuation_score, 10),
                "max_score": 10,
                "details": valuation_details,
                "grade": "A" if valuation_score >= 8 else "B" if valuation_score >= 6 else "C" if valuation_score >= 4 else "D"
            }
            
            # Calculate overall score
            total_score = sum(s["score"] for s in signals["signals"].values())
            signals["overall_score"] = total_score
            signals["max_score"] = 100
            
            # Determine verdict
            if total_score >= 80:
                signals["verdict"] = "STRONG BUY"
                signals["verdict_color"] = "green"
            elif total_score >= 65:
                signals["verdict"] = "BUY"
                signals["verdict_color"] = "green"
            elif total_score >= 50:
                signals["verdict"] = "HOLD"
                signals["verdict_color"] = "yellow"
            elif total_score >= 35:
                signals["verdict"] = "CAUTION"
                signals["verdict_color"] = "orange"
            else:
                signals["verdict"] = "AVOID"
                signals["verdict_color"] = "red"
            
            return signals
        
        from starlette.concurrency import run_in_threadpool
        result = await run_in_threadpool(fetch_signals_data)
        return result
        
    except Exception as e:
        logger.error(f"Error fetching 5 signals for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# B. Pre-Earnings Intelligence Report
@api_router.get("/stocks/{ticker}/earnings-intelligence")
async def get_earnings_intelligence(ticker: str):
    """
    Pre-Earnings Intelligence Report:
    - Historical earnings surprise pattern
    - Analyst estimate revisions
    - Insider activity (90 days)
    - Options implied move
    - Sector read-through
    """
    try:
        def fetch_earnings_intel():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            
            report = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "report_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "next_earnings": None,
                "historical_surprises": [],
                "estimate_revisions": {},
                "insider_activity": {},
                "implied_move": None,
                "sector_signals": {},
                "earnings_prediction": {}
            }
            
            # Next earnings date
            try:
                calendar = stock.calendar
                if calendar is not None and not calendar.empty:
                    if 'Earnings Date' in calendar.index:
                        earnings_dates = calendar.loc['Earnings Date']
                        if hasattr(earnings_dates, 'iloc') and len(earnings_dates) > 0:
                            next_date = earnings_dates.iloc[0]
                            if pd.notna(next_date):
                                report["next_earnings"] = str(next_date)[:10]
            except:
                pass
            
            # Historical earnings surprises
            try:
                earnings_hist = stock.earnings_history
                if earnings_hist is not None and not earnings_hist.empty:
                    surprises = []
                    beat_count = 0
                    miss_count = 0
                    
                    for idx, row in earnings_hist.iterrows():
                        actual = safe_float(row.get('epsActual'), 0)
                        estimate = safe_float(row.get('epsEstimate'), 0)
                        surprise_pct = ((actual - estimate) / abs(estimate) * 100) if estimate != 0 else 0
                        
                        surprise_data = {
                            "date": str(idx)[:10] if pd.notna(idx) else None,
                            "actual": actual,
                            "estimate": estimate,
                            "surprise_pct": round(surprise_pct, 1),
                            "beat": actual > estimate
                        }
                        surprises.append(surprise_data)
                        
                        if actual > estimate:
                            beat_count += 1
                        elif actual < estimate:
                            miss_count += 1
                    
                    report["historical_surprises"] = surprises[:8]  # Last 8 quarters
                    report["beat_rate"] = round(beat_count / max(len(surprises), 1) * 100, 0)
            except:
                pass
            
            # Analyst estimates and revisions
            try:
                report["estimate_revisions"] = {
                    "current_eps_estimate": safe_float(info.get('forwardEps'), None),
                    "current_year_estimate": safe_float(info.get('forwardEps'), None),
                    "next_year_estimate": None,
                    "target_price_mean": safe_float(info.get('targetMeanPrice'), None),
                    "target_price_low": safe_float(info.get('targetLowPrice'), None),
                    "target_price_high": safe_float(info.get('targetHighPrice'), None),
                    "recommendation": info.get('recommendationKey', 'none'),
                    "num_analysts": safe_float(info.get('numberOfAnalystOpinions'), 0)
                }
            except:
                pass
            
            # Insider activity summary
            try:
                insider_txns = stock.insider_transactions
                if insider_txns is not None and not insider_txns.empty:
                    buys = 0
                    sells = 0
                    buy_value = 0
                    sell_value = 0
                    
                    for idx, row in insider_txns.iterrows():
                        shares = safe_float(row.get('Shares'), 0)
                        value = safe_float(row.get('Value'), 0)
                        
                        if shares > 0:
                            buys += 1
                            buy_value += abs(value)
                        elif shares < 0:
                            sells += 1
                            sell_value += abs(value)
                    
                    report["insider_activity"] = {
                        "total_buys": buys,
                        "total_sells": sells,
                        "buy_value": buy_value,
                        "sell_value": sell_value,
                        "net_sentiment": "bullish" if buys > sells else "bearish" if sells > buys else "neutral"
                    }
            except:
                pass
            
            # Implied move from options (approximation using volatility)
            try:
                implied_vol = safe_float(info.get('impliedVolatility'), 0)
                if implied_vol > 0:
                    # Approximate 1-day implied move
                    implied_daily_move = implied_vol / math.sqrt(252) * 100
                    report["implied_move"] = {
                        "implied_volatility": round(implied_vol * 100, 1),
                        "expected_daily_move_pct": round(implied_daily_move, 1),
                        "expected_earnings_move_pct": round(implied_daily_move * 2, 1)  # Earnings typically 2x daily
                    }
            except:
                pass
            
            # Sector analysis
            try:
                sector = info.get('sector', 'Unknown')
                industry = info.get('industry', 'Unknown')
                report["sector_signals"] = {
                    "sector": sector,
                    "industry": industry,
                    "sector_pe": safe_float(info.get('sectorPE'), None),
                    "industry_pe": safe_float(info.get('industryPE'), None)
                }
            except:
                pass
            
            # Generate prediction summary
            beat_rate = report.get("beat_rate", 50)
            insider_sentiment = report.get("insider_activity", {}).get("net_sentiment", "neutral")
            recommendation = report.get("estimate_revisions", {}).get("recommendation", "none")
            
            prediction_score = 50  # Base score
            if beat_rate >= 75:
                prediction_score += 15
            elif beat_rate >= 50:
                prediction_score += 5
            
            if insider_sentiment == "bullish":
                prediction_score += 10
            elif insider_sentiment == "bearish":
                prediction_score -= 10
            
            if recommendation in ["buy", "strong_buy"]:
                prediction_score += 10
            elif recommendation in ["sell", "strong_sell"]:
                prediction_score -= 10
            
            report["earnings_prediction"] = {
                "beat_probability": min(max(prediction_score, 10), 90),
                "confidence": "high" if abs(prediction_score - 50) > 20 else "medium" if abs(prediction_score - 50) > 10 else "low",
                "key_factors": []
            }
            
            # Add key factors
            factors = []
            if beat_rate >= 75:
                factors.append(f"Strong beat history ({int(beat_rate)}% of last 8 quarters)")
            if insider_sentiment == "bullish":
                factors.append("Recent insider buying activity")
            elif insider_sentiment == "bearish":
                factors.append("Recent insider selling activity")
            if recommendation in ["buy", "strong_buy"]:
                factors.append(f"Analyst consensus: {recommendation.replace('_', ' ').title()}")
            
            report["earnings_prediction"]["key_factors"] = factors
            
            return report
        
        from starlette.concurrency import run_in_threadpool
        result = await run_in_threadpool(fetch_earnings_intel)
        return result
        
    except Exception as e:
        logger.error(f"Error fetching earnings intelligence for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Smart Earnings Analysis Module
@api_router.get("/stocks/{ticker}/smart-earnings")
async def get_smart_earnings(ticker: str):
    """
    Smart Earnings Analysis with two sub-sections:
    1. Historical Fundamentals - Analysis of latest publicly available earnings
    2. Pre-Earnings Intelligence Report (PEIR) - Only active 3-5 days before earnings
    """
    try:
        def fetch_smart_earnings():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            
            report = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "report_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "upcoming_earnings_date": None,
                "days_until_earnings": None,
                "peir_active": False,
                "peir_message": "Pre-Earnings Intelligence will be available 3-5 days before the next earnings date.",
                "historical_fundamentals": {},
                "peir_data": None
            }
            
            # Get upcoming earnings date
            next_earnings = None
            try:
                calendar = stock.calendar
                if calendar is not None and not calendar.empty:
                    if 'Earnings Date' in calendar.index:
                        earnings_dates = calendar.loc['Earnings Date']
                        if hasattr(earnings_dates, 'iloc') and len(earnings_dates) > 0:
                            next_date = earnings_dates.iloc[0]
                            if pd.notna(next_date):
                                next_earnings = pd.to_datetime(next_date)
                                report["upcoming_earnings_date"] = str(next_date)[:10]
            except:
                pass
            
            # Calculate days until earnings
            if next_earnings:
                today = pd.Timestamp.now(tz='UTC').normalize()
                next_earnings_tz = next_earnings.tz_localize('UTC') if next_earnings.tzinfo is None else next_earnings
                days_diff = (next_earnings_tz - today).days
                report["days_until_earnings"] = days_diff
                
                # PEIR active if 3-5 days before earnings
                if 0 <= days_diff <= 5:
                    report["peir_active"] = True
                    report["peir_message"] = f"Pre-Earnings Intelligence Report active - {days_diff} day(s) until earnings"
            
            # ====== HISTORICAL FUNDAMENTALS ======
            historical = {
                "earnings_history": [],
                "beat_rate": 0,
                "average_surprise_pct": 0,
                "price_reactions": [],
                "key_metrics": {}
            }
            
            # Historical earnings surprises with price reactions
            try:
                earnings_hist = stock.earnings_history
                hist_prices = stock.history(period="5y")
                
                if earnings_hist is not None and not earnings_hist.empty:
                    surprises = []
                    beat_count = 0
                    total_surprise = 0
                    
                    for idx, row in earnings_hist.iterrows():
                        actual = safe_float(row.get('epsActual'), 0)
                        estimate = safe_float(row.get('epsEstimate'), 0)
                        surprise_pct = ((actual - estimate) / abs(estimate) * 100) if estimate != 0 else 0
                        
                        # Calculate price reaction after earnings
                        price_reaction = None
                        if not hist_prices.empty and pd.notna(idx):
                            try:
                                earnings_date = pd.to_datetime(idx)
                                # Find the closest trading day after earnings
                                future_prices = hist_prices[hist_prices.index >= earnings_date]
                                past_prices = hist_prices[hist_prices.index < earnings_date]
                                
                                if len(future_prices) >= 2 and len(past_prices) >= 1:
                                    pre_price = past_prices['Close'].iloc[-1]
                                    post_price = future_prices['Close'].iloc[1] if len(future_prices) > 1 else future_prices['Close'].iloc[0]
                                    price_reaction = round(((post_price - pre_price) / pre_price) * 100, 2)
                            except:
                                pass
                        
                        surprise_data = {
                            "date": str(idx)[:10] if pd.notna(idx) else None,
                            "actual_eps": round(actual, 2),
                            "estimated_eps": round(estimate, 2),
                            "surprise_pct": round(surprise_pct, 1),
                            "beat": actual > estimate,
                            "price_reaction_pct": price_reaction
                        }
                        surprises.append(surprise_data)
                        total_surprise += surprise_pct
                        
                        if actual > estimate:
                            beat_count += 1
                    
                    historical["earnings_history"] = surprises[:8]
                    historical["beat_rate"] = round(beat_count / max(len(surprises), 1) * 100, 0)
                    historical["average_surprise_pct"] = round(total_surprise / max(len(surprises), 1), 1)
                    
                    # Calculate correlation between surprise and price reaction
                    valid_reactions = [s for s in surprises if s["price_reaction_pct"] is not None]
                    if len(valid_reactions) >= 3:
                        beats_up = sum(1 for s in valid_reactions if s["beat"] and s["price_reaction_pct"] > 0)
                        misses_down = sum(1 for s in valid_reactions if not s["beat"] and s["price_reaction_pct"] < 0)
                        historical["price_reaction_correlation"] = round((beats_up + misses_down) / len(valid_reactions) * 100, 0)
            except:
                pass
            
            # Key metrics
            try:
                historical["key_metrics"] = {
                    "forward_pe": safe_round(info.get('forwardPE'), 1),
                    "trailing_pe": safe_round(info.get('trailingPE'), 1),
                    "peg_ratio": safe_round(info.get('pegRatio'), 2),
                    "forward_eps": safe_round(info.get('forwardEps'), 2),
                    "trailing_eps": safe_round(info.get('trailingEps'), 2),
                    "revenue_growth": safe_round(info.get('revenueGrowth', 0) * 100 if info.get('revenueGrowth') else None, 1),
                    "earnings_growth": safe_round(info.get('earningsGrowth', 0) * 100 if info.get('earningsGrowth') else None, 1),
                    "profit_margin": safe_round(info.get('profitMargins', 0) * 100 if info.get('profitMargins') else None, 1)
                }
            except:
                pass
            
            report["historical_fundamentals"] = historical
            
            # ====== PRE-EARNINGS INTELLIGENCE REPORT (PEIR) ======
            if report["peir_active"]:
                peir = {
                    "surprise_patterns": {},
                    "volatility_gap": {},
                    "insider_sentiment": {},
                    "revision_momentum": {},
                    "peer_read_through": []
                }
                
                # 1. Surprise Patterns - Correlate EPS beats/misses with price reaction
                try:
                    earnings_data = historical.get("earnings_history", [])
                    if earnings_data:
                        beat_reactions = [e["price_reaction_pct"] for e in earnings_data if e["beat"] and e["price_reaction_pct"] is not None]
                        miss_reactions = [e["price_reaction_pct"] for e in earnings_data if not e["beat"] and e["price_reaction_pct"] is not None]
                        
                        peir["surprise_patterns"] = {
                            "avg_beat_reaction": round(sum(beat_reactions) / max(len(beat_reactions), 1), 1) if beat_reactions else None,
                            "avg_miss_reaction": round(sum(miss_reactions) / max(len(miss_reactions), 1), 1) if miss_reactions else None,
                            "beat_count": len([e for e in earnings_data if e["beat"]]),
                            "miss_count": len([e for e in earnings_data if not e["beat"]]),
                            "pattern_summary": ""
                        }
                        
                        # Generate pattern summary
                        if beat_reactions and miss_reactions:
                            avg_beat = peir["surprise_patterns"]["avg_beat_reaction"]
                            avg_miss = peir["surprise_patterns"]["avg_miss_reaction"]
                            if avg_beat and avg_beat > 2:
                                peir["surprise_patterns"]["pattern_summary"] = f"Stock typically rallies {avg_beat}% on beats"
                            elif avg_miss and avg_miss < -2:
                                peir["surprise_patterns"]["pattern_summary"] = f"Stock typically drops {abs(avg_miss)}% on misses"
                            else:
                                peir["surprise_patterns"]["pattern_summary"] = "Muted price reactions to earnings"
                except:
                    pass
                
                # 2. Volatility Gap - Options implied move vs historical move
                try:
                    implied_vol = safe_float(info.get('impliedVolatility'), 0)
                    historical_reactions = [abs(e["price_reaction_pct"]) for e in earnings_data if e["price_reaction_pct"] is not None]
                    avg_historical_move = round(sum(historical_reactions) / max(len(historical_reactions), 1), 1) if historical_reactions else None
                    
                    if implied_vol > 0:
                        implied_earnings_move = round(implied_vol / math.sqrt(252) * 100 * 2, 1)  # Approx earnings move
                        
                        peir["volatility_gap"] = {
                            "implied_volatility_pct": round(implied_vol * 100, 1),
                            "implied_earnings_move_pct": implied_earnings_move,
                            "historical_avg_move_pct": avg_historical_move,
                            "gap_pct": round(implied_earnings_move - (avg_historical_move or 0), 1) if avg_historical_move else None,
                            "signal": ""
                        }
                        
                        if avg_historical_move:
                            gap = implied_earnings_move - avg_historical_move
                            if gap > 2:
                                peir["volatility_gap"]["signal"] = "Options pricing in LARGER move than historical average"
                            elif gap < -2:
                                peir["volatility_gap"]["signal"] = "Options pricing in SMALLER move than historical average"
                            else:
                                peir["volatility_gap"]["signal"] = "Options pricing aligned with historical moves"
                except:
                    pass
                
                # 3. Insider Sentiment - SEC Form 4 filings (last 90 days)
                try:
                    insider_txns = stock.insider_transactions
                    if insider_txns is not None and not insider_txns.empty:
                        recent_buys = 0
                        recent_sells = 0
                        buy_value = 0
                        sell_value = 0
                        executive_trades = []
                        
                        for idx, row in insider_txns.iterrows():
                            shares = safe_float(row.get('Shares'), 0)
                            value = safe_float(row.get('Value'), 0)
                            insider_name = row.get('Insider', 'Unknown')
                            
                            trade_info = {
                                "insider": str(insider_name)[:30],
                                "shares": int(abs(shares)),
                                "value": abs(value),
                                "type": "buy" if shares > 0 else "sell"
                            }
                            
                            if shares > 0:
                                recent_buys += 1
                                buy_value += abs(value)
                            elif shares < 0:
                                recent_sells += 1
                                sell_value += abs(value)
                            
                            executive_trades.append(trade_info)
                        
                        net_value = buy_value - sell_value
                        peir["insider_sentiment"] = {
                            "total_buys": recent_buys,
                            "total_sells": recent_sells,
                            "buy_value": buy_value,
                            "sell_value": sell_value,
                            "net_value": net_value,
                            "sentiment": "bullish" if net_value > 0 else "bearish" if net_value < 0 else "neutral",
                            "anomaly_detected": abs(net_value) > 1000000,
                            "recent_trades": executive_trades[:5],
                            "summary": ""
                        }
                        
                        if recent_buys > recent_sells * 2:
                            peir["insider_sentiment"]["summary"] = f"Unusual insider BUYING: {recent_buys} buys vs {recent_sells} sells"
                        elif recent_sells > recent_buys * 2:
                            peir["insider_sentiment"]["summary"] = f"Unusual insider SELLING: {recent_sells} sells vs {recent_buys} buys"
                        else:
                            peir["insider_sentiment"]["summary"] = "Normal insider trading activity"
                except:
                    pass
                
                # 4. Revision Momentum - Analyst estimate trends
                try:
                    current_estimate = safe_float(info.get('forwardEps'), None)
                    target_mean = safe_float(info.get('targetMeanPrice'), None)
                    target_high = safe_float(info.get('targetHighPrice'), None)
                    target_low = safe_float(info.get('targetLowPrice'), None)
                    num_analysts = int(safe_float(info.get('numberOfAnalystOpinions'), 0))
                    recommendation = info.get('recommendationKey', 'none')
                    
                    peir["revision_momentum"] = {
                        "current_eps_estimate": current_estimate,
                        "target_price_mean": target_mean,
                        "target_price_high": target_high,
                        "target_price_low": target_low,
                        "num_analysts": num_analysts,
                        "recommendation": recommendation,
                        "upside_pct": round(((target_mean - info.get('currentPrice', 0)) / info.get('currentPrice', 1)) * 100, 1) if target_mean and info.get('currentPrice') else None,
                        "trend": "",
                        "summary": ""
                    }
                    
                    # Determine trend based on recommendation
                    if recommendation in ['strongBuy', 'buy']:
                        peir["revision_momentum"]["trend"] = "positive"
                        peir["revision_momentum"]["summary"] = f"Analysts bullish: {num_analysts} analysts recommend {recommendation.replace('_', ' ')}"
                    elif recommendation in ['strongSell', 'sell']:
                        peir["revision_momentum"]["trend"] = "negative"
                        peir["revision_momentum"]["summary"] = f"Analysts bearish: {num_analysts} analysts recommend {recommendation.replace('_', ' ')}"
                    else:
                        peir["revision_momentum"]["trend"] = "neutral"
                        peir["revision_momentum"]["summary"] = f"{num_analysts} analysts with mixed views"
                except:
                    pass
                
                # 5. Peer Read-Through - Competitor earnings results
                try:
                    sector = info.get('sector', '')
                    industry = info.get('industry', '')
                    
                    # Get peer tickers based on sector
                    sector_peers = {
                        'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'CRM', 'ORCL'],
                        'Financial Services': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW'],
                        'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT'],
                        'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW'],
                        'Communication Services': ['GOOGL', 'META', 'DIS', 'NFLX', 'CMCSA', 'VZ', 'T', 'TMUS'],
                        'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO'],
                        'Industrials': ['CAT', 'DE', 'UNP', 'BA', 'HON', 'GE', 'MMM', 'LMT'],
                        'Consumer Defensive': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'PM', 'MO', 'CL'],
                    }
                    
                    peer_list = sector_peers.get(sector, [])[:5]
                    peer_list = [p for p in peer_list if p != ticker.upper()][:4]
                    
                    peer_results = []
                    for peer_ticker in peer_list:
                        try:
                            peer_stock = yf.Ticker(peer_ticker)
                            peer_info = peer_stock.info
                            peer_earnings = peer_stock.earnings_history
                            
                            latest_earnings = None
                            if peer_earnings is not None and not peer_earnings.empty:
                                latest = peer_earnings.iloc[0]
                                actual = safe_float(latest.get('epsActual'), 0)
                                estimate = safe_float(latest.get('epsEstimate'), 0)
                                surprise = ((actual - estimate) / abs(estimate) * 100) if estimate != 0 else 0
                                latest_earnings = {
                                    "actual": round(actual, 2),
                                    "estimate": round(estimate, 2),
                                    "surprise_pct": round(surprise, 1),
                                    "beat": actual > estimate
                                }
                            
                            peer_results.append({
                                "ticker": peer_ticker,
                                "name": peer_info.get('shortName', peer_ticker),
                                "latest_earnings": latest_earnings,
                                "recommendation": peer_info.get('recommendationKey', 'none')
                            })
                        except:
                            continue
                    
                    # Summarize peer results
                    beats = sum(1 for p in peer_results if p.get("latest_earnings", {}).get("beat", False))
                    total = len([p for p in peer_results if p.get("latest_earnings")])
                    
                    peir["peer_read_through"] = {
                        "sector": sector,
                        "industry": industry,
                        "peers_analyzed": len(peer_results),
                        "peers_beat": beats,
                        "peers_missed": total - beats,
                        "sector_signal": "positive" if beats > total / 2 else "negative" if beats < total / 2 else "mixed",
                        "peers": peer_results,
                        "summary": f"{beats}/{total} sector peers beat estimates this quarter" if total > 0 else "No peer data available"
                    }
                except:
                    pass
                
                report["peir_data"] = peir
            
            return report
        
        from starlette.concurrency import run_in_threadpool
        result = await run_in_threadpool(fetch_smart_earnings)
        return result
        
    except Exception as e:
        logger.error(f"Error fetching smart earnings for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# D. "Why Is This Moving?" Analysis
@api_router.get("/stocks/{ticker}/why-moving")
async def get_why_moving(ticker: str):
    """
    Analyze why a stock is moving significantly.
    Checks: News, earnings, insider activity, sector movement, technical levels.
    """
    try:
        def analyze_movement():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            hist = stock.history(period="5d")
            
            analysis = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "analysis_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "current_price": safe_float(info.get('currentPrice') or info.get('regularMarketPrice'), 0),
                "change_today": {},
                "potential_catalysts": [],
                "movement_strength": "normal",
                "ai_summary": ""
            }
            
            # Calculate today's movement
            if not hist.empty and len(hist) >= 1:
                today_close = safe_float(hist['Close'].iloc[-1], 0)
                today_open = safe_float(hist['Open'].iloc[-1], 0)
                prev_close = safe_float(hist['Close'].iloc[-2], today_open) if len(hist) >= 2 else today_open
                
                change_pct = ((today_close - prev_close) / prev_close * 100) if prev_close != 0 else 0
                intraday_change = ((today_close - today_open) / today_open * 100) if today_open != 0 else 0
                
                analysis["change_today"] = {
                    "price": round(today_close, 2),
                    "change_pct": round(change_pct, 2),
                    "intraday_change_pct": round(intraday_change, 2),
                    "direction": "up" if change_pct > 0 else "down" if change_pct < 0 else "flat",
                    "volume": safe_float(hist['Volume'].iloc[-1], 0),
                    "avg_volume": safe_float(info.get('averageVolume'), 0)
                }
                
                # Determine movement strength
                abs_change = abs(change_pct)
                if abs_change >= 10:
                    analysis["movement_strength"] = "extreme"
                elif abs_change >= 5:
                    analysis["movement_strength"] = "significant"
                elif abs_change >= 3:
                    analysis["movement_strength"] = "notable"
                else:
                    analysis["movement_strength"] = "normal"
                
                # Volume analysis
                avg_vol = safe_float(info.get('averageVolume'), 1)
                current_vol = safe_float(hist['Volume'].iloc[-1], 0)
                vol_ratio = current_vol / avg_vol if avg_vol > 0 else 1
                analysis["change_today"]["volume_vs_avg"] = round(vol_ratio, 1)
            
            catalysts = []
            
            # Check for recent news
            try:
                news = stock.news
                if news and len(news) > 0:
                    recent_news = []
                    for article in news[:5]:
                        pub_time = article.get('providerPublishTime', 0)
                        hours_ago = (datetime.now().timestamp() - pub_time) / 3600 if pub_time else 999
                        
                        if hours_ago < 24:  # News from last 24 hours
                            recent_news.append({
                                "title": article.get('title', ''),
                                "publisher": article.get('publisher', ''),
                                "hours_ago": round(hours_ago, 1)
                            })
                    
                    if recent_news:
                        catalysts.append({
                            "type": "news",
                            "impact": "high" if len(recent_news) >= 3 else "medium",
                            "description": f"{len(recent_news)} news article(s) in last 24 hours",
                            "details": recent_news[:3]
                        })
            except:
                pass
            
            # Check for earnings
            try:
                calendar = stock.calendar
                if calendar is not None and not calendar.empty:
                    if 'Earnings Date' in calendar.index:
                        earnings_date = calendar.loc['Earnings Date']
                        if hasattr(earnings_date, 'iloc') and len(earnings_date) > 0:
                            next_earnings = earnings_date.iloc[0]
                            if pd.notna(next_earnings):
                                days_to_earnings = (next_earnings - datetime.now()).days
                                if -2 <= days_to_earnings <= 7:
                                    catalysts.append({
                                        "type": "earnings",
                                        "impact": "high",
                                        "description": f"Earnings {'just reported' if days_to_earnings < 0 else f'in {days_to_earnings} days'}",
                                        "date": str(next_earnings)[:10]
                                    })
            except:
                pass
            
            # Check volume spike
            vol_ratio = analysis["change_today"].get("volume_vs_avg", 1)
            if vol_ratio > 2:
                catalysts.append({
                    "type": "volume_spike",
                    "impact": "medium" if vol_ratio < 3 else "high",
                    "description": f"Volume {vol_ratio:.1f}x above average",
                    "volume_ratio": vol_ratio
                })
            
            # Technical level checks
            try:
                high_52 = safe_float(info.get('fiftyTwoWeekHigh'), 0)
                low_52 = safe_float(info.get('fiftyTwoWeekLow'), 0)
                current = analysis["current_price"]
                
                if high_52 > 0 and current >= high_52 * 0.95:
                    catalysts.append({
                        "type": "technical",
                        "impact": "medium",
                        "description": "Near 52-week high",
                        "level": round(high_52, 2)
                    })
                elif low_52 > 0 and current <= low_52 * 1.05:
                    catalysts.append({
                        "type": "technical",
                        "impact": "medium",
                        "description": "Near 52-week low",
                        "level": round(low_52, 2)
                    })
            except:
                pass
            
            analysis["potential_catalysts"] = catalysts
            
            # Generate AI summary
            direction = analysis["change_today"].get("direction", "flat")
            change_pct = analysis["change_today"].get("change_pct", 0)
            strength = analysis["movement_strength"]
            
            summary_parts = []
            summary_parts.append(f"{ticker.upper()} is {direction} {abs(change_pct):.1f}% today")
            
            if strength in ["extreme", "significant"]:
                summary_parts.append(f"({strength} movement)")
            
            if catalysts:
                catalyst_types = [c["type"] for c in catalysts]
                if "news" in catalyst_types:
                    summary_parts.append("driven by recent news coverage")
                if "earnings" in catalyst_types:
                    summary_parts.append("related to earnings activity")
                if "volume_spike" in catalyst_types:
                    summary_parts.append("with heavy trading volume")
            else:
                summary_parts.append("with no obvious catalyst identified")
            
            analysis["ai_summary"] = " ".join(summary_parts) + "."
            
            return analysis
        
        from starlette.concurrency import run_in_threadpool
        result = await run_in_threadpool(analyze_movement)
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing movement for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 1. Insider Cluster Buy Alerts
@api_router.get("/stocks/{ticker}/insider-alerts")
async def get_insider_alerts(ticker: str):
    """
    Detect insider cluster buying patterns.
    Alert when multiple insiders buy within 2 weeks = strong signal.
    """
    try:
        def fetch_insider_data():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            
            result = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "analysis_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "insider_transactions": [],
                "cluster_alert": None,
                "ceo_buying": False,
                "signal_strength": "none",
                "summary": ""
            }
            
            try:
                insider_txns = stock.insider_transactions
                if insider_txns is not None and not insider_txns.empty:
                    transactions = []
                    buy_dates = []
                    ceo_bought = False
                    total_buy_value = 0
                    
                    for idx, row in insider_txns.head(20).iterrows():
                        shares = safe_float(row.get('Shares'), 0)
                        value = safe_float(row.get('Value'), 0)
                        insider_name = row.get('Insider', 'Unknown')
                        title = row.get('Position', row.get('Relationship', 'Unknown'))
                        
                        txn_date = None
                        if pd.notna(idx):
                            try:
                                txn_date = str(idx)[:10]
                            except:
                                pass
                        
                        txn_type = "buy" if shares > 0 else "sell"
                        
                        transactions.append({
                            "date": txn_date,
                            "insider": insider_name,
                            "title": title,
                            "type": txn_type,
                            "shares": abs(int(shares)),
                            "value": abs(value)
                        })
                        
                        if shares > 0:  # Buy
                            if txn_date:
                                buy_dates.append(txn_date)
                            total_buy_value += abs(value)
                            if title and any(x in title.lower() for x in ['ceo', 'chief executive', 'president']):
                                ceo_bought = True
                    
                    result["insider_transactions"] = transactions[:10]
                    result["ceo_buying"] = ceo_bought
                    
                    # Check for cluster buying (multiple buys within 14 days)
                    if len(buy_dates) >= 2:
                        recent_buys = []
                        for d in buy_dates[:5]:
                            try:
                                parsed = datetime.strptime(d, "%Y-%m-%d")
                                if (datetime.now() - parsed).days <= 30:
                                    recent_buys.append(d)
                            except:
                                pass
                        
                        if len(recent_buys) >= 3:
                            result["cluster_alert"] = {
                                "type": "CLUSTER BUY",
                                "count": len(recent_buys),
                                "period_days": 30,
                                "total_value": total_buy_value
                            }
                            result["signal_strength"] = "strong"
                        elif len(recent_buys) >= 2:
                            result["cluster_alert"] = {
                                "type": "MULTIPLE BUYS",
                                "count": len(recent_buys),
                                "period_days": 30,
                                "total_value": total_buy_value
                            }
                            result["signal_strength"] = "moderate"
                    
                    # Generate summary
                    if result["signal_strength"] == "strong":
                        result["summary"] = f"🚨 STRONG SIGNAL: {len(buy_dates)} insiders bought in last 30 days"
                        if ceo_bought:
                            result["summary"] += " including CEO"
                    elif result["signal_strength"] == "moderate":
                        result["summary"] = "⚠️ MODERATE SIGNAL: Multiple insider buys detected"
                    elif ceo_bought:
                        result["summary"] = "📊 CEO/President buying activity detected"
                        result["signal_strength"] = "notable"
                    else:
                        result["summary"] = "No significant insider buying cluster detected"
                        
            except Exception as e:
                result["error"] = str(e)
            
            return result
        
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(fetch_insider_data)
        
    except Exception as e:
        logger.error(f"Error fetching insider alerts for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 2. Whale Watch - Institutional Holdings Analysis
@api_router.get("/stocks/{ticker}/whale-watch")
async def get_whale_watch(ticker: str):
    """
    Track institutional investor activity.
    Identify when top funds are accumulating.
    """
    try:
        def fetch_institutional_data():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            
            result = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "analysis_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "institutional_summary": {},
                "top_holders": [],
                "fund_activity": {},
                "whale_signal": None,
                "summary": ""
            }
            
            try:
                # Institutional holdings summary
                inst_pct = safe_float(info.get('heldPercentInstitutions'), 0) * 100
                insider_pct = safe_float(info.get('heldPercentInsiders'), 0) * 100
                float_shares = safe_float(info.get('floatShares'), 0)
                shares_outstanding = safe_float(info.get('sharesOutstanding'), 0)
                
                result["institutional_summary"] = {
                    "institutional_ownership_pct": round(inst_pct, 1),
                    "insider_ownership_pct": round(insider_pct, 1),
                    "float_shares": float_shares,
                    "shares_outstanding": shares_outstanding,
                    "float_pct": round((float_shares / shares_outstanding * 100) if shares_outstanding > 0 else 0, 1)
                }
                
                # Top institutional holders
                inst_holders = stock.institutional_holders
                if inst_holders is not None and not inst_holders.empty:
                    holders = []
                    for idx, row in inst_holders.head(10).iterrows():
                        holder_name = row.get('Holder', 'Unknown')
                        shares = safe_float(row.get('Shares'), 0)
                        value = safe_float(row.get('Value'), 0)
                        pct = safe_float(row.get('pctHeld', row.get('% Out', 0)), 0)
                        if isinstance(pct, str):
                            pct = 0
                        
                        # Check if it's a major fund
                        is_major = any(x in holder_name.lower() for x in [
                            'vanguard', 'blackrock', 'state street', 'fidelity', 
                            'berkshire', 'capital', 'wellington', 't. rowe',
                            'jpmorgan', 'morgan stanley', 'goldman'
                        ])
                        
                        holders.append({
                            "name": holder_name,
                            "shares": int(shares),
                            "value": value,
                            "pct_held": round(pct * 100 if pct < 1 else pct, 2),
                            "is_major_fund": is_major
                        })
                    
                    result["top_holders"] = holders
                    
                    # Count major fund holders
                    major_count = sum(1 for h in holders if h["is_major_fund"])
                    result["fund_activity"] = {
                        "major_fund_count": major_count,
                        "top_10_concentration": round(sum(h["pct_held"] for h in holders), 1)
                    }
                    
                    # Generate whale signal
                    if major_count >= 5 and inst_pct > 70:
                        result["whale_signal"] = {
                            "type": "HEAVILY INSTITUTIONALIZED",
                            "strength": "strong",
                            "description": f"{major_count} major funds hold {inst_pct:.0f}% of shares"
                        }
                    elif major_count >= 3:
                        result["whale_signal"] = {
                            "type": "INSTITUTIONAL FAVORITE",
                            "strength": "moderate", 
                            "description": f"{major_count} major funds among top holders"
                        }
                
                # Generate summary
                if result.get("whale_signal"):
                    result["summary"] = f"🐋 {result['whale_signal']['type']}: {result['whale_signal']['description']}"
                elif inst_pct > 80:
                    result["summary"] = f"High institutional ownership ({inst_pct:.0f}%)"
                elif inst_pct < 30:
                    result["summary"] = f"Low institutional ownership ({inst_pct:.0f}%) - potential undiscovered"
                else:
                    result["summary"] = f"Moderate institutional ownership ({inst_pct:.0f}%)"
                    
            except Exception as e:
                result["error"] = str(e)
            
            return result
        
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(fetch_institutional_data)
        
    except Exception as e:
        logger.error(f"Error fetching whale watch for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 3. Similar Stocks - Pattern Matching
@api_router.get("/stocks/{ticker}/similar-stocks")
async def get_similar_stocks(ticker: str):
    """
    Find stocks with similar characteristics to potential winners.
    Matches by sector, market cap, growth, and valuation metrics.
    """
    try:
        def find_similar():
            stock = ticker_cache.get_or_create(ticker)
            info = stock.info
            
            result = {
                "ticker": ticker.upper(),
                "company_name": info.get('longName', ticker.upper()),
                "analysis_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "profile": {},
                "similar_stocks": [],
                "peer_comparison": {},
                "summary": ""
            }
            
            # Build profile of the target stock
            sector = info.get('sector', 'Unknown')
            industry = info.get('industry', 'Unknown')
            market_cap = safe_float(info.get('marketCap'), 0)
            pe_ratio = safe_float(info.get('trailingPE'), 0)
            revenue_growth = safe_float(info.get('revenueGrowth'), 0)
            profit_margin = safe_float(info.get('profitMargins'), 0)
            
            # Determine market cap tier
            if market_cap >= 200e9:
                cap_tier = "mega"
            elif market_cap >= 10e9:
                cap_tier = "large"
            elif market_cap >= 2e9:
                cap_tier = "mid"
            elif market_cap >= 300e6:
                cap_tier = "small"
            else:
                cap_tier = "micro"
            
            result["profile"] = {
                "sector": sector,
                "industry": industry,
                "market_cap": market_cap,
                "market_cap_tier": cap_tier,
                "pe_ratio": round(pe_ratio, 1) if pe_ratio else None,
                "revenue_growth_pct": round(revenue_growth * 100, 1) if revenue_growth else None,
                "profit_margin_pct": round(profit_margin * 100, 1) if profit_margin else None
            }
            
            # Define peer groups by sector/industry
            peer_tickers = {
                "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "CRM", "ADBE", "ORCL", "INTC"],
                "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY", "TMO", "ABT", "DHR", "BMY"],
                "Financial Services": ["JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "V"],
                "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "MCD", "SBUX", "TGT", "LOW", "BKNG", "MAR"],
                "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS", "CHTR", "EA"],
                "Industrials": ["CAT", "DE", "UNP", "HON", "UPS", "BA", "RTX", "LMT", "GE", "MMM"],
                "Consumer Defensive": ["WMT", "PG", "KO", "PEP", "COST", "PM", "MO", "CL", "KMB", "GIS"],
                "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "KMI"],
                "Basic Materials": ["LIN", "APD", "ECL", "SHW", "FCX", "NEM", "NUE", "DOW", "DD", "VMC"],
                "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "DLR", "AVB"],
                "Utilities": ["NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "XEL", "ED", "WEC"]
            }
            
            # Get peers in same sector
            sector_peers = peer_tickers.get(sector, [])
            if ticker.upper() in sector_peers:
                sector_peers = [p for p in sector_peers if p != ticker.upper()]
            
            similar_stocks = []
            for peer_ticker in sector_peers[:6]:
                try:
                    peer = yf.Ticker(peer_ticker)
                    peer_info = peer.info
                    
                    peer_cap = safe_float(peer_info.get('marketCap'), 0)
                    peer_pe = safe_float(peer_info.get('trailingPE'), 0)
                    peer_growth = safe_float(peer_info.get('revenueGrowth'), 0)
                    peer_margin = safe_float(peer_info.get('profitMargins'), 0)
                    
                    # Calculate similarity score
                    similarity = 0
                    
                    # Market cap similarity (within 5x)
                    if market_cap > 0 and peer_cap > 0:
                        cap_ratio = max(market_cap, peer_cap) / min(market_cap, peer_cap)
                        if cap_ratio < 2:
                            similarity += 30
                        elif cap_ratio < 5:
                            similarity += 15
                    
                    # PE similarity
                    if pe_ratio > 0 and peer_pe > 0:
                        pe_diff = abs(pe_ratio - peer_pe) / max(pe_ratio, peer_pe)
                        if pe_diff < 0.2:
                            similarity += 25
                        elif pe_diff < 0.5:
                            similarity += 10
                    
                    # Growth similarity
                    if revenue_growth and peer_growth:
                        growth_diff = abs(revenue_growth - peer_growth)
                        if growth_diff < 0.1:
                            similarity += 25
                        elif growth_diff < 0.2:
                            similarity += 10
                    
                    # Same industry bonus
                    if peer_info.get('industry') == industry:
                        similarity += 20
                    
                    similar_stocks.append({
                        "ticker": peer_ticker,
                        "name": peer_info.get('shortName', peer_ticker),
                        "market_cap": peer_cap,
                        "pe_ratio": round(peer_pe, 1) if peer_pe else None,
                        "revenue_growth_pct": round(peer_growth * 100, 1) if peer_growth else None,
                        "profit_margin_pct": round(peer_margin * 100, 1) if peer_margin else None,
                        "similarity_score": similarity,
                        "price": safe_float(peer_info.get('currentPrice') or peer_info.get('regularMarketPrice'), 0),
                        "change_pct": safe_float(peer_info.get('regularMarketChangePercent'), 0)
                    })
                except:
                    continue
            
            # Sort by similarity score
            similar_stocks.sort(key=lambda x: x["similarity_score"], reverse=True)
            result["similar_stocks"] = similar_stocks[:5]
            
            # Peer comparison summary
            if similar_stocks:
                avg_pe = sum(s["pe_ratio"] or 0 for s in similar_stocks) / len(similar_stocks)
                avg_growth = sum(s["revenue_growth_pct"] or 0 for s in similar_stocks) / len(similar_stocks)
                
                result["peer_comparison"] = {
                    "your_pe": round(pe_ratio, 1) if pe_ratio else None,
                    "peer_avg_pe": round(avg_pe, 1),
                    "pe_premium_pct": round((pe_ratio - avg_pe) / avg_pe * 100, 1) if avg_pe > 0 and pe_ratio else None,
                    "your_growth": round(revenue_growth * 100, 1) if revenue_growth else None,
                    "peer_avg_growth": round(avg_growth, 1)
                }
                
                # Generate summary
                if result["peer_comparison"]["pe_premium_pct"]:
                    if result["peer_comparison"]["pe_premium_pct"] < -20:
                        result["summary"] = f"📉 Trading at {abs(result['peer_comparison']['pe_premium_pct']):.0f}% discount to peers"
                    elif result["peer_comparison"]["pe_premium_pct"] > 20:
                        result["summary"] = f"📈 Trading at {result['peer_comparison']['pe_premium_pct']:.0f}% premium to peers"
                    else:
                        result["summary"] = f"Trading in line with {sector} peers"
                else:
                    result["summary"] = f"Found {len(similar_stocks)} similar stocks in {sector}"
            
            return result
        
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(find_similar)
        
    except Exception as e:
        logger.error(f"Error finding similar stocks for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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