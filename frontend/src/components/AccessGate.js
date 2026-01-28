import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Key, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import confetti from 'canvas-confetti';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AccessGate = ({ children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Confetti celebration function
  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#d946ef', '#f0abfc', '#c026d3', '#a855f7', '#e879f9'];

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors
    });

    frame();
  }, []);

  useEffect(() => {
    // Check if user already has a valid access code stored
    const storedCode = localStorage.getItem('access_code');
    if (storedCode) {
      verifyCode(storedCode, true);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyCode = async (code, silent = false) => {
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/access/verify`, { 
        code: code.toUpperCase(),
        skip_decrement: silent  // Don't decrement on re-verification
      });
      if (response.data.valid) {
        localStorage.setItem('access_code', code.toUpperCase());
        if (!silent) {
          // Show confetti celebration for new logins
          setShowConfetti(true);
          triggerConfetti();
          toast.success('Welcome to Moonshot! 🚀');
          // Delay transition to show confetti for 3 seconds
          setTimeout(() => {
            setShowConfetti(false);
            setHasAccess(true);
          }, 3000);
        } else {
          setHasAccess(true);
        }
      } else {
        if (!silent) {
          toast.error('Invalid access code');
        }
        localStorage.removeItem('access_code');
      }
    } catch (error) {
      console.error('Verification error:', error);
      if (!silent) {
        toast.error(error.response?.data?.detail || 'Invalid access code');
      }
      localStorage.removeItem('access_code');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    verifyCode(accessCode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-[#d946ef] animate-pulse" />
          <p className="text-gray-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show celebration screen during confetti
  if (showConfetti) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center animate-bounce-in">
          <TrendingUp className="w-20 h-20 mx-auto mb-6 text-[#d946ef]" />
          <h1 
            className="text-5xl font-bold gold-text mb-4"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Welcome!
          </h1>
          <p className="text-xl text-gray-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Get ready to discover your next big win...
          </p>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4" data-testid="access-gate">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <TrendingUp className="w-12 h-12 text-[#d946ef]" />
            <div>
              <h1 
                className="text-4xl font-bold gold-text"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Moonshot
              </h1>
            </div>
          </div>
          <p className="text-gray-400 text-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Discover Your Next Big Win
          </p>
        </div>

        <Card className="premium-card gold-gradient-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Key className="w-5 h-5 text-[#d946ef]" />
              Enter Access Code
            </CardTitle>
            <CardDescription className="text-gray-400">
              This app is invite-only. Enter your access code to continue.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="XXXXXXXX"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="input-premium text-center text-2xl tracking-[0.3em] uppercase text-white"
                style={{ fontFamily: 'DM Mono, monospace' }}
                maxLength={8}
                autoFocus
                data-testid="access-code-input"
              />
              <Button 
                type="submit" 
                className="w-full btn-premium"
                disabled={verifying || !accessCode.trim()}
                data-testid="access-submit"
              >
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 purple-spinner" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    Enter App
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
            
            <p className="text-xs text-gray-500 text-center mt-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Need an access code? Contact the app owner.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessGate;
