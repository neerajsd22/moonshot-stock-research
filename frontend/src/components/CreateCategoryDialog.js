import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const CreateCategoryDialog = ({ isOpen, onClose, onCreateCategory }) => {
  const [categoryName, setCategoryName] = useState('');
  const [tickers, setTickers] = useState(['']);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddTicker = () => {
    if (tickers.length < 10) {
      setTickers([...tickers, '']);
    } else {
      toast.error('Maximum 10 stocks allowed');
    }
  };

  const handleRemoveTicker = (index) => {
    setTickers(tickers.filter((_, i) => i !== index));
  };

  const handleTickerChange = (index, value) => {
    const newTickers = [...tickers];
    newTickers[index] = value.toUpperCase();
    setTickers(newTickers);
  };

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const validTickers = tickers.filter(t => t.trim() !== '');
    
    if (validTickers.length === 0) {
      toast.error('Please add at least one stock ticker');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateCategory({
        name: categoryName,
        tickers: validTickers
      });
      
      // Reset form
      setCategoryName('');
      setTickers(['']);
      onClose();
      toast.success('Custom category created!');
    } catch (error) {
      toast.error('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-card border border-border shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Create Custom Category
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="close-dialog"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category Name</label>
              <Input
                placeholder="e.g., My Tech Picks, High Growth..."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="bg-secondary/50"
                data-testid="category-name-input"
              />
            </div>

            {/* Stock Tickers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Stock Tickers ({tickers.filter(t => t.trim()).length}/10)</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTicker}
                  disabled={tickers.length >= 10}
                  className="flex items-center gap-1"
                  data-testid="add-ticker-button"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tickers.map((ticker, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="e.g., AAPL"
                      value={ticker}
                      onChange={(e) => handleTickerChange(index, e.target.value)}
                      className="bg-secondary/50 font-mono"
                      data-testid={`ticker-input-${index}`}
                    />
                    {tickers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTicker(index)}
                        data-testid={`remove-ticker-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={isCreating}
                data-testid="create-category-button"
              >
                {isCreating ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCategoryDialog;
