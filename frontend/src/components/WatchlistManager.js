import { useState, useEffect } from 'react';
import { X, Plus, Trash2, List, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = [
  '#a855f7', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
];

const WatchlistManager = ({ isOpen, onClose, onSelectStock, currentTicker }) => {
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDescription, setNewWatchlistDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [expandedWatchlist, setExpandedWatchlist] = useState(null);
  const [watchlistStocks, setWatchlistStocks] = useState({});
  const [editingWatchlist, setEditingWatchlist] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchWatchlists();
    }
  }, [isOpen]);

  const fetchWatchlists = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/watchlists`);
      setWatchlists(response.data);
    } catch (error) {
      console.error('Error fetching watchlists:', error);
      toast.error('Failed to load watchlists');
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistStocks = async (watchlistId) => {
    try {
      const response = await axios.get(`${API}/watchlists/${watchlistId}/stocks`);
      setWatchlistStocks(prev => ({
        ...prev,
        [watchlistId]: response.data.stocks
      }));
    } catch (error) {
      console.error('Error fetching watchlist stocks:', error);
    }
  };

  const createWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      toast.error('Please enter a watchlist name');
      return;
    }

    try {
      await axios.post(`${API}/watchlists`, {
        name: newWatchlistName,
        description: newWatchlistDescription,
        color: selectedColor,
        tickers: []
      });
      
      setNewWatchlistName('');
      setNewWatchlistDescription('');
      setSelectedColor(COLORS[0]);
      setShowCreateForm(false);
      await fetchWatchlists();
      toast.success('Watchlist created!');
    } catch (error) {
      console.error('Error creating watchlist:', error);
      toast.error('Failed to create watchlist');
    }
  };

  const deleteWatchlist = async (watchlistId) => {
    try {
      await axios.delete(`${API}/watchlists/${watchlistId}`);
      await fetchWatchlists();
      toast.success('Watchlist deleted');
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      toast.error('Failed to delete watchlist');
    }
  };

  const addCurrentStockToWatchlist = async (watchlistId) => {
    if (!currentTicker) {
      toast.error('No stock selected');
      return;
    }

    try {
      await axios.post(`${API}/watchlists/${watchlistId}/stocks/${currentTicker}`);
      await fetchWatchlists();
      if (expandedWatchlist === watchlistId) {
        await fetchWatchlistStocks(watchlistId);
      }
      toast.success(`${currentTicker} added to watchlist`);
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Failed to add stock');
    }
  };

  const removeStockFromWatchlist = async (watchlistId, ticker) => {
    try {
      await axios.delete(`${API}/watchlists/${watchlistId}/stocks/${ticker}`);
      await fetchWatchlists();
      if (expandedWatchlist === watchlistId) {
        await fetchWatchlistStocks(watchlistId);
      }
      toast.success(`${ticker} removed from watchlist`);
    } catch (error) {
      console.error('Error removing stock:', error);
      toast.error('Failed to remove stock');
    }
  };

  const toggleExpand = async (watchlistId) => {
    if (expandedWatchlist === watchlistId) {
      setExpandedWatchlist(null);
    } else {
      setExpandedWatchlist(watchlistId);
      if (!watchlistStocks[watchlistId]) {
        await fetchWatchlistStocks(watchlistId);
      }
    }
  };

  const startEditing = (watchlist) => {
    setEditingWatchlist(watchlist.id);
    setEditName(watchlist.name);
  };

  const saveEdit = async (watchlistId) => {
    try {
      await axios.put(`${API}/watchlists/${watchlistId}`, {
        name: editName
      });
      setEditingWatchlist(null);
      await fetchWatchlists();
      toast.success('Watchlist updated');
    } catch (error) {
      console.error('Error updating watchlist:', error);
      toast.error('Failed to update watchlist');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" data-testid="watchlist-manager">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-card border border-border shadow-2xl">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <List className="w-5 h-5 text-primary" />
              Watchlists
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-watchlist-manager">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Create New Watchlist */}
          {!showCreateForm ? (
            <Button
              variant="outline"
              className="w-full mb-4 border-dashed border-primary/50 hover:border-primary"
              onClick={() => setShowCreateForm(true)}
              data-testid="show-create-watchlist-form"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Watchlist
            </Button>
          ) : (
            <Card className="mb-4 bg-secondary/30 border-primary/30">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Watchlist name (e.g., Growth Stocks, Dividends)"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="bg-background"
                  data-testid="new-watchlist-name"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newWatchlistDescription}
                  onChange={(e) => setNewWatchlistDescription(e.target.value)}
                  className="bg-background"
                  data-testid="new-watchlist-description"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full transition-transform ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-background ring-white scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateForm(false)}
                    data-testid="cancel-create-watchlist"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={createWatchlist}
                    data-testid="create-watchlist-button"
                  >
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Watchlists List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : watchlists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No watchlists yet</p>
              <p className="text-sm">Create one to organize your stocks by strategy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlists.map((watchlist) => (
                <Card 
                  key={watchlist.id} 
                  className="bg-card border border-border/50 overflow-hidden"
                  data-testid={`watchlist-${watchlist.id}`}
                >
                  <div 
                    className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => toggleExpand(watchlist.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: watchlist.color || COLORS[0] }}
                        />
                        {editingWatchlist === watchlist.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 w-40"
                              autoFocus
                              data-testid="edit-watchlist-name"
                            />
                            <Button size="sm" variant="ghost" onClick={() => saveEdit(watchlist.id)}>
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {watchlist.name}
                            </div>
                            {watchlist.description && (
                              <div className="text-xs text-muted-foreground">{watchlist.description}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{watchlist.tickers?.length || 0} stocks</Badge>
                        {currentTicker && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              addCurrentStockToWatchlist(watchlist.id);
                            }}
                            className="text-primary hover:text-primary"
                            data-testid={`add-to-${watchlist.id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(watchlist);
                          }}
                          data-testid={`edit-${watchlist.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWatchlist(watchlist.id);
                          }}
                          className="text-destructive hover:text-destructive"
                          data-testid={`delete-${watchlist.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {expandedWatchlist === watchlist.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Stocks List */}
                  {expandedWatchlist === watchlist.id && (
                    <div className="border-t border-border/50 bg-secondary/20">
                      {watchlistStocks[watchlist.id] ? (
                        watchlistStocks[watchlist.id].length > 0 ? (
                          <div className="divide-y divide-border/30">
                            {watchlistStocks[watchlist.id].map((stock) => (
                              <div 
                                key={stock.ticker} 
                                className="p-3 flex items-center justify-between hover:bg-accent/30 cursor-pointer"
                                onClick={() => {
                                  onSelectStock(stock.ticker);
                                  onClose();
                                }}
                                data-testid={`watchlist-stock-${stock.ticker}`}
                              >
                                <div>
                                  <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                    {stock.ticker}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{stock.name}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                      ${stock.price?.toFixed(2)}
                                    </div>
                                    <div className={`text-xs ${stock.change_percent >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent?.toFixed(2)}%
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeStockFromWatchlist(watchlist.id, stock.ticker);
                                    }}
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`remove-${stock.ticker}-from-${watchlist.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            No stocks in this watchlist yet
                          </div>
                        )
                      ) : (
                        <div className="p-4">
                          <div className="animate-pulse h-8 bg-muted rounded" />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WatchlistManager;
