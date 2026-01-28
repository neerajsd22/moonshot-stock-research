import { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff, RotateCcw, BrainCircuit, Cpu } from 'lucide-react';

// Map of Lucide icon names to components
const LUCIDE_ICONS = {
  BrainCircuit: BrainCircuit,
  Cpu: Cpu,
};

// Helper to render category icon
const CategoryIcon = ({ icon, isLucide }) => {
  if (isLucide && LUCIDE_ICONS[icon]) {
    const IconComponent = LUCIDE_ICONS[icon];
    return <IconComponent className="w-5 h-5 text-primary" />;
  }
  return <span className="text-xl">{icon}</span>;
};
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// All available categories
const ALL_US_CATEGORIES = [
  { name: 'Finance', slug: 'finance', icon: '💵', market: 'us' },
  { name: 'Technology', slug: 'technology', icon: '💻', market: 'us' },
  { name: 'AI', slug: 'ai', icon: 'BrainCircuit', market: 'us', isLucide: true },
  { name: 'Semiconductor', slug: 'semiconductor', icon: 'Cpu', market: 'us', isLucide: true },
  { name: 'FMCG', slug: 'fmcg', icon: '🛒', market: 'us' },
  { name: 'Materials', slug: 'materials', icon: '🥇', market: 'us' },
  { name: 'Healthcare', slug: 'healthcare', icon: '🏥', market: 'us' },
  { name: 'Energy', slug: 'energy', icon: '⚡', market: 'us' },
  { name: 'Consumer Discretionary', slug: 'consumer-discretionary', icon: '🛍️', market: 'us' },
];

const ALL_INDIA_CATEGORIES = [
  { name: 'Nifty 50', slug: 'nifty50', icon: '🇮🇳', market: 'india' },
  { name: 'Nifty IT', slug: 'nifty-it', icon: '💻', market: 'india' },
  { name: 'Nifty Bank', slug: 'nifty-bank', icon: '🏦', market: 'india' },
  { name: 'Nifty Pharma', slug: 'nifty-pharma', icon: '💊', market: 'india' },
  { name: 'Nifty Auto', slug: 'nifty-auto', icon: '🚗', market: 'india' },
  { name: 'Nifty FMCG', slug: 'nifty-fmcg', icon: '🛒', market: 'india' },
  { name: 'Nifty Metal', slug: 'nifty-metal', icon: '⚙️', market: 'india' },
  { name: 'Nifty Realty', slug: 'nifty-realty', icon: '🏢', market: 'india' },
  { name: 'Nifty PSU', slug: 'nifty-psu', icon: '🏛️', market: 'india' },
  { name: 'New Age Tech', slug: 'new-age-tech', icon: '🚀', market: 'india' },
];

export const ALL_CATEGORIES = [...ALL_US_CATEGORIES, ...ALL_INDIA_CATEGORIES];

const CategorySettings = ({ isOpen, onClose, enabledCategories, onCategoriesChange }) => {
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize with current enabled state
      const allCats = ALL_CATEGORIES.map(cat => ({
        ...cat,
        enabled: enabledCategories.length === 0 || enabledCategories.includes(cat.slug)
      }));
      setCategories(allCats);
    }
  }, [isOpen, enabledCategories]);

  const toggleCategory = (slug) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.slug === slug ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
  };

  const toggleAllUS = (enabled) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.market === 'us' ? { ...cat, enabled } : cat
      )
    );
  };

  const toggleAllIndia = (enabled) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.market === 'india' ? { ...cat, enabled } : cat
      )
    );
  };

  const resetToDefaults = () => {
    setCategories(ALL_CATEGORIES.map(cat => ({ ...cat, enabled: true })));
  };

  const savePreferences = async () => {
    setSaving(true);
    const enabledSlugs = categories.filter(c => c.enabled).map(c => c.slug);
    
    try {
      // Save to localStorage
      localStorage.setItem('category_preferences', JSON.stringify(enabledSlugs));
      
      onCategoriesChange(enabledSlugs);
      toast.success('Category preferences saved!');
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const usCategories = categories.filter(c => c.market === 'us');
  const indiaCategories = categories.filter(c => c.market === 'india');
  const enabledCount = categories.filter(c => c.enabled).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" data-testid="category-settings">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-card border border-border shadow-2xl">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Settings className="w-5 h-5 text-primary" />
              Category Settings
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="text-muted-foreground"
                data-testid="reset-categories"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-category-settings">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which categories to show on your homepage ({enabledCount} selected)
          </p>
        </CardHeader>
        
        <CardContent className="p-4 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* US Categories */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                🇺🇸 US Markets
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAllUS(true)}
                  className="text-xs h-7"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAllUS(false)}
                  className="text-xs h-7"
                >
                  <EyeOff className="w-3 h-3 mr-1" />
                  None
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {usCategories.map((cat) => (
                <div
                  key={cat.slug}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    cat.enabled 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/30 border-border/50 opacity-60'
                  }`}
                  data-testid={`category-toggle-${cat.slug}`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={cat.icon} isLucide={cat.isLucide} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <Switch
                    checked={cat.enabled}
                    onCheckedChange={() => toggleCategory(cat.slug)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* India Categories */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                🇮🇳 Indian Markets
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAllIndia(true)}
                  className="text-xs h-7"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAllIndia(false)}
                  className="text-xs h-7"
                >
                  <EyeOff className="w-3 h-3 mr-1" />
                  None
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {indiaCategories.map((cat) => (
                <div
                  key={cat.slug}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    cat.enabled 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/30 border-border/50 opacity-60'
                  }`}
                  data-testid={`category-toggle-${cat.slug}`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={cat.icon} isLucide={cat.isLucide} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <Switch
                    checked={cat.enabled}
                    onCheckedChange={() => toggleCategory(cat.slug)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border/50">
            <Button
              className="w-full"
              onClick={savePreferences}
              disabled={saving || enabledCount === 0}
              data-testid="save-category-settings"
            >
              {saving ? 'Saving...' : `Save Preferences (${enabledCount} categories)`}
            </Button>
            {enabledCount === 0 && (
              <p className="text-xs text-destructive text-center mt-2">
                Please select at least one category
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategorySettings;
