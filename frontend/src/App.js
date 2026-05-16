import { useState, useEffect, useRef, useCallback } from 'react';
import '@/App.css';
import axios from 'axios';
import { Search, TrendingUp, Pin, X, LayoutList, ExternalLink, Plus, List, Bell, BarChart3, Settings, BrainCircuit, ChevronDown, CalendarDays, RefreshCw, Menu, ChevronLeft, Grid3X3 } from 'lucide-react';
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
import CategoriesPage from './CategoriesPage';
import CreateCategoryDialog from './components/CreateCategoryDialog';
import WatchlistManager from './components/WatchlistManager';
import PriceAlertManager from './components/PriceAlertManager';
import AdvancedChart from './components/AdvancedChart';
import CategorySettings, { ALL_CATEGORIES } from './components/CategorySettings';
import AccessGate from './components/AccessGate';
import AdminPage from './components/AdminPage';
import IntelligenceHub from './components/IntelligenceHub';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
// Refactored stock components
import {
  StockCardWithChart,
  DenseViewTable,
  LoadingAnimation,
  ComparisonChart,
  ExportButton,
  ResearchAnalysis,
} from './components/stock';
import CompactViewTable from './components/stock/CompactViewTable';
import CategoryIcon from './components/CategoryIcon';
import SortablePinnedStock from './components/SortablePinnedStock';
import { BACKGROUND_OPTIONS } from './components/backgroundOptions';

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

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  // Changed from single stock to array of stacked stocks (max 10)
  // Initialize from localStorage
  const [stackedStocks, setStackedStocks] = useState(() => {
    try {
      const saved = localStorage.getItem('moonshot_stacked_stocks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
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
  const [healthReport, setHealthReport] = useState(null);
  const [loadingHealthReport, setLoadingHealthReport] = useState(false);
  const [refreshingHealthReport, setRefreshingHealthReport] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false);
  const [bullBearSentiment, setBullBearSentiment] = useState(null);
  const [loadingBullBear, setLoadingBullBear] = useState(false);
  const [comparisonPoints, setComparisonPoints] = useState([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showComparisonChart, setShowComparisonChart] = useState(false); // New comparison chart modal
  const chartRef = useRef(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [showWatchlistManager, setShowWatchlistManager] = useState(false);
  const [showPriceAlertManager, setShowPriceAlertManager] = useState(false);
  const [showAdvancedChart, setShowAdvancedChart] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('all'); // 'all', 'us', 'india'
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState(() => {
    const saved = localStorage.getItem('category_preferences');
    return saved ? JSON.parse(saved) : [];
  });
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [stockAnimating, setStockAnimating] = useState(false);
  const [loadingTicker, setLoadingTicker] = useState(null); // Track which ticker is loading
  const [selectedBackground, setSelectedBackground] = useState(() => {
    return localStorage.getItem('moonshot_background') || 'particles';
  });
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  
  const MAX_STACKED_STOCKS = 10;

  // Pull-to-refresh: refresh current stock data or pinned stocks
  const handlePullRefresh = useCallback(async () => {
    if (stackedStocksRef.current.length > 0) {
      // Refresh all stacked stocks' quotes
      const refreshPromises = stackedStocksRef.current.map(async (stock) => {
        try {
          const res = await axios.get(`${API}/stocks/${stock.ticker}/quote`);
          return { ticker: stock.ticker, quote: res.data };
        } catch {
          return null;
        }
      });
      const results = await Promise.all(refreshPromises);
      setStackedStocks(prev => prev.map(stock => {
        const updated = results.find(r => r && r.ticker === stock.ticker);
        return updated ? { ...stock, quote: updated.quote } : stock;
      }));
      // Update selected stock quote too
      const selectedUpdate = results.find(r => r && r.ticker === selectedStock);
      if (selectedUpdate) setStockQuote(selectedUpdate.quote);
      toast.success('Prices refreshed');
    } else {
      await Promise.all([fetchPinnedStocks(), fetchCustomCategories()]);
      toast.success('Data refreshed');
    }
  }, [selectedStock]);

  const { pullDistance, refreshing, progress } = usePullToRefresh(handlePullRefresh);

  // DnD sensors for pinned stock reordering
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const dndSensors = useSensors(pointerSensor, touchSensor);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pinnedStocks.findIndex(s => s.ticker === active.id);
    const newIndex = pinnedStocks.findIndex(s => s.ticker === over.id);
    const reordered = arrayMove(pinnedStocks, oldIndex, newIndex);
    setPinnedStocks(reordered);

    // Persist to backend
    try {
      await axios.put(`${API}/pinned-stocks/reorder`, reordered.map(s => s.ticker));
    } catch (err) {
      console.error('Failed to persist reorder:', err);
    }
  }, [pinnedStocks]);

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

  // Keep stackedStocksRef updated
  useEffect(() => {
    stackedStocksRef.current = stackedStocks;
  }, [stackedStocks]);

  // Persist stacked stocks to localStorage
  useEffect(() => {
    if (stackedStocks.length > 0) {
      localStorage.setItem('moonshot_stacked_stocks', JSON.stringify(stackedStocks));
    } else {
      localStorage.removeItem('moonshot_stacked_stocks');
    }
  }, [stackedStocks]);

  // Initialize selected stock from persisted data
  useEffect(() => {
    if (stackedStocks.length > 0 && !selectedStock) {
      const lastStock = stackedStocks[stackedStocks.length - 1];
      setSelectedStock(lastStock.ticker);
      setStockQuote(lastStock.quote);
      setHistoricalData(lastStock.historicalData || []);
      setEarningsLink(lastStock.earningsLink);
      setEarningsSnapshot(lastStock.earningsSnapshot);
      setHealthReport(lastStock.healthReport);
      setBullBearSentiment(lastStock.bullBearSentiment);
      setNewsArticles(lastStock.newsArticles || []);
    }
  }, []);

  // Handle stock query parameter from category page
  useEffect(() => {
    const stockParam = searchParams.get('stock');
    if (stockParam) {
      // Use ref to get the latest stackedStocks value
      const alreadyExists = stackedStocksRef.current.some(s => s.ticker === stockParam);
      if (alreadyExists) {
        toast.info(`${stockParam} is already displayed`);
      } else {
        selectStock(stockParam);
      }
      // Always clear the query param
      setSearchParams({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only trigger on searchParams change

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
      setActiveAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alert count:', error);
    }
  };

  // Create a price alert
  const createPriceAlert = async (ticker, companyName, targetPrice, condition) => {
    try {
      await axios.post(`${API}/price-alerts`, {
        ticker: ticker.toUpperCase(),
        company_name: companyName,
        target_price: targetPrice,
        condition,
      });
      toast.success(`Alert set: ${ticker} ${condition} $${targetPrice.toFixed(2)}`);
      fetchAlertCount();
    } catch (error) {
      toast.error('Failed to create alert');
    }
  };

  // Delete a price alert
  const deletePriceAlert = async (alertId) => {
    try {
      await axios.delete(`${API}/price-alerts/${alertId}`);
      fetchAlertCount();
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  // Get alert count for a specific ticker
  const getAlertCountForTicker = useCallback((ticker) => {
    return activeAlerts.filter(a => a.ticker === ticker.toUpperCase() && a.is_active).length;
  }, [activeAlerts]);

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

  const fetchHealthReport = async (ticker) => {
    setLoadingHealthReport(true);
    setHealthReport(null);
    try {
      const response = await axios.get(`${API}/stocks/${ticker}/health-report`);
      setHealthReport(response.data);
    } catch (error) {
      console.error('Error fetching health report:', error);
    } finally {
      setLoadingHealthReport(false);
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
      // Create a timeout wrapper for long-running requests
      const timeoutPromise = (promise, ms = 15000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
        ]);
      };

      const [quoteRes, historyRes, earningsRes, earningsSnapshotRes, healthReportRes, sentimentRes, newsRes] = await Promise.all([
        axios.get(`${API}/stocks/${ticker}/quote`),
        axios.get(`${API}/stocks/${ticker}/history`, { params: { period } }),
        axios.get(`${API}/stocks/${ticker}/earnings-link`).catch(() => ({ data: null })),
        axios.get(`${API}/stocks/${ticker}/earnings-snapshot`).catch(() => ({ data: null })),
        timeoutPromise(axios.get(`${API}/stocks/${ticker}/health-report`)).catch((err) => {
          console.warn(`Health report failed for ${ticker}:`, err.message);
          return { data: { error: true, message: 'Failed to load health report' } };
        }),
        axios.get(`${API}/stocks/${ticker}/bull-bear-sentiment`).catch(() => ({ 
          data: {
            bull_points: ['Strong market position', 'Positive growth trends', 'Favorable recommendations'],
            bear_points: ['Market volatility risks', 'Competitive pressures', 'Economic uncertainties']
          }
        })),
        axios.get(`${API}/stocks/${ticker}/news`).catch(() => ({ data: [] })),
      ]);
      
      // Validate health report data
      const healthData = healthReportRes.data;
      let validHealthReport = null;
      if (healthData && !healthData.error && healthData.quarters && healthData.quarters.length > 0) {
        validHealthReport = healthData;
      } else if (healthData && healthData.error) {
        // Explicitly mark as failed
        validHealthReport = { _failed: true, message: healthData.message || 'Failed to load' };
      } else {
        // No data available
        validHealthReport = { _failed: true, message: 'No financial data available' };
      }
      
      return {
        ticker,
        quote: quoteRes.data,
        historicalData: historyRes.data,
        earningsLink: earningsRes.data,
        earningsSnapshot: earningsSnapshotRes.data,
        healthReport: validHealthReport,
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
    
    // Start animation
    setStockAnimating(true);
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
      setHealthReport(stockData.healthReport);
      setBullBearSentiment(stockData.bullBearSentiment);
      setNewsArticles(stockData.newsArticles);
      setComparisonPoints([]);
      setComparisonMode(false);
      
      // Scroll to stacked stocks area after render
      setTimeout(() => {
        const container = document.querySelector('[data-testid="stacked-stocks-container"]') || 
                          document.querySelector('[data-testid="compact-view-container"]');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
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
      }
    }
    
    toast.success(`${ticker} removed`);
  };

  // Function to dismiss all stocks at once
  const dismissAllStocks = () => {
    setStackedStocks([]);
    setSelectedStock(null);
    setStockQuote(null);
    setHistoricalData([]);
    setEarningsLink(null);
    setBullBearSentiment(null);
    setNewsArticles([]);
    setHealthReport(null);
    localStorage.removeItem('moonshot_stacked_stocks');
    toast.success('All stocks cleared');
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

  const handlePeriodChange = async (newPeriod, ticker = null) => {
    setPeriod(newPeriod);
    setComparisonPoints([]);
    
    // If a specific ticker is provided, update that stock's historical data
    if (ticker) {
      try {
        const historyRes = await axios.get(`${API}/stocks/${ticker}/history?period=${newPeriod}`);
        setStackedStocks(prev => prev.map(stock => 
          stock.ticker === ticker 
            ? { ...stock, historicalData: historyRes.data, period: newPeriod }
            : stock
        ));
        // Also update the main historical data if this is the selected stock
        if (selectedStock === ticker) {
          setHistoricalData(historyRes.data);
        }
      } catch (error) {
        console.error(`Error fetching history for ${ticker}:`, error);
      }
    } else if (selectedStock) {
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

  // Refresh AI Deep Analysis / Health Report for current stock
  const refreshHealthReport = async () => {
    if (!selectedStock) return;
    
    setRefreshingHealthReport(true);
    setHealthReport(null); // Show loading state
    
    try {
      const timeoutPromise = (promise, ms = 20000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
        ]);
      };
      
      const response = await timeoutPromise(axios.get(`${API}/stocks/${selectedStock}/health-report`));
      const healthData = response.data;
      
      if (healthData && healthData.quarters && healthData.quarters.length > 0) {
        setHealthReport(healthData);
        toast.success('AI Analysis refreshed successfully!');
        
        // Also update the stacked stock data
        setStackedStocks(prev => prev.map(stock => 
          stock.ticker === selectedStock 
            ? { ...stock, healthReport: healthData }
            : stock
        ));
      } else {
        setHealthReport({ _failed: true, message: 'No financial data available for this stock' });
        toast.error('Could not load AI analysis - no data available');
      }
    } catch (error) {
      console.error('Error refreshing health report:', error);
      setHealthReport({ _failed: true, message: error.message || 'Failed to load health report' });
      toast.error('Failed to refresh AI analysis. Please try again.');
    } finally {
      setRefreshingHealthReport(false);
    }
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

  const isCompact = viewMode === 'dense';

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
    <div className="min-h-screen bg-background relative">
      {/* Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} progress={progress} />
      
      {/* Animated Background - Dynamic based on selection */}
      {(() => {
        const BackgroundComponent = BACKGROUND_OPTIONS[selectedBackground]?.component;
        return BackgroundComponent ? <BackgroundComponent /> : null;
      })()}
      
      {/* Background Picker Modal */}
      {showBackgroundPicker && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <Card className="premium-card gold-gradient-border w-full sm:max-w-lg max-h-[80vh] sm:max-h-none rounded-t-2xl sm:rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center justify-between">
                Choose Background Style
                <Button variant="ghost" size="sm" onClick={() => setShowBackgroundPicker(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 overflow-y-auto max-h-[60vh] sm:max-h-none pb-8 sm:pb-4">
              {Object.entries(BACKGROUND_OPTIONS).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedBackground(key);
                    localStorage.setItem('moonshot_background', key);
                    setShowBackgroundPicker(false);
                  }}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedBackground === key 
                      ? 'border-[#d946ef] bg-[#d946ef]/10' 
                      : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.02)]'
                  }`}
                  data-testid={`bg-option-${key}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{option.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                    </div>
                    {selectedBackground === key && (
                      <Badge className="bg-[#d946ef] text-white">Active</Badge>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Collapsible Sidebar */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>
      <aside 
        className={`fixed top-0 right-0 h-full w-[85vw] sm:w-72 z-[101] bg-[#0a0a0f] border-l border-[rgba(217,70,239,0.2)] shadow-2xl transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)]">
            <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Current Date */}
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2 text-gray-400">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          {/* Sidebar Menu Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => { setShowWatchlistManager(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-300 hover:bg-[rgba(217,70,239,0.1)] hover:text-white transition-colors"
              data-testid="sidebar-watchlists"
            >
              <List className="w-5 h-5 text-[#d946ef]" />
              <span>Watchlists</span>
            </button>
            
            <div data-testid="sidebar-alerts-section">
              <button
                onClick={() => { setShowPriceAlertManager(true); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-300 hover:bg-[rgba(217,70,239,0.1)] hover:text-white transition-colors relative"
                data-testid="sidebar-alerts"
              >
                <Bell className="w-5 h-5 text-[#d946ef]" />
                <span>Price Alerts</span>
                {alertCount > 0 && (
                  <Badge className="ml-auto bg-[#d946ef] text-[#0a0a0f] text-xs">
                    {alertCount}
                  </Badge>
                )}
              </button>

              {/* Inline Alert Summary */}
              {activeAlerts.length > 0 && (
                <div className="px-3 pb-2 space-y-1">
                  {activeAlerts.slice(0, 5).map((alert) => {
                    const currentPrice = stackedStocks.find(s => s.ticker === alert.ticker)?.quote?.price;
                    const distance = currentPrice ? (alert.target_price - currentPrice) : null;
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.02)] group"
                        data-testid={`sidebar-alert-${alert.id}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.condition === 'above' ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-gray-300 truncate">
                            <span className="font-medium text-white">{alert.ticker}</span>
                            {' '}{alert.condition}{' '}
                            <span className="mono-numbers">${alert.target_price.toFixed(2)}</span>
                          </div>
                          {distance !== null && (
                            <div className="text-[10px] text-gray-500 mono-numbers">
                              {Math.abs(distance) < 0.01 ? 'At target' : `$${Math.abs(distance).toFixed(2)} ${distance > 0 ? 'away' : 'past'}`}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePriceAlert(alert.id); }}
                          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          data-testid={`delete-alert-${alert.id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {activeAlerts.length > 5 && (
                    <div className="text-[10px] text-gray-500 text-center py-1">
                      +{activeAlerts.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => { setShowCategorySettings(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-300 hover:bg-[rgba(217,70,239,0.1)] hover:text-white transition-colors"
              data-testid="sidebar-categories"
            >
              <Settings className="w-5 h-5 text-[#d946ef]" />
              <span>Categories</span>
            </button>
            
            <button
              onClick={() => { setShowBackgroundPicker(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-300 hover:bg-[rgba(217,70,239,0.1)] hover:text-white transition-colors"
              data-testid="sidebar-theme"
            >
              <span className="text-lg">✨</span>
              <span>Theme</span>
            </button>
            
            <div className="border-t border-[rgba(255,255,255,0.06)] my-3" />
            
            {/* Compare Stocks - Only show when 2+ stocks */}
            {stackedStocks.length >= 2 && (
              <button
                onClick={() => { setShowComparisonChart(true); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-[#d946ef] bg-[rgba(217,70,239,0.1)] hover:bg-[rgba(217,70,239,0.2)] transition-colors"
                data-testid="sidebar-compare"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Compare Stocks</span>
                <Badge className="ml-auto bg-[#d946ef]/20 text-[#d946ef] text-xs">
                  {stackedStocks.length}
                </Badge>
              </button>
            )}
            
            {/* Export CSV - Only show when stocks exist */}
            {stackedStocks.length > 0 && (
              <div onClick={() => setSidebarOpen(false)}>
                <ExportButton stocks={stackedStocks} className="w-full justify-start gap-3 px-4 py-3" />
              </div>
            )}
          </nav>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
            <div className="text-xs text-gray-500 text-center">
              Moonshot v1.0
            </div>
          </div>
        </div>
      </aside>
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[rgba(217,70,239,0.1)]">
        <div className="max-w-[1600px] mx-auto px-3 py-2 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-shrink-0" 
              onClick={() => {
                setStackedStocks([]);
                setSelectedStock(null);
                setStockQuote(null);
                setHistoricalData([]);
                setComparisonPoints([]);
                setComparisonMode(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              data-testid="home-link"
            >
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-[#d946ef] transition-all duration-300 group-hover:scale-110" data-testid="logo-icon" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gold-text leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="app-title">
                  Moonshot
                </h1>
                <p className="text-[10px] text-gray-400 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Discover Your Next Big Win
                </p>
              </div>
            </div>
            
            {/* Search Bar - Centered */}
            <div className="relative flex-1 min-w-0 max-w-2xl">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                data-testid="stock-search-input"
                type="text"
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchStocks(e.target.value);
                }}
                className="pl-9 sm:pl-12 h-9 sm:h-11 text-sm input-premium rounded-lg w-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <Card className="absolute top-full mt-2 w-full z-50 max-h-[60vh] sm:max-h-[300px] overflow-y-auto" data-testid="search-results-dropdown">
                  <CardContent className="p-1 sm:p-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.ticker}
                        data-testid={`search-result-${result.ticker}`}
                        onClick={() => selectStock(result.ticker)}
                        className="w-full text-left p-2 sm:p-3 hover:bg-accent rounded-lg transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              {result.ticker}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">{result.name}</div>
                          </div>
                          {result.exchange && (
                            <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
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
            
            {/* Right side buttons - pushed to far right */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
              {/* Categories Popover */}
              <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="categories-popover-trigger"
                    variant="outline"
                    size="sm"
                    className={`h-9 sm:h-11 px-2 sm:px-4 flex items-center gap-2 btn-outline-gold ${categoriesOpen ? 'border-[#d946ef]/50 bg-[rgba(217,70,239,0.1)]' : ''}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Explore</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[260px] sm:w-[280px] p-0 bg-[#0f0f14] border border-[rgba(217,70,239,0.2)] shadow-2xl rounded-xl"
                  data-testid="categories-popover"
                >
                  {/* Market Selector Tabs */}
                  <div className="flex gap-0.5 p-2 border-b border-[rgba(255,255,255,0.06)]">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'us', label: 'US' },
                      { key: 'india', label: 'India' },
                    ].map(({ key, label }) => (
                      <Button
                        key={key}
                        size="sm"
                        variant={selectedMarket === key ? 'default' : 'ghost'}
                        onClick={() => setSelectedMarket(key)}
                        data-testid={`market-${key}`}
                        className={`text-xs flex-1 rounded-lg h-7 ${selectedMarket === key ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  {/* Category List */}
                  <div className="max-h-[50vh] overflow-y-auto p-1.5 space-y-0.5" data-testid="categories-list">
                    {categories.map((category) => (
                      <button
                        key={category.slug}
                        data-testid={`category-${category.slug}`}
                        onClick={() => {
                          handleCategoryClick(category.slug);
                          setCategoriesOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(217,70,239,0.08)] transition-colors group"
                      >
                        <span className="text-lg flex-shrink-0">
                          {category.isLucide && LUCIDE_ICONS[category.icon]
                            ? (() => { const I = LUCIDE_ICONS[category.icon]; return <I className="w-5 h-5 text-gray-400 group-hover:text-[#d946ef] transition-colors" />; })()
                            : category.icon}
                        </span>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {category.name}
                        </span>
                      </button>
                    ))}

                    {/* Custom Categories */}
                    {customCategories.map((category) => (
                      <button
                        key={category.id}
                        data-testid={`category-custom-${category.id}`}
                        onClick={() => {
                          handleCategoryClick(`custom-${category.id}`);
                          setCategoriesOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(217,70,239,0.08)] transition-colors group"
                      >
                        <span className="text-lg flex-shrink-0">⭐</span>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {category.name}
                        </span>
                        <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">{category.tickers.length}</span>
                      </button>
                    ))}
                  </div>

                  {/* Create Custom */}
                  <div className="p-2 border-t border-[rgba(255,255,255,0.06)]">
                    <button
                      data-testid="create-category-button"
                      onClick={() => {
                        setShowCreateDialog(true);
                        setCategoriesOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-[#d946ef] hover:bg-[rgba(217,70,239,0.08)] transition-colors"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <Plus className="w-4 h-4" />
                      Create Custom
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* View Mode Toggle */}
              <Button
                data-testid="view-mode-toggle"
                variant="outline"
                size="sm"
                onClick={() => setViewMode(isCompact ? 'spacious' : 'dense')}
                className="h-9 sm:h-11 px-2 sm:px-4 flex items-center gap-2 btn-outline-gold"
              >
                {isCompact ? <LayoutList className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCompact ? 'Expand' : 'Compact'}</span>
              </Button>
              
              {/* Menu Button */}
              <Button
                data-testid="sidebar-toggle"
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-9 sm:h-11 px-2 sm:px-4 flex items-center gap-2 btn-outline-gold relative"
              >
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">Menu</span>
                {alertCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#d946ef] text-[#0a0a0f] text-[9px] font-bold rounded-full flex items-center justify-center" data-testid="menu-alert-badge">
                    {alertCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10 relative z-10">
        {/* Pinned Stocks Section - Drag-and-drop reorderable */}
        {pinnedStocks.length > 0 && (
          <div className="mb-4 sm:mb-8 relative z-20" data-testid="pinned-stocks-section">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl">📌</span>
              <h2
                className="text-base sm:text-xl font-semibold text-white section-title-gold"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Pinned Stocks
              </h2>
              <span className="text-xs text-gray-500">({pinnedStocks.length})</span>
              <span className="text-[10px] text-gray-600 ml-1 hidden sm:inline">Drag to reorder</span>
            </div>
            
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pinnedStocks.map(s => s.ticker)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-3 sm:pb-4 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0" data-testid="pinned-stocks-container">
                  {pinnedStocks.map((stock) => (
                    <SortablePinnedStock
                      key={stock.ticker}
                      stock={stock}
                      onSelect={selectStock}
                      onUnpin={unpinStock}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        <CreateCategoryDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreateCategory={handleCreateCategory}
        />

        {/* Fun Loading Animation when fetching stock data */}
        {loadingTicker && <LoadingAnimation ticker={loadingTicker} />}

        {/* Compact View - Ticker + Sparkline + Price rows */}
        {viewMode === 'dense' && stackedStocks.length > 0 && (
          <CompactViewTable
            stackedStocks={stackedStocks}
            maxStocks={MAX_STACKED_STOCKS}
            onExpand={() => setViewMode('spacious')}
            onDismiss={dismissStock}
            onSelectStock={(ticker) => {
              setViewMode('spacious');
              setSelectedStock(ticker);
              const stock = stackedStocks.find(s => s.ticker === ticker);
              if (stock) {
                setStockQuote(stock.quote);
                setHistoricalData(stock.historicalData);
                setHealthReport(stock.healthReport);
              }
            }}
            getCurrencySymbol={getCurrencySymbol}
          />
        )}

        {/* Spacious View - Combined stock cards with chart */}
        {viewMode === 'spacious' && stackedStocks.length > 0 && (
          <div className="space-y-4" data-testid="stacked-stocks-container">
            {/* Dismiss All Button - Only show when multiple stocks */}
            {stackedStocks.length > 1 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissAllStocks}
                  className="flex items-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400"
                  data-testid="dismiss-all-stocks"
                >
                  <X className="w-4 h-4" />
                  Dismiss All ({stackedStocks.length})
                </Button>
              </div>
            )}
            {stackedStocks.map((stock, index) => (
              <div 
                key={stock.ticker} 
                className={`${index === stackedStocks.length - 1 && stockAnimating ? 'stock-slide-in' : 'fade-in'}`}
                data-testid={`stock-details-${stock.ticker}`}
              >
                <StockCardWithChart
                  stock={stock}
                  isStockPinned={isStockPinned}
                  onPin={pinStock}
                  onUnpin={unpinStock}
                  onDismiss={dismissStock}
                  getCurrencySymbol={getCurrencySymbol}
                  currentPeriod={stock.period || period}
                  onPeriodChange={(newPeriod) => handlePeriodChange(newPeriod, stock.ticker)}
                  onAdvancedChart={() => {
                    setSelectedStock(stock.ticker);
                    setShowAdvancedChart(true);
                  }}
                  isSelected={selectedStock === stock.ticker}
                  onSelect={(ticker) => {
                    setSelectedStock(ticker);
                    const stockData = stackedStocks.find(s => s.ticker === ticker);
                    if (stockData) {
                      setStockQuote(stockData.quote);
                      setHistoricalData(stockData.historicalData);
                    }
                  }}
                  alertCount={getAlertCountForTicker(stock.ticker)}
                  onCreateAlert={createPriceAlert}
                />
              </div>
            ))}
          </div>
        )}

        {/* Advanced Chart - Only show when explicitly requested */}
        {selectedStock && stockQuote && viewMode === 'spacious' && showAdvancedChart && (
          <div className="space-y-6 fade-in" data-testid="stock-details-container">
            {/* Chart */}
            <Card className="premium-card gold-gradient-border">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-white text-2xl" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="chart-title">
                      {selectedStock} - Advanced Chart
                      </CardTitle>
                      <Button
                        data-testid="close-advanced-chart"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedChart(false)}
                        className="flex items-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                        Close
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
            </div>
          )}

        {/* Detailed Analysis sections - show when a stock is selected */}
        {selectedStock && stockQuote && viewMode === 'spacious' && (
          <div className="mt-4 space-y-4 fade-in">
            {/* Financials, Analysis & News - 3 Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Column 1: Financials Section */}
              <Card className="premium-card gold-gradient-border h-fit">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Financials
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {earningsLink ? (
                    <div className="space-y-3">
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
                      
                      {/* Earnings Snapshot */}
                      <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="text-xs font-semibold mb-2 text-white flex items-center gap-2">
                          <span>📊</span> Earnings Snapshot
                        </div>
                        {earningsSnapshot ? (
                          <div className="grid grid-cols-2 gap-2">
                            {earningsSnapshot.capex && (
                              <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                                <div className="text-[10px] text-gray-400">CapEx</div>
                                <div className="text-xs font-semibold text-white mono-numbers">
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
                                <div className="text-xs text-gray-400">ROE</div>
                                <div className={`text-sm font-semibold mono-numbers ${earningsSnapshot.return_on_equity >= 15 ? 'text-green-400' : 'text-white'}`}>
                                  {earningsSnapshot.return_on_equity.toFixed(1)}%
                                </div>
                              </div>
                            )}
                            {earningsSnapshot.target_price && (
                              <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                                <div className="text-xs text-gray-400">Target</div>
                                <div className="text-sm font-semibold text-[#d946ef] mono-numbers">
                                  ${earningsSnapshot.target_price.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Loading...</div>
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

              {/* Column 2: Analysis Section */}
              <Card className="premium-card gold-gradient-border h-fit">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {/* Bull vs Bear Sentiment */}
                  <div data-testid="bull-bear-sentiment">
                    <div className="text-xs font-semibold mb-2 text-white">Bull vs Bear Sentiment</div>
                    {loadingBullBear ? (
                      <div className="space-y-2">
                        <div className="loading-skeleton h-4 w-full rounded" />
                        <div className="loading-skeleton h-4 w-3/4 rounded" />
                      </div>
                    ) : bullBearSentiment ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-[11px] font-medium text-green-400 mb-1.5 flex items-center gap-1">
                            📈 Bull Case
                          </div>
                          <ul className="space-y-1">
                            {bullBearSentiment.bull_points.map((point, idx) => (
                              <li key={idx} className="text-[11px] text-gray-400 flex gap-2">
                                <span className="text-green-400">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-red-400 mb-1.5 flex items-center gap-1">
                            📉 Bear Case
                          </div>
                          <ul className="space-y-1">
                            {bullBearSentiment.bear_points.map((point, idx) => (
                              <li key={idx} className="text-[11px] text-gray-400 flex gap-2">
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

              {/* Column 3: Latest News */}
              <Card className="premium-card gold-gradient-border h-fit">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Latest News
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {loadingNews ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="w-12 h-12 loading-skeleton rounded flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 loading-skeleton rounded w-full" />
                            <div className="h-3 loading-skeleton rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newsArticles.length > 0 ? (
                    <div className="space-y-2 stagger-children">
                      {newsArticles.map((article, index) => (
                        <a
                          key={index}
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-2 p-2 rounded-lg news-card transition-all duration-300 group"
                          data-testid={`news-article-${index}`}
                        >
                          {article.thumbnail && (
                            <img
                              src={article.thumbnail}
                              alt={article.title}
                              className="w-12 h-12 object-cover rounded flex-shrink-0"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[11px] text-white group-hover:text-[#d946ef] transition-colors line-clamp-2 mb-0.5">
                              {article.title}
                            </h3>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <span className="truncate">{article.publisher}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      No news available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Intelligence Hub - New Advanced Analysis Section */}
            <IntelligenceHub ticker={selectedStock} />

            {/* AI Deep Analysis - Full Width Health Report */}
            <Card className="premium-card gold-gradient-border" data-testid="ai-deep-analysis">
              <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <CardTitle className="text-xs sm:text-sm font-semibold text-white section-title-gold flex items-center gap-1.5 sm:gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      <BrainCircuit className="w-4 h-4 text-[#d946ef] flex-shrink-0" />
                      <span className="truncate">AI Deep Analysis</span>
                    </CardTitle>
                    {healthReport && healthReport.verdict && (
                      <Badge 
                        className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0 ${
                          healthReport.verdict === 'BUY' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          healthReport.verdict === 'HOLD' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        {healthReport.verdict} ({healthReport.score}/10)
                      </Badge>
                    )}
                  </div>
                  {/* Refresh Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshHealthReport}
                    disabled={refreshingHealthReport}
                    className="flex items-center gap-1 sm:gap-2 btn-outline-gold flex-shrink-0"
                    data-testid="refresh-ai-analysis"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshingHealthReport ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{refreshingHealthReport ? 'Refreshing...' : 'Refresh'}</span>
                  </Button>
                </div>
                {healthReport && healthReport.audit_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Audit Date: {healthReport.audit_date} • {healthReport.company_name}
                  </p>
                )}
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {healthReport && healthReport.quarters && healthReport.quarters.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Core Vitals Matrix */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#d946ef] rounded-full"></span>
                        Core Vitals Matrix
                      </h4>
                      {healthReport.quarters && healthReport.quarters.length > 0 ? (
                        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                          <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                            <thead>
                              <tr className="border-b border-[rgba(255,255,255,0.1)]">
                                <th className="text-left py-2 px-3 text-gray-400 font-medium">Metric</th>
                                {healthReport.quarters.slice(0, 8).map((q, i) => (
                                  <th key={i} className="text-right py-2 px-2 text-gray-400 font-medium text-xs">
                                    {q.quarter}
                                  </th>
                                ))}
                                <th className="text-left py-2 px-3 text-gray-400 font-medium">Trend</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                                <td className="py-2 px-3 text-gray-300">Revenue</td>
                                {healthReport.quarters.slice(0, 8).map((q, i) => (
                                  <td key={i} className="text-right py-2 px-2 text-white mono-numbers">
                                    {q.revenue ? `$${(q.revenue / 1e9).toFixed(1)}B` : '-'}
                                  </td>
                                ))}
                                <td className={`py-2 px-3 ${healthReport.trends?.revenue_trend === 'accelerating' ? 'text-green-400' : 'text-red-400'}`}>
                                  {healthReport.trends?.revenue_trend === 'accelerating' ? '📈 Accelerating' : '📉 Slowing'}
                                </td>
                              </tr>
                              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                                <td className="py-2 px-3 text-gray-300">Gross Margin</td>
                                {healthReport.quarters.slice(0, 8).map((q, i) => (
                                  <td key={i} className="text-right py-2 px-2 text-white mono-numbers">
                                    {q.gross_margin ? `${q.gross_margin}%` : '-'}
                                  </td>
                                ))}
                                <td className={`py-2 px-3 ${healthReport.trends?.margin_trend === 'improving' ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {healthReport.trends?.margin_trend === 'improving' ? '✓ Strong Moat' : '⚠ Monitor'}
                                </td>
                              </tr>
                              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                                <td className="py-2 px-3 text-gray-300">Op. Margin</td>
                                {healthReport.quarters.slice(0, 8).map((q, i) => (
                                  <td key={i} className="text-right py-2 px-2 text-white mono-numbers">
                                    {q.op_margin ? `${q.op_margin}%` : '-'}
                                  </td>
                                ))}
                                <td className="py-2 px-3 text-gray-400">Efficiency</td>
                              </tr>
                              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                                <td className="py-2 px-3 text-gray-300">Net Income</td>
                                {healthReport.quarters.slice(0, 8).map((q, i) => (
                                  <td key={i} className={`text-right py-2 px-2 mono-numbers ${q.net_income >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {q.net_income ? `$${(q.net_income / 1e9).toFixed(1)}B` : '-'}
                                  </td>
                                ))}
                                <td className="py-2 px-3 text-gray-400">Profitability</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 text-gray-300">FCF</td>
                                {healthReport.quarters.slice(0, 8).map((q, i) => (
                                  <td key={i} className={`text-right py-2 px-2 mono-numbers ${q.fcf >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {q.fcf ? `$${(q.fcf / 1e9).toFixed(1)}B` : '-'}
                                  </td>
                                ))}
                                <td className={`py-2 px-3 ${healthReport.trends?.fcf_quality === 'strong' ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {healthReport.trends?.fcf_quality === 'strong' ? '✓ Strong' : healthReport.trends?.fcf_quality === 'moderate' ? '⚠ Moderate' : '✗ Weak'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Quarterly data not available</div>
                      )}
                    </div>

                    {/* Key Metrics & Risk Assessment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {/* Current Metrics */}
                      <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                        <h5 className="text-sm font-semibold text-white mb-3">Key Metrics</h5>
                        <div className="space-y-2">
                          {healthReport.current_metrics?.pe_ratio && (
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-400">Forward P/E</span>
                              <span className="text-xs text-white mono-numbers">{healthReport.current_metrics.pe_ratio.toFixed(1)}</span>
                            </div>
                          )}
                          {healthReport.current_metrics?.roe && (
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-400">ROE</span>
                              <span className={`text-xs mono-numbers ${healthReport.current_metrics.roe >= 15 ? 'text-green-400' : 'text-white'}`}>
                                {healthReport.current_metrics.roe.toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {healthReport.current_metrics?.debt_to_equity && (
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-400">Debt/Equity</span>
                              <span className={`text-xs mono-numbers ${healthReport.current_metrics.debt_to_equity < 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {healthReport.current_metrics.debt_to_equity.toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {healthReport.current_metrics?.revenue_growth && (
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-400">Rev Growth</span>
                              <span className={`text-xs mono-numbers ${healthReport.current_metrics.revenue_growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {healthReport.current_metrics.revenue_growth.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Risk Scorecard */}
                      <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                        <h5 className="text-sm font-semibold text-white mb-3">Risk Scorecard</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Regulatory Risk</span>
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${healthReport.risk_scores?.regulatory_risk <= 3 ? 'bg-green-400' : healthReport.risk_scores?.regulatory_risk <= 6 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${(healthReport.risk_scores?.regulatory_risk || 0) * 10}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-6">{healthReport.risk_scores?.regulatory_risk}/10</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Concentration Risk</span>
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${healthReport.risk_scores?.concentration_risk <= 3 ? 'bg-green-400' : healthReport.risk_scores?.concentration_risk <= 6 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${(healthReport.risk_scores?.concentration_risk || 0) * 10}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-6">{healthReport.risk_scores?.concentration_risk}/10</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Debt Risk</span>
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${healthReport.risk_scores?.debt_risk <= 3 ? 'bg-green-400' : healthReport.risk_scores?.debt_risk <= 6 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${(healthReport.risk_scores?.debt_risk || 0) * 10}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-6">{healthReport.risk_scores?.debt_risk}/10</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sentiment Analysis */}
                      <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                        <h5 className="text-sm font-semibold text-white mb-3">Sentiment</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Institutional</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                healthReport.sentiment?.institutional === 'bullish' ? 'text-green-400 border-green-400/30' :
                                healthReport.sentiment?.institutional === 'bearish' ? 'text-red-400 border-red-400/30' :
                                'text-gray-400 border-gray-400/30'
                              }`}
                            >
                              {healthReport.sentiment?.institutional || 'N/A'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Analyst</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                healthReport.sentiment?.analyst === 'bullish' ? 'text-green-400 border-green-400/30' :
                                healthReport.sentiment?.analyst === 'bearish' ? 'text-red-400 border-red-400/30' :
                                'text-gray-400 border-gray-400/30'
                              }`}
                            >
                              {healthReport.sentiment?.analyst || 'N/A'}
                            </Badge>
                          </div>
                          {healthReport.current_metrics?.held_by_institutions && (
                            <div className="flex justify-between items-center pt-2 border-t border-[rgba(255,255,255,0.05)]">
                              <span className="text-xs text-gray-400">Inst. Ownership</span>
                              <span className="text-xs text-white mono-numbers">{healthReport.current_metrics.held_by_institutions.toFixed(1)}%</span>
                            </div>
                          )}
                          {healthReport.current_metrics?.target_price && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-400">Target Price</span>
                              <span className="text-xs text-[#d946ef] mono-numbers">${healthReport.current_metrics.target_price.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final Verdict Summary */}
                    <div className={`p-4 rounded-lg border ${
                      healthReport.verdict === 'BUY' ? 'bg-green-500/10 border-green-500/30' :
                      healthReport.verdict === 'HOLD' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`text-3xl ${
                          healthReport.verdict === 'BUY' ? 'text-green-400' :
                          healthReport.verdict === 'HOLD' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {healthReport.verdict === 'BUY' ? '✓' : healthReport.verdict === 'HOLD' ? '⚡' : '✗'}
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-white mb-1">Analyst Verdict: {healthReport.verdict}</h5>
                          <p className="text-xs text-gray-400">
                            Based on 8-quarter trend analysis, {healthReport.company_name} shows 
                            {healthReport.trends?.revenue_trend === 'accelerating' ? ' accelerating revenue growth' : ' slowing revenue'}, 
                            {healthReport.trends?.margin_trend === 'improving' ? ' improving margins' : ' margin pressure'}, and 
                            {healthReport.trends?.fcf_quality === 'strong' ? ' strong cash flow generation' : ' moderate cash flow'}. 
                            {healthReport.sentiment?.analyst === 'bullish' ? ' Analysts remain bullish' : healthReport.sentiment?.analyst === 'bearish' ? ' Analysts are cautious' : ' Mixed analyst sentiment'} 
                            with a target price of ${healthReport.current_metrics?.target_price?.toFixed(2) || 'N/A'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : healthReport === null ? (
                  <ResearchAnalysis />
                ) : healthReport._failed ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <span className="text-4xl mb-4">📊</span>
                    <p className="text-sm text-gray-400">Unable to load AI analysis for this stock.</p>
                    <p className="text-xs text-gray-500 mt-1">{healthReport.message || 'Financial data may not be available.'}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshHealthReport}
                      disabled={refreshingHealthReport}
                      className="mt-4 btn-outline-gold"
                      data-testid="retry-ai-analysis"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshingHealthReport ? 'animate-spin' : ''}`} />
                      {refreshingHealthReport ? 'Retrying...' : 'Retry'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <span className="text-4xl mb-4">📊</span>
                    <p className="text-sm text-gray-400">Unable to load AI analysis for this stock.</p>
                    <p className="text-xs text-gray-500 mt-1">Financial data may not be available.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshHealthReport}
                      disabled={refreshingHealthReport}
                      className="mt-4 btn-outline-gold"
                      data-testid="retry-ai-analysis-fallback"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshingHealthReport ? 'animate-spin' : ''}`} />
                      {refreshingHealthReport ? 'Retrying...' : 'Retry'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {stackedStocks.length === 0 && pinnedStocks.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[60vh] px-4" data-testid="empty-state">
            <div className="text-center max-w-md">
              <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-[#d946ef] opacity-50" />
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 gold-text" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Ready for Moonshot
              </h2>
              <p className="text-sm sm:text-base text-gray-400">
                Search for a stock by ticker or company name to get started. Pin your favorites for quick access.
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
      
      {/* Stock Comparison Chart Modal */}
      {showComparisonChart && stackedStocks.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-5xl">
            <ComparisonChart 
              stocks={stackedStocks}
              onClose={() => setShowComparisonChart(false)}
              period={period}
            />
          </div>
        </div>
      )}
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
              <Route path="/categories" element={<CategoriesPage />} />
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