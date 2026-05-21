import React from 'react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, Mail, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

type Mode = 'signin' | 'signup';

export function Auth() {
  const [mode, setMode] = React.useState<Mode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (!data.session) {
          setSuccessMsg('Account created! Check your email for a confirmation link before signing in.');
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? 'An unexpected error occurred.';
      setError(
        msg === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : msg === 'User already registered'
          ? 'An account with this email already exists. Please sign in.'
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden bg-background">
      {/* Multi-colour ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[30%] -left-[15%] w-[70%] h-[70%] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[65%] h-[65%] rounded-full bg-chart-1/20 blur-[140px]" />
        <div className="absolute top-[35%] right-[15%] w-[35%] h-[35%] rounded-full bg-chart-4/15 blur-[110px]" />
        <div className="absolute bottom-[20%] left-[25%] w-[25%] h-[25%] rounded-full bg-emerald-500/10 blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative"
      >
        <Card className="shadow-[0_0_80px_-16px_oklch(0.67_0.30_285_/_0.40)] border-white/8 bg-card/60 backdrop-blur-2xl relative overflow-hidden">
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          {/* Inner top glow */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-primary/6 to-transparent pointer-events-none" />

          <CardHeader className="text-center space-y-4 pb-5 pt-8 relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Logo variant="wordmark" className="mx-auto h-11 max-w-[200px]" />
            </motion.div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <CardDescription className="text-muted-foreground text-sm">
                {mode === 'signin'
                  ? 'Sign in to continue to HenceFlow.'
                  : 'Get started with your free account today.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-6 relative">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-400 leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 text-xs text-emerald-400 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10 bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 h-11 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="pl-10 pr-10 bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 h-11 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="pl-10 bg-muted/40 border-border/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-primary/40 focus-visible:border-primary/40 h-11 transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all disabled:opacity-60 mt-1 border-0"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.67 0.30 285), oklch(0.60 0.26 310))',
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              {mode === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>

          <div className="px-6 pb-5 text-center text-xs text-muted-foreground/40 border-t border-border/30 pt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
