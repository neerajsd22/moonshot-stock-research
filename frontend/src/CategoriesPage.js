import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, X, Search, BrainCircuit, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import CreateCategoryDialog from './components/CreateCategoryDialog';
import CategorySettings, { ALL_CATEGORIES } from './components/CategorySettings';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Lucide icon mapping
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

// US Market Categories
const usCategories = [
  { name: 'Finance', icon: '💵', slug: 'finance', market: 'us' },
  { name: 'Technology', icon: '💻', slug: 'technology', market: 'us' },
  { name: 'AI', icon: '🧠', slug: 'ai', market: 'us' },
  { name: 'Semiconductor', icon: '🔲', slug: 'semiconductor', market: 'us' },
  { name: 'FMCG', icon: '🛒', slug: 'fmcg', market: 'us' },
  { name: 'Materials', icon: '🏅', slug: 'materials', market: 'us' },
  { name: 'Healthcare', icon: '🏥', slug: 'healthcare', market: 'us' },
  { name: 'Energy', icon: '⚡', slug: 'energy', market: 'us' },
  { name: 'Consumer Discretionary', icon: '🛍️', slug: 'consumer-discretionary', market: 'us' },
];

// Indian Market Categories
const indiaCategories = [
  { name: 'Nifty 50', icon: '🇮🇳', slug: 'nifty-50', market: 'india' },
  { name: 'Nifty IT', icon: '💻', slug: 'nifty-it', market: 'india' },
  { name: 'Nifty Bank', icon: '🏦', slug: 'nifty-bank', market: 'india' },
  { name: 'Nifty Pharma', icon: '💊', slug: 'nifty-pharma', market: 'india' },
  { name: 'Nifty Auto', icon: '🚗', slug: 'nifty-auto', market: 'india' },
  { name: 'Nifty FMCG', icon: '🛒', slug: 'nifty-fmcg', market: 'india' },
  { name: 'Nifty Metal', icon: '⚙️', slug: 'nifty-metal', market: 'india' },
  { name: 'Nifty Realty', icon: '🏢', slug: 'nifty-realty', market: 'india' },
  { name: 'Nifty PSU', icon: '🏛️', slug: 'nifty-psu', market: 'india' },
];

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState(() => {
    const saved = localStorage.getItem('category_preferences');
    return saved ? JSON.parse(saved) : ALL_CATEGORIES.map(c => c.id);
  });

  // Fetch custom categories
  useEffect(() => {
    const fetchCustomCategories = async () => {
      try {
        const response = await axios.get(`${API}/custom-categories`);
        setCustomCategories(response.data);
      } catch (error) {
        console.error('Error fetching custom categories:', error);
      }
    };
    fetchCustomCategories();
  }, []);

  // Filter categories based on enabled preferences
  const filterCategories = (cats) => {
    return cats.filter(cat => enabledCategories.includes(cat.slug));
  };

  // Get categories based on market and search
  const getFilteredCategories = () => {
    let cats = selectedMarket === 'us' 
      ? filterCategories(usCategories)
      : selectedMarket === 'india' 
        ? filterCategories(indiaCategories)
        : filterCategories([...usCategories, ...indiaCategories]);
    
    if (searchQuery) {
      cats = cats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return cats;
  };

  const categories = getFilteredCategories();

  // Filter custom categories by search
  const filteredCustomCategories = searchQuery
    ? customCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : customCategories;

  const handleCategoryClick = (slug) => {
    navigate(`/category/${slug}`);
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      await axios.post(`${API}/custom-categories`, categoryData);
      const response = await axios.get(`${API}/custom-categories`);
      setCustomCategories(response.data);
      toast.success('Category created!');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${API}/custom-categories/${categoryId}`);
      setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
      toast.success('Category deleted');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
              data-testid="back-to-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Explore Categories
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategorySettings(true)}
            className="btn-outline-gold"
          >
            Customize
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.1)] text-white"
              data-testid="category-search"
            />
          </div>

          {/* Market Filter */}
          <div className="flex gap-1 bg-[rgba(255,255,255,0.03)] p-1.5 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <Button
              size="sm"
              variant={selectedMarket === 'all' ? 'default' : 'ghost'}
              onClick={() => setSelectedMarket('all')}
              className={`text-xs rounded-lg ${selectedMarket === 'all' ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
            >
              🌍 All
            </Button>
            <Button
              size="sm"
              variant={selectedMarket === 'us' ? 'default' : 'ghost'}
              onClick={() => setSelectedMarket('us')}
              className={`text-xs rounded-lg ${selectedMarket === 'us' ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
            >
              🇺🇸 US
            </Button>
            <Button
              size="sm"
              variant={selectedMarket === 'india' ? 'default' : 'ghost'}
              onClick={() => setSelectedMarket('india')}
              className={`text-xs rounded-lg ${selectedMarket === 'india' ? 'bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]' : 'text-gray-400 hover:text-white'}`}
            >
              🇮🇳 India
            </Button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
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
                <div className="text-xs text-gray-500 mt-1">
                  {category.market === 'us' ? '🇺🇸' : '🇮🇳'}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Custom Categories */}
          {filteredCustomCategories.map((category) => (
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
                Create Custom
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {categories.length === 0 && filteredCustomCategories.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-400">No categories found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateCategory={handleCreateCategory}
      />

      {/* Category Settings Modal */}
      {showCategorySettings && (
        <CategorySettings
          enabledCategories={enabledCategories}
          onSave={(categories) => {
            setEnabledCategories(categories);
            localStorage.setItem('category_preferences', JSON.stringify(categories));
            setShowCategorySettings(false);
          }}
          onClose={() => setShowCategorySettings(false)}
        />
      )}
    </div>
  );
};

export default CategoriesPage;
