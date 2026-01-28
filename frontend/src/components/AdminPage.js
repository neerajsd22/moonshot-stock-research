import { useState, useEffect } from 'react';
import { TrendingUp, Key, Copy, Trash2, Plus, RefreshCw, Lock, ArrowLeft, Check, Ban, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  const [accessCodes, setAccessCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [codeCount, setCodeCount] = useState(1);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    // Check if admin is already authenticated
    const adminToken = sessionStorage.getItem('admin_token');
    if (adminToken) {
      setIsAuthenticated(true);
      // Fetch codes on mount
      const fetchCodes = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`${API}/admin/access-codes`, {
            headers: { 'X-Admin-Token': adminToken }
          });
          setAccessCodes(response.data);
        } catch (error) {
          console.error('Error fetching codes:', error);
          if (error.response?.status === 401) {
            sessionStorage.removeItem('admin_token');
            setIsAuthenticated(false);
          }
        } finally {
          setLoading(false);
        }
      };
      fetchCodes();
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/admin/login`, { password: adminPassword });
      sessionStorage.setItem('admin_token', response.data.token);
      setIsAuthenticated(true);
      fetchAccessCodes(response.data.token);
      toast.success('Admin access granted');
    } catch (error) {
      toast.error('Invalid admin password');
    } finally {
      setVerifying(false);
    }
  };

  const getAdminToken = () => sessionStorage.getItem('admin_token');

  const fetchAccessCodes = async (token = null) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/access-codes`, {
        headers: { 'X-Admin-Token': token || getAdminToken() }
      });
      setAccessCodes(response.data);
    } catch (error) {
      console.error('Error fetching codes:', error);
      if (error.response?.status === 401) {
        sessionStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateCodes = async () => {
    setGenerating(true);
    try {
      const response = await axios.post(`${API}/admin/access-codes`,
        { count: codeCount },
        { headers: { 'X-Admin-Token': getAdminToken() } }
      );
      toast.success(`Generated ${response.data.codes.length} access code(s)`);
      fetchAccessCodes();
    } catch (error) {
      toast.error('Failed to generate codes');
    } finally {
      setGenerating(false);
    }
  };

  const deleteCode = async (code) => {
    try {
      await axios.delete(`${API}/admin/access-codes/${code}`, {
        headers: { 'X-Admin-Token': getAdminToken() }
      });
      toast.success('Code deleted');
      fetchAccessCodes();
    } catch (error) {
      toast.error('Failed to delete code');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activeCodes = accessCodes.filter(c => c.is_active);
  const usedCodes = accessCodes.filter(c => !c.is_active);

  // Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="admin-login">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <TrendingUp className="w-10 h-10 text-primary" />
              <h1 className="text-3xl font-bold text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Moonshot Admin
              </h1>
            </div>
          </div>

          <Card className="border-border/50 bg-card/95 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                Admin Access
              </CardTitle>
              <CardDescription>
                Enter the admin password to manage access codes
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <Input
                  type="password"
                  placeholder="Admin Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="bg-background"
                  autoFocus
                  data-testid="admin-password-input"
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={verifying || !adminPassword}
                  data-testid="admin-login-submit"
                >
                  {verifying ? 'Verifying...' : 'Access Admin Panel'}
                </Button>
              </form>
              
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-background p-4 md:p-8" data-testid="admin-dashboard">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Manage access codes</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
        </div>

        {/* Generate Codes Card */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Generate New Access Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="number"
                min="1"
                max="10"
                value={codeCount}
                onChange={(e) => setCodeCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 bg-background"
              />
              <Button onClick={generateCodes} disabled={generating}>
                {generating ? 'Generating...' : `Generate ${codeCount} Code${codeCount > 1 ? 's' : ''}`}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Each code can be used once. Share codes with people you want to give access to.
            </p>
          </CardContent>
        </Card>

        {/* Active Codes */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-success" />
                Active Codes ({activeCodes.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => fetchAccessCodes()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : activeCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No active codes</p>
                <p className="text-sm">Generate some codes above to share with users</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeCodes.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-4 bg-success/10 border border-success/30 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <code 
                        className="text-xl font-bold tracking-widest text-success"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {item.code}
                      </code>
                      <Badge variant="outline" className="text-success border-success/50">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={copiedCode === item.code ? 'default' : 'outline'}
                        onClick={() => copyCode(item.code)}
                        className="min-w-[80px]"
                      >
                        {copiedCode === item.code ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCode(item.code)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Used Codes */}
        {usedCodes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                <Key className="w-5 h-5" />
                Used Codes ({usedCodes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 opacity-60">
                {usedCodes.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-4 bg-muted/30 border border-border/30 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <code 
                        className="text-lg font-bold tracking-widest text-muted-foreground line-through"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {item.code}
                      </code>
                      <Badge variant="secondary">Used</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.used_at && new Date(item.used_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
