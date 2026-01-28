import { useState, useEffect, useCallback } from 'react';
import { X, Bell, BellRing, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
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
      if (response.data.triggered_alerts.length > 0) {
        setTriggeredAlerts(response.data.triggered_alerts);
        response.data.triggered_alerts.forEach(alert => {
          toast.success(
            `🔔 ${alert.ticker} hit $${alert.current_price.toFixed(2)} (target: ${alert.condition} $${alert.target_price})`,
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

  // Auto-check alerts every 60 seconds when panel is open
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(checkAlerts, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen, checkAlerts]);

  const createAlert = async () => {
    if (!currentTicker || !targetPrice) {
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
        ticker: currentTicker,
        company_name: companyName || currentTicker,
        target_price: priceNum,
        condition: condition
      });
      
      setTargetPrice('');
      setShowCreateForm(false);
      await fetchAlerts();
      toast.success(`Alert created: ${currentTicker} ${condition} $${priceNum.toFixed(2)}`);
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API}/price-alerts/${alertId}`);
      await fetchAlerts();
      toast.success('Alert deleted');
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      await axios.post(`${API}/price-alerts/${alertId}/dismiss`);
      setTriggeredAlerts(prev => prev.filter(a => a.id !== alertId));
      await fetchAlerts();
      toast.success('Alert dismissed');
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const resetAlert = async (alertId) => {
    try {
      await axios.post(`${API}/price-alerts/${alertId}/reset`);
      await fetchAlerts();
      toast.success('Alert reset and active again');
    } catch (error) {
      console.error('Error resetting alert:', error);
    }
  };

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlertsList = alerts.filter(a => a.is_triggered);
  const dismissedAlerts = alerts.filter(a => !a.is_active);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" data-testid="price-alert-manager">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-card border border-border shadow-2xl">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Bell className="w-5 h-5 text-primary" />
              Price Alerts
              {activeAlerts.length > 0 && (
                <Badge variant="secondary">{activeAlerts.length} active</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={checkAlerts}
                disabled={checking}
                data-testid="check-alerts-button"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-alert-manager">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Triggered Alerts Banner */}
          {triggeredAlerts.length > 0 && (
            <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg" data-testid="triggered-alerts-banner">
              <div className="flex items-center gap-2 mb-3">
                <BellRing className="w-5 h-5 text-success animate-pulse" />
                <span className="font-semibold text-success">Alerts Triggered!</span>
              </div>
              <div className="space-y-2">
                {triggeredAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between bg-background/50 p-3 rounded">
                    <div>
                      <span className="font-mono font-semibold">{alert.ticker}</span>
                      <span className="text-muted-foreground mx-2">hit</span>
                      <span className="font-mono text-success">${alert.current_price.toFixed(2)}</span>
                      <span className="text-muted-foreground mx-2">(target: {alert.condition} ${alert.target_price})</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => dismissAlert(alert.id)}>
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Alert */}
          {currentTicker && !showCreateForm ? (
            <Button
              variant="outline"
              className="w-full mb-4 border-dashed border-primary/50 hover:border-primary"
              onClick={() => setShowCreateForm(true)}
              data-testid="show-create-alert-form"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Alert for {currentTicker}
              {currentPrice && <span className="ml-2 text-muted-foreground">(Current: ${currentPrice.toFixed(2)})</span>}
            </Button>
          ) : showCreateForm && currentTicker ? (
            <Card className="mb-4 bg-secondary/30 border-primary/30">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-lg">{currentTicker}</span>
                  {currentPrice && (
                    <Badge variant="outline">Current: ${currentPrice.toFixed(2)}</Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={condition === 'above' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setCondition('above')}
                    data-testid="condition-above"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Above
                  </Button>
                  <Button
                    variant={condition === 'below' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setCondition('below')}
                    data-testid="condition-below"
                  >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Below
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Target price"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="bg-background font-mono"
                    data-testid="target-price-input"
                  />
                </div>

                {currentPrice && targetPrice && (
                  <div className="text-sm text-muted-foreground">
                    {condition === 'above' ? (
                      parseFloat(targetPrice) > currentPrice ? (
                        <span className="text-success">
                          Alert when price rises {((parseFloat(targetPrice) - currentPrice) / currentPrice * 100).toFixed(2)}% to ${parseFloat(targetPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-warning">Target is below current price</span>
                      )
                    ) : (
                      parseFloat(targetPrice) < currentPrice ? (
                        <span className="text-destructive">
                          Alert when price drops {((currentPrice - parseFloat(targetPrice)) / currentPrice * 100).toFixed(2)}% to ${parseFloat(targetPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-warning">Target is above current price</span>
                      )
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateForm(false);
                      setTargetPrice('');
                    }}
                    data-testid="cancel-create-alert"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={createAlert}
                    data-testid="create-alert-button"
                  >
                    Create Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !currentTicker && (
            <div className="mb-4 p-4 bg-secondary/30 rounded-lg text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Select a stock to create a price alert</p>
            </div>
          )}

          {/* Active Alerts */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Active Alerts ({activeAlerts.length})
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse h-14 bg-muted rounded-lg" />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className="bg-card border border-border/50"
                    data-testid={`alert-${alert.id}`}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => {
                          onSelectStock(alert.ticker);
                          onClose();
                        }}
                      >
                        {alert.condition === 'above' ? (
                          <TrendingUp className="w-5 h-5 text-success" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-destructive" />
                        )}
                        <div>
                          <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {alert.ticker}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {alert.condition === 'above' ? 'Above' : 'Below'} ${alert.target_price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-alert-${alert.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Triggered Alerts History */}
          {triggeredAlertsList.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Triggered ({triggeredAlertsList.length})
              </h3>
              <div className="space-y-2">
                {triggeredAlertsList.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className="bg-success/5 border border-success/20"
                    data-testid={`triggered-alert-${alert.id}`}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BellRing className="w-5 h-5 text-success" />
                        <div>
                          <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {alert.ticker}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hit ${alert.target_price.toFixed(2)} ({alert.condition})
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetAlert(alert.id)}
                          data-testid={`reset-alert-${alert.id}`}
                        >
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteAlert(alert.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Dismissed Alerts */}
          {dismissedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Dismissed ({dismissedAlerts.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {dismissedAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className="bg-muted/30 border border-border/30"
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {alert.ticker}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${alert.target_price.toFixed(2)} ({alert.condition})
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-muted-foreground"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
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
