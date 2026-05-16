import { useState, useEffect, useCallback } from 'react';
import { X, Bell, BellRing, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PriceAlertManager = ({ isOpen, onClose, currentTicker, currentPrice, companyName, onSelectStock }) => {
  const [alerts, setAlerts] = useState([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState('above');
  const [checking, setChecking] = useState(false);

  // Stock search state for create form
  const [tickerQuery, setTickerQuery] = useState('');
  const [tickerResults, setTickerResults] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null); // { ticker, company_name, price }
  const [fetchingPrice, setFetchingPrice] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/price-alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAlerts = useCallback(async () => {
    setChecking(true);
    try {
      const response = await axios.get(`${API}/price-alerts/check`);
      if (response.data.triggered_alerts && response.data.triggered_alerts.length > 0) {
        setTriggeredAlerts(response.data.triggered_alerts);
        response.data.triggered_alerts.forEach(alert => {
          toast.success(
            `${alert.ticker} hit $${alert.current_price.toFixed(2)} (target: ${alert.condition} $${alert.target_price})`,
            { duration: 10000 }
          );
        });
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    } finally {
      setChecking(false);
    }
  }, [fetchAlerts]);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
      checkAlerts();
    }
  }, [isOpen, fetchAlerts, checkAlerts]);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(checkAlerts, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen, checkAlerts]);

  // Search stocks as user types
  useEffect(() => {
    if (!tickerQuery || tickerQuery.length < 1) {
      setTickerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/stocks/search?q=${encodeURIComponent(tickerQuery)}`);
        setTickerResults(res.data.slice(0, 6));
      } catch {
        setTickerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tickerQuery]);

  // Pick a stock from search results
  const pickTicker = async (ticker, name) => {
    setTickerQuery('');
    setTickerResults([]);
    setFetchingPrice(true);
    try {
      const res = await axios.get(`${API}/stocks/${ticker}/quote`);
      setSelectedTicker({ ticker, company_name: name || res.data.company_name, price: res.data.price });
    } catch {
      setSelectedTicker({ ticker, company_name: name || ticker, price: null });
    } finally {
      setFetchingPrice(false);
    }
  };

  // Open create form pre-filled with current stock if available
  const openCreateForm = () => {
    if (currentTicker && currentPrice) {
      setSelectedTicker({ ticker: currentTicker, company_name: companyName || currentTicker, price: currentPrice });
    } else {
      setSelectedTicker(null);
    }
    setTargetPrice('');
    setCondition('above');
    setShowCreateForm(true);
  };

  const createAlert = async () => {
    const ticker = selectedTicker?.ticker;
    if (!ticker || !targetPrice) {
      toast.error('Please select a stock and enter a target price');
      return;
    }
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    try {
      await axios.post(`${API}/price-alerts`, {
        ticker,
        company_name: selectedTicker.company_name || ticker,
        target_price: priceNum,
        condition,
      });
      setTargetPrice('');
      setShowCreateForm(false);
      setSelectedTicker(null);
      await fetchAlerts();
      toast.success(`Alert created: ${ticker} ${condition} $${priceNum.toFixed(2)}`);
    } catch (error) {
      toast.error('Failed to create alert');
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API}/price-alerts/${alertId}`);
      await fetchAlerts();
      toast.success('Alert deleted');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      await axios.post(`${API}/price-alerts/${alertId}/dismiss`);
      setTriggeredAlerts(prev => prev.filter(a => a.id !== alertId));
      await fetchAlerts();
    } catch {
      console.error('Error dismissing alert');
    }
  };

  const resetAlert = async (alertId) => {
    try {
      await axios.post(`${API}/price-alerts/${alertId}/reset`);
      await fetchAlerts();
      toast.success('Alert reset and active again');
    } catch {
      toast.error('Failed to reset alert');
    }
  };

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlertsList = alerts.filter(a => a.is_triggered);
  const dismissedAlerts = alerts.filter(a => !a.is_active);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" data-testid="price-alert-manager">
      <Card className="w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-hidden bg-[#0f0f14] border border-[rgba(217,70,239,0.2)] shadow-2xl rounded-t-2xl sm:rounded-xl">
        <CardHeader className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Bell className="w-5 h-5 text-[#d946ef]" />
              Price Alerts
              {activeAlerts.length > 0 && (
                <Badge className="bg-[#d946ef]/20 text-[#d946ef] border border-[#d946ef]/30 text-xs">{activeAlerts.length} active</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={checkAlerts} disabled={checking} className="h-8 w-8 p-0 text-gray-400 hover:text-white" data-testid="check-alerts-button">
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-gray-400 hover:text-white" data-testid="close-alert-manager">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 overflow-y-auto max-h-[calc(85vh-70px)] sm:max-h-[calc(80vh-70px)]">
          {/* Triggered Alerts Banner */}
          {triggeredAlerts.length > 0 && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg" data-testid="triggered-alerts-banner">
              <div className="flex items-center gap-2 mb-2">
                <BellRing className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-sm font-semibold text-green-400">Alerts Triggered!</span>
              </div>
              <div className="space-y-1.5">
                {triggeredAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between bg-[rgba(255,255,255,0.03)] p-2 rounded">
                    <div className="text-xs">
                      <span className="font-bold text-white mono-numbers">{alert.ticker}</span>
                      <span className="text-gray-400 mx-1">hit</span>
                      <span className="text-green-400 mono-numbers">${alert.current_price?.toFixed(2)}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => dismissAlert(alert.id)} className="h-6 text-[10px] btn-outline-gold">
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Alert */}
          {!showCreateForm ? (
            <Button
              variant="outline"
              className="w-full mb-4 border-dashed border-[#d946ef]/40 hover:border-[#d946ef] text-gray-300 hover:text-white"
              onClick={openCreateForm}
              data-testid="show-create-alert-form"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Alert
            </Button>
          ) : (
            <Card className="mb-4 bg-[rgba(217,70,239,0.05)] border border-[rgba(217,70,239,0.15)]">
              <CardContent className="p-3 sm:p-4 space-y-3">
                {/* Stock Selector */}
                {selectedTicker ? (
                  <div className="flex items-center justify-between bg-[rgba(255,255,255,0.03)] p-2.5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div>
                      <div className="text-sm font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>{selectedTicker.ticker}</div>
                      <div className="text-[11px] text-gray-400">{selectedTicker.company_name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTicker.price && (
                        <Badge variant="outline" className="text-xs mono-numbers text-gray-300 border-[rgba(255,255,255,0.1)]">
                          ${selectedTicker.price.toFixed(2)}
                        </Badge>
                      )}
                      <button
                        onClick={() => setSelectedTicker(null)}
                        className="text-gray-500 hover:text-gray-300"
                        data-testid="change-ticker-button"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Search stock (e.g. AAPL, Tesla)"
                      value={tickerQuery}
                      onChange={(e) => setTickerQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
                      autoFocus
                      data-testid="alert-ticker-search"
                    />
                    {fetchingPrice && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                      </div>
                    )}
                    {tickerResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-[#0f0f14] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl z-10 max-h-[200px] overflow-y-auto">
                        {tickerResults.map((r) => (
                          <button
                            key={r.ticker}
                            onClick={() => pickTicker(r.ticker, r.name)}
                            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgba(217,70,239,0.08)] transition-colors"
                            data-testid={`alert-search-result-${r.ticker}`}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white">{r.ticker}</div>
                              <div className="text-[11px] text-gray-500 truncate">{r.name}</div>
                            </div>
                            {r.exchange && (
                              <span className="text-[10px] text-gray-600 ml-2 flex-shrink-0">{r.exchange}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Condition Toggle */}
                {selectedTicker && (
                  <>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant={condition === 'above' ? 'default' : 'ghost'}
                        onClick={() => setCondition('above')}
                        className={`flex-1 h-8 text-xs ${condition === 'above' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400'}`}
                        data-testid="condition-above"
                      >
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                        Above
                      </Button>
                      <Button
                        size="sm"
                        variant={condition === 'below' ? 'default' : 'ghost'}
                        onClick={() => setCondition('below')}
                        className={`flex-1 h-8 text-xs ${condition === 'below' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400'}`}
                        data-testid="condition-below"
                      >
                        <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
                        Below
                      </Button>
                    </div>

                    {/* Target Price */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Target price"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="h-9 text-sm bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] mono-numbers"
                        data-testid="target-price-input"
                      />
                    </div>

                    {/* Distance preview */}
                    {selectedTicker.price && targetPrice && (
                      <div className="text-[11px] text-gray-500">
                        {condition === 'above' ? (
                          parseFloat(targetPrice) > selectedTicker.price ? (
                            <span className="text-green-400">
                              Alert when price rises {((parseFloat(targetPrice) - selectedTicker.price) / selectedTicker.price * 100).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-yellow-400">Target is below current price</span>
                          )
                        ) : (
                          parseFloat(targetPrice) < selectedTicker.price ? (
                            <span className="text-red-400">
                              Alert when price drops {((selectedTicker.price - parseFloat(targetPrice)) / selectedTicker.price * 100).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-yellow-400">Target is above current price</span>
                          )
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 btn-outline-gold"
                        onClick={() => { setShowCreateForm(false); setSelectedTicker(null); setTargetPrice(''); }}
                        data-testid="cancel-create-alert"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]"
                        onClick={createAlert}
                        disabled={!selectedTicker || !targetPrice}
                        data-testid="create-alert-button"
                      >
                        Create Alert
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Alerts */}
          <div className="mb-4">
            <h3 className="text-[11px] font-semibold mb-2 text-gray-500 uppercase tracking-wider">
              Active ({activeAlerts.length})
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-[rgba(255,255,255,0.03)] rounded-lg" />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-6 text-gray-600">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(217,70,239,0.15)] transition-colors group"
                    data-testid={`alert-${alert.id}`}
                  >
                    <div
                      className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                      onClick={() => { onSelectStock(alert.ticker); onClose(); }}
                    >
                      {alert.condition === 'above' ? (
                        <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>
                          {alert.ticker}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {alert.condition === 'above' ? 'Above' : 'Below'} <span className="mono-numbers">${alert.target_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-gray-600 hover:text-red-400 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`delete-alert-${alert.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Triggered Alerts History */}
          {triggeredAlertsList.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold mb-2 text-gray-500 uppercase tracking-wider">
                Triggered ({triggeredAlertsList.length})
              </h3>
              <div className="space-y-1.5">
                {triggeredAlertsList.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-green-500/5 border border-green-500/10"
                    data-testid={`triggered-alert-${alert.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BellRing className="w-4 h-4 text-green-400" />
                      <div>
                        <div className="text-sm font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>{alert.ticker}</div>
                        <div className="text-[11px] text-gray-500">Hit <span className="mono-numbers">${alert.target_price.toFixed(2)}</span> ({alert.condition})</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => resetAlert(alert.id)} className="h-6 text-[10px] btn-outline-gold" data-testid={`reset-alert-${alert.id}`}>
                        Reset
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteAlert(alert.id)} className="text-gray-600 hover:text-red-400 h-6 w-6 p-0">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dismissed */}
          {dismissedAlerts.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold mb-2 text-gray-500 uppercase tracking-wider">
                Dismissed ({dismissedAlerts.length})
              </h3>
              <div className="space-y-1.5 opacity-50">
                {dismissedAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm text-gray-400" style={{ fontFamily: 'DM Mono, monospace' }}>{alert.ticker}</div>
                        <div className="text-[11px] text-gray-600">${alert.target_price.toFixed(2)} ({alert.condition})</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteAlert(alert.id)} className="text-gray-600 h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceAlertManager;
