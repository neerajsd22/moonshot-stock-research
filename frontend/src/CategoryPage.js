import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Sparkline from '@/components/Sparkline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get currency symbol based on ticker
  const getCurrencySymbol = (ticker) => {
    if (ticker?.endsWith('.NS') || ticker?.endsWith('.BO')) {
      return '₹';
    }
    return '$';
  };

  useEffect(() => {
    fetchCategoryStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryName]);

  const fetchCategoryStocks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stocks/category/${categoryName}`);
      setStocks(response.data.stocks);
    } catch (error) {
      console.error('Error fetching category stocks:', error);
      toast.error('Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  const handleStockClick = (ticker) => {
    // Navigate to home with ticker as query param
    navigate(`/?stock=${ticker}`);
  };

  const getCategoryTitle = () => {
    const titles = {
      'finance': 'Finance',
      'technology': 'Technology',
      'ai': 'AI & Machine Learning',
      'semiconductor': 'Semiconductors',
      'fmcg': 'FMCG (Fast Moving Consumer Goods)',
      'materials': 'Materials',
      // Indian categories
      'nifty50': 'Nifty 50',
      'nifty-it': 'Nifty IT',
      'nifty-bank': 'Nifty Bank',
      'nifty-pharma': 'Nifty Pharma',
      'nifty-auto': 'Nifty Auto',
      'nifty-fmcg': 'Nifty FMCG',
      'nifty-metal': 'Nifty Metal',
      'nifty-realty': 'Nifty Realty',
      'nifty-psu': 'Nifty PSU Bank',
      'adani-group': 'Adani Group',
      'tata-group': 'Tata Group',
      'new-age-tech': 'New Age Tech',
    };
    return titles[categoryName.toLowerCase()] || categoryName;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h1 
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent" 
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="category-title"
              >
                {getCategoryTitle()}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-muted-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Top 10 Stocks by Market Cap
          </h2>
        </div>

        {loading ? (
          <Card className="bg-card border border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="h-12 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border border-border/50 overflow-hidden">
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="bg-secondary/30 border-b border-border/50">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-muted-foreground">
                  <div className="col-span-1">#</div>
                  <div className="col-span-2">Ticker / Name</div>
                  <div className="col-span-2">1Y Chart</div>
                  <div className="col-span-2 text-right">Current Price</div>
                  <div className="col-span-2 text-right">Market Cap</div>
                  <div className="col-span-1.5 text-right">52W High</div>
                  <div className="col-span-1.5 text-right">52W Low</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border/30">
                {stocks.map((stock, index) => (
                  <div
                    key={stock.ticker}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-accent/50 transition-colors duration-200 cursor-pointer group"
                    onClick={() => handleStockClick(stock.ticker)}
                    data-testid={`stock-row-${stock.ticker}`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    </div>

                    {/* Ticker / Name */}
                    <div className="col-span-2 flex flex-col justify-center">
                      <div className="font-bold text-lg group-hover:text-primary transition-colors" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {stock.ticker}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                    </div>

                    {/* Sparkline Chart */}
                    <div className="col-span-2 flex items-center justify-center">
                      <Sparkline data={stock.sparkline} width={140} height={40} />
                    </div>

                    {/* Current Price */}
                    <div className="col-span-2 flex flex-col items-end justify-center">
                      <div className="font-bold text-lg" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {getCurrencySymbol(stock.ticker)}{stock.price.toFixed(2)}
                      </div>
                      <div 
                        className={`text-sm font-medium flex items-center gap-1 ${stock.change_percent >= 0 ? 'text-success' : 'text-destructive'}`}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {stock.change_percent >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                      </div>
                    </div>

                    {/* Market Cap */}
                    <div className="col-span-2 flex items-center justify-end">
                      {stock.market_cap ? (
                        <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {getCurrencySymbol(stock.ticker)}{(stock.market_cap / 1e9).toFixed(2)}B
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </div>

                    {/* 52W High */}
                    <div className="col-span-1.5 flex items-center justify-end">
                      {stock.high_52week ? (
                        <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {getCurrencySymbol(stock.ticker)}{stock.high_52week.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </div>

                    {/* 52W Low */}
                    <div className="col-span-1.5 flex items-center justify-end">
                      {stock.low_52week ? (
                        <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {getCurrencySymbol(stock.ticker)}{stock.low_52week.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CategoryPage;
