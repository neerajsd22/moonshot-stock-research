import { useState, useEffect, useRef, useCallback } from 'react';
import '@/App.css';
import axios from 'axios';
import { Search, TrendingUp, Pin, X, LayoutGrid, LayoutList, ExternalLink, Plus, List, Bell, BarChart3, Settings, BrainCircuit, Cpu, ChevronDown, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CategoryPage from './CategoryPage';
import CreateCategoryDialog from './components/CreateCategoryDialog';
import WatchlistManager from './components/WatchlistManager';
import PriceAlertManager from './components/PriceAlertManager';
import AdvancedChart from './components/AdvancedChart';
import CategorySettings, { ALL_CATEGORIES } from './components/CategorySettings';
import AccessGate from './components/AccessGate';
import AdminPage from './components/AdminPage';
import {
  LineChart,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  defs,
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Lucide icon mapping for categories
const LUCIDE_ICONS = {
  BrainCircuit: BrainCircuit,
  Cpu: Cpu,
};

// Helper to render category icon
const CategoryIcon = ({ icon, isLucide, className = "text-4xl mb-3" }) => {
  if (isLucide && LUCIDE_ICONS[icon]) {
    const IconComponent = LUCIDE_ICONS[icon];
    return <div className={className}><IconComponent className="w-10 h-10 text-primary mx-auto" /></div>;
  }
  return <div className={className}>{icon}</div>;
};

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  // Changed from single stock to array of stacked stocks (max 10)
  const [stackedStocks, setStackedStocks] = useState([]);
  const stackedStocksRef = useRef(stackedStocks); // Ref to track current stackedStocks
  // Keep selectedStock for backward compatibility with some features
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockQuote, setStockQuote] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [pinnedStocks, setPinnedStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('spacious');
  const [period, setPeriod] = useState('1y');
  const [earningsLink, setEarningsLink] = useState(null);
  const [earningsSnapshot, setEarningsSnapshot] = useState(null);
  const [loadingEarningsSnapshot, setLoadingEarningsSnapshot] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false);
  const [bullBearSentiment, setBullBearSentiment] = useState(null);
  const [loadingBullBear, setLoadingBullBear] = useState(false);
  const [comparisonPoints, setComparisonPoints] = useState([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const chartRef = useRef(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [showWatchlistManager, setShowWatchlistManager] = useState(false);
  const [showPriceAlertManager, setShowPriceAlertManager] = useState(false);
  const [showAdvancedChart, setShowAdvancedChart] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [selectedMarket, setSelectedMarket] = useState('all'); // 'all', 'us', 'india'
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState(() => {
    const saved = localStorage.getItem('category_preferences');
    return saved ? JSON.parse(saved) : [];
  });
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [stockAnimating, setStockAnimating] = useState(false);
  const [loadingTicker, setLoadingTicker] = useState(null); // Track which ticker is loading
  
  const MAX_STACKED_STOCKS = 10;

  // Helper function to get currency symbol based on ticker
  const getCurrencySymbol = (ticker, currency) => {
    if (ticker?.endsWith('.NS') || ticker?.endsWith('.BO') || currency === 'INR') {
      return '₹';
    }
    return '$';
  };

  // Fetch pinned stocks on mount
  useEffect(() => {
    fetchPinnedStocks();
    fetchCustomCategories();
    fetchAlertCount();
  }, []);

  // Handle stock query parameter from category page
  useEffect(() => {
    const stockParam = searchParams.get('stock');
    if (stockParam) {
      // Check if stock already exists in the current stackedStocks
      const alreadyExists = stackedStocks.some(s => s.ticker === stockParam);
      if (alreadyExists) {
        toast.info(`${stockParam} is already displayed`);
      } else {
        selectStock(stockParam);
      }
      // Always clear the query param
      setSearchParams({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only trigger on searchParams change, selectStock handles its own duplicate check

  // Check price alerts periodically
  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const response = await axios.get(`${API}/price-alerts/check`);
        if (response.data.triggered_alerts.length > 0) {
          response.data.triggered_alerts.forEach(alert => {
            toast.success(
              `🔔 ${alert.ticker} hit $${alert.current_price.toFixed(2)} (target: ${alert.condition} $${alert.target_price})`,
              { duration: 10000 }
            );
          });
          fetchAlertCount();
        }
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    };

    // Check alerts every 60 seconds
    const interval = setInterval(checkAlerts, 60000);
    checkAlerts(); // Initial check
    return () => clearInterval(interval);
  }, []);

  const fetchAlertCount = async () => {
    try {
      const response = await axios.get(`${API}/price-alerts?active_only=true`);
      setAlertCount(response.data.length);
    } catch (error) {
      console.error('Error fetching alert count:', error);
    }
  };

  // Auto-refresh selected stock quote every 30 seconds
  useEffect(() => {
    if (selectedStock) {
      const interval = setInterval(() => {
        fetchStockQuote(selectedStock);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedStock]);

  const fetchPinnedStocks = async () => {
    try {
      const response = await axios.get(`${API}/pinned-stocks`);
      setPinnedStocks(response.data);
    } catch (error) {
      console.error('Error fetching pinned stocks:', error);
    }
  };

  const fetchCustomCategories = async () => {
    try {
      const response = await axios.get(`${API}/custom-categories`);
      setCustomCategories(response.data);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    }
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      await axios.post(`${API}/custom-categories`, categoryData);
      await fetchCustomCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${API}/custom-categories/${categoryId}`);
      await fetchCustomCategories();
      toast.success('Category deleted');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const searchStocks = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const exchangeFilter = selectedMarket === 'us' ? 'us' : selectedMarket === 'india' ? 'nse' : 'all';
      const response = await axios.get(`${API}/stocks/search`, {
        params: { q: query, exchange: exchangeFilter },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching stocks:', error);
      toast.error('Failed to search stocks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockQuote = async (ticker) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/quote`);
      setStockQuote(response.data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async (ticker, selectedPeriod) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/history`, {
        params: { period: selectedPeriod },
      });
      setHistoricalData(response.data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      toast.error('Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsLink = async (ticker) => {
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/earnings-link`);
      setEarningsLink(response.data);
    } catch (error) {
      console.error('Error fetching earnings link:', error);
    }
  };

  const fetchEarningsSnapshot = async (ticker) => {
    setLoadingEarningsSnapshot(true);
    setEarningsSnapshot(null);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/earnings-snapshot`);
      setEarningsSnapshot(response.data);
    } catch (error) {
      console.error('Error fetching earnings snapshot:', error);
    } finally {
      setLoadingEarningsSnapshot(false);
    }
  };

  const fetchAiAnalysis = async (ticker) => {
    setLoadingAiAnalysis(true);
    setAiAnalysis(null);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/ai-analysis`);
      setAiAnalysis(response.data);
      toast.success('AI Analysis complete');
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      setAiAnalysis({ error: true, message: error.response?.data?.detail || 'Failed to load AI analysis' });
      toast.error('AI analysis unavailable');
    } finally {
      setLoadingAiAnalysis(false);
    }
  };

  const fetchBullBearSentiment = async (ticker) => {
    setLoadingBullBear(true);
    setBullBearSentiment(null);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/bull-bear-sentiment`);
      setBullBearSentiment(response.data);
    } catch (error) {
      console.error('Error fetching bull/bear sentiment:', error);
      // Set fallback data
      setBullBearSentiment({
        bull_points: [
          'Strong market position and brand recognition',
          'Positive growth trends in key metrics',
          'Favorable analyst recommendations'
        ],
        bear_points: [
          'Market volatility may impact performance',
          'Competitive pressures in the industry',
          'Economic uncertainties to monitor'
        ]
      });
    } finally {
      setLoadingBullBear(false);
    }
  };

  const fetchStockNews = async (ticker) => {
    setLoadingNews(true);
    setNewsArticles([]);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/news`);
      setNewsArticles(response.data);
    } catch (error) {
      console.error('Error fetching stock news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  // Function to fetch all data for a single stock and return it as an object
  const fetchStockData = async (ticker) => {
    try {
      const [quoteRes, historyRes, earningsRes, earningsSnapshotRes, sentimentRes, newsRes] = await Promise.all([
        axios.get(`${API}/stocks/${ticker}/quote`),
        axios.get(`${API}/stocks/${ticker}/history`, { params: { period } }),
        axios.get(`${API}/stocks/${ticker}/earnings-link`).catch(() => ({ data: null })),
        axios.get(`${API}/stocks/${ticker}/earnings-snapshot`).catch(() => ({ data: null })),
        axios.get(`${API}/stocks/${ticker}/bull-bear-sentiment`).catch(() => ({ 
          data: {
            bull_points: ['Strong market position', 'Positive growth trends', 'Favorable recommendations'],
            bear_points: ['Market volatility risks', 'Competitive pressures', 'Economic uncertainties']
          }
        })),
        axios.get(`${API}/stocks/${ticker}/news`).catch(() => ({ data: [] })),
      ]);
      
      return {
        ticker,
        quote: quoteRes.data,
        historicalData: historyRes.data,
        earningsLink: earningsRes.data,
        earningsSnapshot: earningsSnapshotRes.data,
        bullBearSentiment: sentimentRes.data,
        newsArticles: newsRes.data,
        period,
      };
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
      return null;
    }
  };

  const selectStock = async (ticker) => {
    // Check if stock is already in the stack
    if (stackedStocks.some(s => s.ticker === ticker)) {
      toast.info(`${ticker} is already displayed`);
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    
    // Check max limit
    if (stackedStocks.length >= MAX_STACKED_STOCKS) {
      toast.warning(`Maximum ${MAX_STACKED_STOCKS} stocks can be displayed. Remove one to add more.`);
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    
    // Start animation and collapse categories
    setStockAnimating(true);
    setCategoriesCollapsed(true);
    setSearchResults([]);
    setSearchQuery('');
    
    // Set loading ticker for animation
    setLoadingTicker(ticker);
    setLoading(true);
    
    // Fetch stock data
    const stockData = await fetchStockData(ticker);
    
    setLoading(false);
    setLoadingTicker(null);
    
    if (stockData) {
      // Add to stacked stocks
      setStackedStocks(prev => [...prev, stockData]);
      
      // Also set as selectedStock for backward compatibility
      setSelectedStock(ticker);
      setStockQuote(stockData.quote);
      setHistoricalData(stockData.historicalData);
      setEarningsLink(stockData.earningsLink);
      setEarningsSnapshot(stockData.earningsSnapshot);
      setBullBearSentiment(stockData.bullBearSentiment);
      setNewsArticles(stockData.newsArticles);
      setComparisonPoints([]);
      setComparisonMode(false);
    }
    
    // End animation after data loads
    setTimeout(() => setStockAnimating(false), 300);
  };

  // Function to dismiss/remove a stock from the stack
  const dismissStock = (ticker) => {
    setStackedStocks(prev => prev.filter(s => s.ticker !== ticker));
    
    // If the dismissed stock was the selected one, update selectedStock
    if (selectedStock === ticker) {
      const remaining = stackedStocks.filter(s => s.ticker !== ticker);
      if (remaining.length > 0) {
        const lastStock = remaining[remaining.length - 1];
        setSelectedStock(lastStock.ticker);
        setStockQuote(lastStock.quote);
        setHistoricalData(lastStock.historicalData);
        setEarningsLink(lastStock.earningsLink);
        setBullBearSentiment(lastStock.bullBearSentiment);
        setNewsArticles(lastStock.newsArticles);
      } else {
        setSelectedStock(null);
        setStockQuote(null);
        setHistoricalData([]);
        setEarningsLink(null);
        setBullBearSentiment(null);
        setNewsArticles([]);
        setCategoriesCollapsed(false);
      }
    }
    
    toast.success(`${ticker} removed`);
  };

  const pinStock = async (ticker, companyName) => {
    try {
      await axios.post(`${API}/pinned-stocks`, {
        ticker,
        company_name: companyName,
      });
      await fetchPinnedStocks();
      toast.success(`${ticker} pinned successfully`);
    } catch (error) {
      console.error('Error pinning stock:', error);
      toast.error('Failed to pin stock');
    }
  };

  const unpinStock = async (ticker) => {
    try {
      await axios.delete(`${API}/pinned-stocks/${ticker}`);
      await fetchPinnedStocks();
      toast.success(`${ticker} unpinned`);
    } catch (error) {
      console.error('Error unpinning stock:', error);
      toast.error('Failed to unpin stock');
    }
  };

  const handlePeriodChange = async (newPeriod) => {
    setPeriod(newPeriod);
    setComparisonPoints([]);
    if (selectedStock) {
      await fetchHistoricalData(selectedStock, newPeriod);
    }
  };

  // Handle comparison point selection from dropdown
  const handleComparisonSelect = (pointIndex, dateValue) => {
    const selectedData = historicalData.find(d => d.date === dateValue);
    if (!selectedData) return;

    const newPoint = {
      date: selectedData.date,
      price: selectedData.close,
    };

    if (pointIndex === 0) {
      // Setting first point
      setComparisonPoints([newPoint, comparisonPoints[1]].filter(Boolean));
    } else {
      // Setting second point
      setComparisonPoints([comparisonPoints[0], newPoint].filter(Boolean));
    }
  };

  const clearComparison = () => {
    setComparisonPoints([]);
    setComparisonMode(false);
    toast.info('Comparison mode disabled');
  };

  const toggleComparisonMode = () => {
    if (comparisonMode) {
      setComparisonMode(false);
      setComparisonPoints([]);
      toast.info('Comparison mode disabled');
    } else {
      setComparisonMode(true);
      toast.success('Comparison mode enabled! Select dates from the dropdowns.', { duration: 3000 });
    }
  };

  const formatXAxisTick = (dateStr) => {
    const date = new Date(dateStr);
    
    if (period === '1mo') {
      // Show dates in format like "Jan 5"
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === '3mo' || period === '6mo' || period === '1y') {
      // Show months like "Jan", "Feb", etc.
      return date.toLocaleDateString('en-US', { month: 'short' });
    } else if (period === '5y') {
      // Show years like "2021", "2022"
      return date.getFullYear().toString();
    }
    return dateStr;
  };

  const getXAxisInterval = () => {
    if (period === '1mo') return 6; // Show every 7th day approximately
    if (period === '3mo') return 20; // Show monthly
    if (period === '6mo') return 30; // Show monthly
    if (period === '1y') return 60; // Show every 2 months
    if (period === '5y') return 250; // Show yearly
    return 'preserveStartEnd';
  };

  const isStockPinned = (ticker) => {
    return pinnedStocks.some((stock) => stock.ticker === ticker);
  };

  const isDense = viewMode === 'dense';

  // US Market categories
  const usCategories = [
    { name: 'Finance', slug: 'finance', icon: '💵' },
    { name: 'Technology', slug: 'technology', icon: '💻' },
    { name: 'AI', slug: 'ai', icon: '🧠' },
    { name: 'Semiconductor', slug: 'semiconductor', icon: '🔲' },
    { name: 'FMCG', slug: 'fmcg', icon: '🛒' },
    { name: 'Materials', slug: 'materials', icon: '🥇' },
    { name: 'Healthcare', slug: 'healthcare', icon: '🏥' },
    { name: 'Energy', slug: 'energy', icon: '⚡' },
    { name: 'Consumer Discretionary', slug: 'consumer-discretionary', icon: '🛍️' },
  ];

  // Indian Market categories
  const indiaCategories = [
    { name: 'Nifty 50', slug: 'nifty50', icon: '🇮🇳' },
    { name: 'Nifty IT', slug: 'nifty-it', icon: '💻' },
    { name: 'Nifty Bank', slug: 'nifty-bank', icon: '🏦' },
    { name: 'Nifty Pharma', slug: 'nifty-pharma', icon: '💊' },
    { name: 'Nifty Auto', slug: 'nifty-auto', icon: '🚗' },
    { name: 'Nifty FMCG', slug: 'nifty-fmcg', icon: '🛒' },
    { name: 'Nifty Metal', slug: 'nifty-metal', icon: '⚙️' },
    { name: 'Nifty Realty', slug: 'nifty-realty', icon: '🏢' },
    { name: 'Nifty PSU', slug: 'nifty-psu', icon: '🏛️' },
    { name: 'New Age Tech', slug: 'new-age-tech', icon: '🚀' },
  ];

  // Filter categories based on enabled preferences and market selection
  const filterCategories = (cats) => {
    return cats.filter(cat => 
      enabledCategories.length === 0 || enabledCategories.includes(cat.slug)
    );
  };

  // Get categories based on selected market and enabled preferences
  const categories = selectedMarket === 'us' 
    ? filterCategories(usCategories)
    : selectedMarket === 'india' 
      ? filterCategories(indiaCategories)
      : filterCategories([...usCategories, ...indiaCategories]);

  const handleCategoryClick = (slug) => {
    navigate(`/category/${slug}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[rgba(217,70,239,0.1)]">
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => {
                  // Clear all stacked stocks and reset state
                  setStackedStocks([]);
                  setSelectedStock(null);
                  setStockQuote(null);
                  setHistoricalData([]);
                  setComparisonPoints([]);
                  setComparisonMode(false);
                  setCategoriesCollapsed(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                data-testid="home-link"
              >
                <TrendingUp className="w-8 h-8 text-[#d946ef] transition-all duration-300 group-hover:scale-110" data-testid="logo-icon" />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold gold-text" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="app-title">
                    Moonshot
                  </h1>
                  <p className="text-xs text-gray-400 hidden sm:block" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.02em' }}>
                    Discover Your Next Big Win
                  </p>
                </div>
              </div>
              
              {/* Current Date Display */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]" data-testid="current-date">
                <span className="text-[#d946ef] text-sm">📅</span>
                <span className="text-white text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Watchlists Button */}
              <Button
                data-testid="watchlists-button"
                variant="outline"
                size="sm"
                onClick={() => setShowWatchlistManager(true)}
                className="flex items-center gap-2 btn-outline-gold"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Watchlists</span>
              </Button>
              
              {/* Price Alerts Button */}
              <Button
                data-testid="price-alerts-button"
                variant="outline"
                size="sm"
                onClick={() => setShowPriceAlertManager(true)}
                className="flex items-center gap-2 relative btn-outline-gold"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Alerts</span>
                {alertCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-[#d946ef] text-[#0a0a0f]"
                  >
                    {alertCount}
                  </Badge>
                )}
              </Button>
              
              {/* Category Settings Button */}
              <Button
                data-testid="category-settings-button"
                variant="outline"
                size="sm"
                onClick={() => setShowCategorySettings(true)}
                className="flex items-center gap-2 btn-outline-gold"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Categories</span>
              </Button>
              
              {/* View Mode Toggle */}
              <Button
                data-testid="view-mode-toggle"
                variant="outline"
                size="sm"
                onClick={() => setViewMode(isDense ? 'spacious' : 'dense')}
                className="flex items-center gap-2 btn-outline-gold"
              >
                {isDense ? <LayoutGrid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
                <span className="hidden sm:inline">{isDense ? 'Expand' : 'Dense'}</span>
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              data-testid="stock-search-input"
              type="text"
              placeholder="Search by ticker or company name (e.g., AAPL, Microsoft)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchStocks(e.target.value);
              }}
              className="pl-12 h-14 text-base input-premium rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <Card className="absolute top-full mt-2 w-full z-50 max-h-[300px] overflow-y-auto" data-testid="search-results-dropdown">
                <CardContent className="p-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.ticker}
                      data-testid={`search-result-${result.ticker}`}
                      onClick={() => selectStock(result.ticker)}
                      className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {result.ticker}
                          </div>
                          <div className="text-sm text-muted-foreground">{result.name}</div>
                        </div>
                        {result.exchange && (
                          <Badge variant="outline" className="text-xs">
                            {result.exchange}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 lg:px-8 lg:py-10">
        {/* Categories Section - Collapsible */}
        <div className="mb-10" data-testid="categories-section">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCategoriesCollapsed(!categoriesCollapsed)}
              className="flex items-center gap-2 group"
              data-testid="categories-toggle"
            >
              <ChevronDown 
                className={`w-5 h-5 text-[#d946ef] transition-transform duration-300 ${categoriesCollapsed ? '-rotate-90' : ''}`}
              />
              <h2
                className="text-xl font-semibold text-white section-title-gold group-hover:text-[#f0abfc] transition-colors"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Explore by Category
              </h2>
              {categoriesCollapsed && (
                <span className="text-xs text-gray-500 ml-2">(click to expand)</span>
              )}
            </button>
            
            {/* Market Selector - Hide when collapsed */}
            {!categoriesCollapsed && (
              <div className="flex gap-1 bg-[rgba(255,255,255,0.03)] p-1.5 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="market-selector">
                <Button
                  size="sm"
                  variant={selectedMarket === 'all' ? 'default' : 'ghost'}
                  onClick={() => setSelectedMarket('all')}
                  data-testid="market-all"
                  className={`text-xs rounded-lg ${selectedMarket === 'all' ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
                >
                  🌍 All
                </Button>
                <Button
                  size="sm"
                  variant={selectedMarket === 'us' ? 'default' : 'ghost'}
                  onClick={() => setSelectedMarket('us')}
                  data-testid="market-us"
                  className={`text-xs rounded-lg ${selectedMarket === 'us' ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
                >
                  🇺🇸 US
                </Button>
                <Button
                  size="sm"
                  variant={selectedMarket === 'india' ? 'default' : 'ghost'}
                  onClick={() => setSelectedMarket('india')}
                  data-testid="market-india"
                  className={`text-xs rounded-lg ${selectedMarket === 'india' ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
                >
                  🇮🇳 India
                </Button>
              </div>
            )}
          </div>
          
          {/* Collapsible content */}
          <div 
            className={`transition-all duration-400 ease-out overflow-hidden ${categoriesCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 stagger-children">
              {categories.map((category) => (
                <Card
                  key={category.slug}
                  className="premium-card gold-gradient-border cursor-pointer card-hover-lift"
                  onClick={() => handleCategoryClick(category.slug)}
                  data-testid={`category-${category.slug}`}
                >
                  <CardContent className="p-6 text-center">
                    <CategoryIcon icon={category.icon} isLucide={category.isLucide} />
                    <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {category.name}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Custom Categories */}
              {customCategories.map((category) => (
                <Card
                  key={category.id}
                  className="premium-card gold-gradient-border cursor-pointer card-hover-lift relative group"
                  onClick={() => handleCategoryClick(`custom-${category.id}`)}
                  data-testid={`category-custom-${category.id}`}
                >
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                    data-testid={`delete-category-${category.id}`}
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">⭐</div>
                    <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {category.tickers.length} stocks
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Create Custom Category Button */}
              <Card
                className="bg-[rgba(255,255,255,0.02)] border-2 border-dashed border-[rgba(212,175,55,0.3)] hover:border-[#d946ef] transition-all duration-300 cursor-pointer hover:-translate-y-1"
                onClick={() => setShowCreateDialog(true)}
                data-testid="create-category-button"
              >
                <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                  <Plus className="w-8 h-8 text-primary mb-2" />
                  <div className="text-sm font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Custom
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Pinned Stocks Section - Below categories, only visible when there are pinned stocks */}
        {pinnedStocks.length > 0 && (
          <div className="mb-8" data-testid="pinned-stocks-section">
            <h2
              className="text-xl font-semibold mb-4"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Pinned Stocks
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" data-testid="pinned-stocks-container">
              {pinnedStocks.map((stock) => (
                <Card
                  key={stock.ticker}
                  data-testid={`pinned-stock-${stock.ticker}`}
                  className="min-w-[200px] bg-card border border-border/50 hover:border-primary/50 transition-colors duration-200 cursor-pointer flex-shrink-0"
                  onClick={() => selectStock(stock.ticker)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div
                          className="text-lg font-bold"
                          style={{ fontFamily: 'DM Mono, monospace' }}
                        >
                          {stock.ticker}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {stock.company_name}
                        </div>
                      </div>
                      <button
                        data-testid={`unpin-button-${stock.ticker}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          unpinStock(stock.ticker);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <CreateCategoryDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreateCategory={handleCreateCategory}
        />

        {/* Pinned Stocks Section - OLD LOCATION - REMOVED */}
        
        {/* Fun Loading Animation when fetching stock data */}
        {loadingTicker && (
          <div className="fade-in" data-testid="stock-loading-animation">
            <Card className="premium-card gold-gradient-border overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-6">
                  {/* Animated Rocket */}
                  <div className="relative">
                    <div className="animate-bounce">
                      <div className="text-6xl">🚀</div>
                    </div>
                    {/* Trailing stars */}
                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
                      <span className="text-yellow-400 animate-ping" style={{ animationDelay: '0ms' }}>✨</span>
                      <span className="text-yellow-400 animate-ping" style={{ animationDelay: '150ms' }}>✨</span>
                      <span className="text-yellow-400 animate-ping" style={{ animationDelay: '300ms' }}>✨</span>
                    </div>
                  </div>
                  
                  {/* Loading text */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Fetching <span className="text-[#d946ef]">{loadingTicker}</span>
                    </h3>
                    <p className="text-gray-400 text-sm">Preparing your moonshot data...</p>
                  </div>
                  
                  {/* Animated progress bar */}
                  <div className="w-64 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#d946ef] via-[#f0abfc] to-[#d946ef] rounded-full"
                      style={{
                        animation: 'shimmer 1.5s ease-in-out infinite',
                        backgroundSize: '200% 100%'
                      }}
                    />
                  </div>
                  
                  {/* Fun loading messages */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Analyzing market data • Crunching numbers • Almost there!</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dense View - Compact table showing all stacked stocks with Key Stats */}
        {viewMode === 'dense' && stackedStocks.length > 0 && (
          <div className="fade-in" data-testid="dense-view-container">
            <Card className="premium-card gold-gradient-border overflow-hidden">
              <CardHeader className="p-4 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Stacked Stocks ({stackedStocks.length}/{MAX_STACKED_STOCKS})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('spacious')}
                    className="flex items-center gap-2 btn-outline-gold"
                    data-testid="expand-view-button"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Expand
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="dense-stocks-table">
                    <thead>
                      <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)]">
                        <th className="text-left p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ticker</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Change</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Day Open</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Day High</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Day Low</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Market Cap</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">P/E</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">52W High</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">52W Low</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Volume</th>
                        <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stackedStocks.map((stock, index) => (
                        <tr 
                          key={stock.ticker} 
                          className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                          data-testid={`dense-row-${stock.ticker}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>{stock.ticker}</span>
                              <span className="text-xs text-gray-500 hidden lg:inline truncate max-w-[120px]">{stock.quote.company_name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-semibold text-white mono-numbers">
                              {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.price?.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-medium mono-numbers ${stock.quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.quote.change >= 0 ? '+' : ''}{stock.quote.change?.toFixed(2)} ({stock.quote.change_percent?.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.day_open ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.day_open.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.day_high ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.day_high.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.day_low ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.day_low.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.market_cap ? `$${(stock.quote.market_cap / 1e9).toFixed(2)}B` : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.pe_ratio ? stock.quote.pe_ratio.toFixed(2) : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.high_52week ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.high_52week.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.low_52week ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.low_52week.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-gray-300 mono-numbers">
                            {stock.quote.volume ? `${(stock.quote.volume / 1e6).toFixed(2)}M` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissStock(stock.ticker)}
                              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                              data-testid={`dense-dismiss-${stock.ticker}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spacious View - Full stock details for each stacked stock */}
        {viewMode === 'spacious' && stackedStocks.length > 0 && (
          <div className="space-y-8" data-testid="stacked-stocks-container">
            {stackedStocks.map((stock, index) => (
              <div 
                key={stock.ticker} 
                className={`space-y-6 ${index === stackedStocks.length - 1 && stockAnimating ? 'stock-slide-in' : 'fade-in'}`}
                data-testid={`stock-details-${stock.ticker}`}
              >
                {/* Stock Header */}
                <Card className="premium-card gold-gradient-border">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <h2
                            className="text-3xl lg:text-4xl font-bold text-white"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                            data-testid={`stock-ticker-${stock.ticker}`}
                          >
                            {stock.quote.ticker}
                          </h2>
                          
                          {/* Market Status Badge */}
                          {stock.quote.market_state && (
                            <Badge 
                              variant={stock.quote.market_state === 'REGULAR' ? 'default' : 'secondary'}
                              className={`${stock.quote.market_state === 'REGULAR' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[rgba(255,255,255,0.05)] text-gray-400'}`}
                            >
                              <span className="inline-block w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse"></span>
                              {stock.quote.market_state === 'REGULAR' ? 'Market Open' : 'Market Closed'}
                            </Badge>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              isStockPinned(stock.quote.ticker)
                                ? unpinStock(stock.quote.ticker)
                                : pinStock(stock.quote.ticker, stock.quote.company_name)
                            }
                            className="flex items-center gap-2 btn-outline-gold"
                          >
                            <Pin className={`w-4 h-4 ${isStockPinned(stock.quote.ticker) ? 'fill-[#d946ef] text-[#d946ef]' : ''}`} />
                            {isStockPinned(stock.quote.ticker) ? 'Unpin' : 'Pin'}
                          </Button>
                          
                          {/* Dismiss Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dismissStock(stock.ticker)}
                            className="flex items-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400"
                            data-testid={`dismiss-stock-${stock.ticker}`}
                          >
                            <X className="w-4 h-4" />
                            Dismiss
                          </Button>
                        </div>
                        <p className="text-base text-gray-400 mt-2">
                          {stock.quote.company_name}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-4xl lg:text-5xl font-bold text-white mono-numbers">
                          {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.price?.toFixed(2)}
                        </div>
                        <div className={`text-base font-medium mt-2 mono-numbers ${stock.quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.quote.change >= 0 ? '+' : ''}{stock.quote.change?.toFixed(2)} ({stock.quote.change_percent?.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Stats */}
                <Card className="premium-card gold-gradient-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Key Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
                      {stock.quote.day_open && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">Day Open</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.day_open.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stock.quote.day_high && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">Day High</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.day_high.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stock.quote.day_low && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">Day Low</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.day_low.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stock.quote.market_cap && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">Market Cap</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            ${(stock.quote.market_cap / 1e9).toFixed(2)}B
                          </div>
                        </div>
                      )}
                      {stock.quote.pe_ratio && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">P/E Ratio</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {stock.quote.pe_ratio.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stock.quote.dividend_yield !== null && stock.quote.dividend_yield !== undefined && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">Dividend</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {stock.quote.dividend_yield.toFixed(2)}%
                          </div>
                        </div>
                      )}
                      {stock.quote.high_52week && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">52W High</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.high_52week.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stock.quote.low_52week && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">52W Low</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.low_52week.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {stock.quote.volume && (
                        <div className="stat-item">
                          <div className="text-sm text-gray-400">Volume</div>
                          <div className="text-base font-semibold mt-1 text-white mono-numbers">
                            {(stock.quote.volume / 1e6).toFixed(2)}M
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Chart and Detailed Analysis for selected stock */}
        {selectedStock && stockQuote && viewMode === 'spacious' && (
          <div className="space-y-6 fade-in" data-testid="stock-details-container">
            {/* Chart */}
            <Card className="premium-card gold-gradient-border">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-white text-2xl" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="chart-title">
                      {selectedStock}
                      </CardTitle>
                      <Button
                        data-testid="advanced-chart-button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedChart(true)}
                        className="flex items-center gap-2 btn-outline-gold"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Advanced
                      </Button>
                      <Button
                        data-testid="comparison-mode-toggle"
                        variant={comparisonMode ? "default" : "outline"}
                        size="sm"
                        onClick={toggleComparisonMode}
                        className={`flex items-center gap-2 ${comparisonMode ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'btn-outline-gold'}`}
                      >
                        {comparisonMode ? (
                          <>
                            <span className="text-xs">🎯</span>
                            Comparing ({comparisonPoints.length}/2)
                          </>
                        ) : (
                          <>
                            <span className="text-xs">📊</span>
                            Compare Points
                          </>
                        )}
                      </Button>
                      {comparisonMode && comparisonPoints.length > 0 && (
                        <Button
                          data-testid="clear-comparison-button"
                          variant="ghost"
                          size="sm"
                          onClick={clearComparison}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          ✕ Clear
                        </Button>
                      )}
                    </div>
                    <Tabs value={period} onValueChange={handlePeriodChange} data-testid="period-tabs">
                      <TabsList className="bg-[rgba(255,255,255,0.03)] p-1 rounded-lg">
                        <TabsTrigger value="1mo" data-testid="period-1mo" className="data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]">1M</TabsTrigger>
                        <TabsTrigger value="3mo" data-testid="period-3mo" className="data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]">3M</TabsTrigger>
                        <TabsTrigger value="6mo" data-testid="period-6mo" className="data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]">6M</TabsTrigger>
                        <TabsTrigger value="1y" data-testid="period-1y" className="data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]">1Y</TabsTrigger>
                        <TabsTrigger value="5y" data-testid="period-5y" className="data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]">5Y</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {/* Comparison Date Selectors */}
                  {comparisonMode && (
                    <div className="mt-4 p-4 bg-[rgba(217,70,239,0.05)] border border-[rgba(217,70,239,0.2)] rounded-lg" data-testid="comparison-selectors">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-white">Select dates to compare</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-background/50 border-border/50"
                                data-testid="comparison-date-1"
                              >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {comparisonPoints[0]?.date ? (
                                  <span>{new Date(comparisonPoints[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${comparisonPoints[0].price?.toFixed(2)}</span>
                                ) : (
                                  <span className="text-muted-foreground">Select start date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={comparisonPoints[0]?.date ? new Date(comparisonPoints[0].date) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const dataPoint = historicalData.find(d => d.date === dateStr);
                                    if (dataPoint) {
                                      handleComparisonSelect(0, dateStr);
                                    } else {
                                      // Find closest date
                                      const closest = historicalData.reduce((prev, curr) => 
                                        Math.abs(new Date(curr.date) - date) < Math.abs(new Date(prev.date) - date) ? curr : prev
                                      );
                                      if (closest) handleComparisonSelect(0, closest.date);
                                    }
                                  }
                                }}
                                disabled={(date) => {
                                  const dateStr = date.toISOString().split('T')[0];
                                  return !historicalData.some(d => d.date === dateStr);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-background/50 border-border/50"
                                data-testid="comparison-date-2"
                              >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {comparisonPoints[1]?.date ? (
                                  <span>{new Date(comparisonPoints[1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${comparisonPoints[1].price?.toFixed(2)}</span>
                                ) : (
                                  <span className="text-muted-foreground">Select end date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={comparisonPoints[1]?.date ? new Date(comparisonPoints[1].date) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const dataPoint = historicalData.find(d => d.date === dateStr);
                                    if (dataPoint) {
                                      handleComparisonSelect(1, dateStr);
                                    } else {
                                      // Find closest date
                                      const closest = historicalData.reduce((prev, curr) => 
                                        Math.abs(new Date(curr.date) - date) < Math.abs(new Date(prev.date) - date) ? curr : prev
                                      );
                                      if (closest) handleComparisonSelect(1, closest.date);
                                    }
                                  }
                                }}
                                disabled={(date) => {
                                  const dateStr = date.toISOString().split('T')[0];
                                  return !historicalData.some(d => d.date === dateStr);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Comparison Results */}
                  {comparisonMode && comparisonPoints.length === 2 && (() => {
                    const point1 = comparisonPoints[0];
                    const point2 = comparisonPoints[1];
                    const priceDiff = point2.price - point1.price;
                    const percentDiff = ((priceDiff / point1.price) * 100).toFixed(2);
                    const isPositive = priceDiff >= 0;
                    
                    return (
                      <div className={`text-sm mt-2 p-4 ${isPositive ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'} border rounded-lg`} data-testid="comparison-result">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <div className="font-semibold mb-1">Price Comparison:</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-mono">{point1.date}</span> → <span className="font-mono">{point2.date}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`} style={{ fontFamily: 'DM Mono, monospace' }}>
                              {isPositive ? '+' : ''}{percentDiff}%
                            </div>
                            <div className={`text-sm ${isPositive ? 'text-success' : 'text-destructive'}`} style={{ fontFamily: 'DM Mono, monospace' }}>
                              {isPositive ? '+' : ''}${priceDiff.toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground flex justify-between">
                          <span>${point1.price.toFixed(2)}</span>
                          <span>→</span>
                          <span>${point2.price.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </CardHeader>
                <CardContent>
                  <div 
                    ref={chartRef}
                    className={`h-[400px] relative`} 
                    data-testid="stock-chart"
                  >
                    {(() => {
                      // Calculate if stock went up or down in the timeframe
                      const chartColor = historicalData.length > 1 
                        ? (historicalData[historicalData.length - 1].close >= historicalData[0].close 
                          ? '#22c55e'  // Green for up
                          : '#ef4444') // Red for down
                        : '#22c55e';
                      
                      return loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-pulse bg-muted rounded-lg w-full h-full" data-testid="chart-loading" />
                        </div>
                      ) : historicalData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={historicalData}>
                              <defs>
                                <linearGradient id="areaGradientGreen" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="areaGradientRed" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                              <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              tickFormatter={formatXAxisTick}
                              interval={getXAxisInterval()}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              domain={['auto', 'auto']}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontFamily: 'DM Mono, monospace',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                              formatter={(value, name) => {
                                const formattedValue = `$${parseFloat(value).toFixed(2)} USD`;
                                return [formattedValue, 'Price'];
                              }}
                              labelFormatter={(label) => {
                                const date = new Date(label);
                                return date.toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                });
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="close"
                              stroke="transparent"
                              fillOpacity={1}
                              fill={chartColor === '#22c55e' ? 'url(#areaGradientGreen)' : 'url(#areaGradientRed)'}
                            />
                            <Line
                              type="monotone"
                              dataKey="close"
                              stroke={chartColor}
                              strokeWidth={comparisonMode ? 3 : 2.5}
                              dot={false}
                              activeDot={comparisonMode ? { r: 6, fill: chartColor, stroke: "hsl(var(--foreground))", strokeWidth: 2 } : false}
                            />
                            {comparisonPoints.map((point, index) => {
                              const dataPoint = historicalData.find(d => d.date === point.date);
                              if (!dataPoint) return null;
                              const xIndex = historicalData.indexOf(dataPoint);
                              const chartWidth = 800; // approximate
                              const xPos = (xIndex / historicalData.length) * chartWidth;
                              
                              return (
                                <g key={index}>
                                  <circle
                                    cx={xPos}
                                    cy={100}
                                    r={10}
                                    fill="hsl(var(--chart-comparison))"
                                    stroke="hsl(var(--foreground))"
                                    strokeWidth={3}
                                  />
                                  <text
                                    x={xPos}
                                    y={100}
                                    fill="hsl(var(--foreground))"
                                    fontSize="14"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dy="5"
                                  >
                                    {index + 1}
                                  </text>
                                </g>
                              );
                            })}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="no-chart-data">
                        No data available
                      </div>
                    );
                    })()}
                  </div>
                </CardContent>
              </Card>

            {/* Stats and Analysis Grid - 2 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analysis Section */}
            <Card className="premium-card gold-gradient-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bull vs Bear Sentiment */}
                <div data-testid="bull-bear-sentiment">
                  <div className="text-sm font-semibold mb-3 text-white">Bull vs Bear Sentiment</div>
                  {loadingBullBear ? (
                    <div className="space-y-2">
                      <div className="loading-skeleton h-4 w-full rounded" />
                      <div className="loading-skeleton h-4 w-3/4 rounded" />
                    </div>
                  ) : bullBearSentiment ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                          📈 Bull Case
                        </div>
                        <ul className="space-y-1.5">
                          {bullBearSentiment.bull_points.map((point, idx) => (
                            <li key={idx} className="text-xs text-gray-400 flex gap-2">
                              <span className="text-green-400">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                          📉 Bear Case
                        </div>
                        <ul className="space-y-1.5">
                          {bullBearSentiment.bear_points.map((point, idx) => (
                            <li key={idx} className="text-xs text-gray-400 flex gap-2">
                              <span className="text-red-400">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Loading sentiment analysis...</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Row 2: Latest News and Financials */}
            <Card className="premium-card gold-gradient-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>Latest News</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingNews ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-20 h-20 loading-skeleton rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 loading-skeleton rounded w-3/4" />
                          <div className="h-3 loading-skeleton rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : newsArticles.length > 0 ? (
                  <div className="space-y-3 stagger-children">
                    {newsArticles.map((article, index) => (
                      <a
                        key={index}
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 p-3 rounded-lg news-card transition-all duration-300 group"
                        data-testid={`news-article-${index}`}
                      >
                        {article.thumbnail && (
                          <img
                            src={article.thumbnail}
                            alt={article.title}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-white group-hover:text-[#d946ef] transition-colors line-clamp-2 mb-1">
                            {article.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-medium">{article.publisher}</span>
                            <span>•</span>
                            <span>{article.published_date}</span>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#d946ef] transition-colors flex-shrink-0 mt-1" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No news articles available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financials Section */}
            <Card className="premium-card gold-gradient-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Financials
                </CardTitle>
              </CardHeader>
              <CardContent>
                {earningsLink ? (
                  <div className="space-y-4">
                    <a
                      data-testid="earnings-link"
                      href={earningsLink.earnings_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#d946ef] hover:text-[#f0abfc] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">View Earnings Report</span>
                    </a>
                    
                    {/* AI Deep Analysis */}
                    <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="text-sm font-semibold mb-2 text-white">AI Deep Analysis</div>
                      <p className="text-xs text-gray-400 mb-3">
                        Get comprehensive AI-powered analysis with earnings insights and price targets.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAiAnalysis(stockQuote.ticker)}
                        disabled={loadingAiAnalysis}
                        className="w-full btn-outline-gold"
                      >
                        {loadingAiAnalysis ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 gold-spinner" />
                            Analyzing...
                          </span>
                        ) : 'Generate AI Analysis'}
                      </Button>
                      {aiAnalysis && !aiAnalysis.error && (
                        <div className="mt-3 p-3 bg-[rgba(255,255,255,0.02)] rounded-lg text-xs text-gray-400 max-h-48 overflow-y-auto border border-[rgba(255,255,255,0.05)]">
                          <pre className="whitespace-pre-wrap">{aiAnalysis.analysis.substring(0, 500)}...</pre>
                        </div>
                      )}
                    </div>
                    
                    {/* Earnings Snapshot */}
                    <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="text-sm font-semibold mb-3 text-white flex items-center gap-2">
                        <span>📊</span> Earnings Snapshot
                      </div>
                      {earningsSnapshot ? (
                        <div className="grid grid-cols-2 gap-3">
                          {earningsSnapshot.capex && (
                            <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                              <div className="text-xs text-gray-400">CapEx</div>
                              <div className="text-sm font-semibold text-white mono-numbers">
                                ${(Math.abs(earningsSnapshot.capex) / 1e9).toFixed(2)}B
                              </div>
                            </div>
                          )}
                          {earningsSnapshot.free_cash_flow && (
                            <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                              <div className="text-xs text-gray-400">Free Cash Flow</div>
                              <div className={`text-sm font-semibold mono-numbers ${earningsSnapshot.free_cash_flow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${(earningsSnapshot.free_cash_flow / 1e9).toFixed(2)}B
                              </div>
                            </div>
                          )}
                          {earningsSnapshot.gross_margin && (
                            <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                              <div className="text-xs text-gray-400">Gross Margin</div>
                              <div className="text-sm font-semibold text-white mono-numbers">
                                {earningsSnapshot.gross_margin.toFixed(1)}%
                              </div>
                            </div>
                          )}
                          {earningsSnapshot.return_on_equity && (
                            <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                              <div className="text-xs text-gray-400">Return on Equity</div>
                              <div className={`text-sm font-semibold mono-numbers ${earningsSnapshot.return_on_equity >= 15 ? 'text-green-400' : 'text-white'}`}>
                                {earningsSnapshot.return_on_equity.toFixed(1)}%
                              </div>
                            </div>
                          )}
                          {earningsSnapshot.target_price && (
                            <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                              <div className="text-xs text-gray-400">Analyst Target</div>
                              <div className="text-sm font-semibold text-[#d946ef] mono-numbers">
                                ${earningsSnapshot.target_price.toFixed(2)}
                              </div>
                            </div>
                          )}
                          {earningsSnapshot.recommendation && earningsSnapshot.recommendation !== 'N/A' && (
                            <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                              <div className="text-xs text-gray-400">Recommendation</div>
                              <div className={`text-sm font-semibold ${
                                earningsSnapshot.recommendation.includes('BUY') ? 'text-green-400' : 
                                earningsSnapshot.recommendation.includes('SELL') ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                {earningsSnapshot.recommendation}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Loading earnings data...</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Loading financial data...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Empty State */}
        {stackedStocks.length === 0 && pinnedStocks.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]" data-testid="empty-state">
            <div className="text-center max-w-md">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-[#d946ef] opacity-50" />
              <h2 className="text-2xl font-semibold mb-2 gold-text" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Ready for Moonshot
              </h2>
              <p className="text-gray-400">
                Search for a stock by ticker or company name to get started. Pin your favorites for quick access. You can stack up to {MAX_STACKED_STOCKS} stocks!
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modal Components */}
      <WatchlistManager
        isOpen={showWatchlistManager}
        onClose={() => setShowWatchlistManager(false)}
        onSelectStock={selectStock}
        currentTicker={selectedStock}
      />

      <PriceAlertManager
        isOpen={showPriceAlertManager}
        onClose={() => {
          setShowPriceAlertManager(false);
          fetchAlertCount();
        }}
        currentTicker={selectedStock}
        currentPrice={stockQuote?.price}
        companyName={stockQuote?.company_name}
        onSelectStock={selectStock}
      />

      <AdvancedChart
        ticker={selectedStock}
        isOpen={showAdvancedChart}
        onClose={() => setShowAdvancedChart(false)}
      />

      <CategorySettings
        isOpen={showCategorySettings}
        onClose={() => setShowCategorySettings(false)}
        enabledCategories={enabledCategories}
        onCategoriesChange={setEnabledCategories}
      />
    </div>
  );
};

function App() {
  return (
    <>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/*" element={
          <AccessGate>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:categoryName" element={<CategoryPage />} />
            </Routes>
          </AccessGate>
        } />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;