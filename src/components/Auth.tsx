import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, Mail, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'forgot';

const MOCK_TASKS = [
  { id: 1, priority: 'MEDIUM', priorityColor: 'text-sky-400', dot: 'bg-sky-400', title: 'Deploy UI Fixes', date: '22 May' },
  { id: 2, priority: 'URGENT', priorityColor: 'text-rose-400', dot: 'bg-rose-500', title: 'Design the ER Diagram for the Data Model', date: '22 May' },
  { id: 3, priority: 'LOW', priorityColor: 'text-slate-400', dot: 'bg-slate-400', title: 'Plan Launch', date: '21 May' },
];

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

    if (mode === 'forgot') {
      if (!email.trim()) { setError('Please enter your email address.'); return; }
      setIsLoading(true);
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}`,
        });
        if (err) throw err;
        setSuccessMsg('Password reset email sent! Check your inbox and follow the link.');
      } catch (err: any) {
        setError(err?.message ?? 'Failed to send reset email.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
    <div className="min-h-screen flex font-sans bg-[#0d0d18]">
      {/* ── Left: form panel ── */}
      <div className="flex flex-col w-full lg:w-1/2 px-8 md:px-14 py-8 relative overflow-hidden">
        {/* Subtle top-left glow */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <span className="text-white font-bold text-base leading-none">H</span>
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">HenceFlow</span>
        </div>

        {/* Form content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[380px] mx-auto lg:mx-0 pt-16 pb-10 flex flex-col gap-6"
        >
          {/* Heading */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {mode === 'forgot' ? 'Account recovery' : mode === 'signin' ? 'Welcome back' : 'Get started'}
            </p>
            <h1 className="text-[2.1rem] font-bold text-white leading-tight tracking-tight">
              {mode === 'forgot' ? (
                'Reset your password'
              ) : mode === 'signin' ? (
                <>Sign in to <em style={{ fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif' }}>HenceFlow</em></>
              ) : (
                <>Create your <em style={{ fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif' }}>HenceFlow</em></>
              )}
            </h1>
            <p className="text-[0.875rem] text-muted-foreground leading-relaxed">
              {mode === 'forgot'
                ? "Enter your email and we'll send you a link to reset your password."
                : mode === 'signin'
                ? 'Continue tracking development with your team.'
                : 'Get started with your free account today.'}
            </p>
          </div>

          {/* Social buttons — shown only for signin/signup */}
          {mode !== 'forgot' && (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  title="OAuth not configured"
                  onClick={() => setError('Social login is not yet configured. Please sign in with email.')}
                  className="flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-border/60 bg-white/[0.04] text-sm font-medium text-foreground/50 hover:bg-white/[0.08] hover:border-border transition-all cursor-not-allowed"
                >
                  <svg className="w-4 h-4 shrink-0 opacity-50" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  type="button"
                  title="OAuth not configured"
                  onClick={() => setError('Social login is not yet configured. Please sign in with email.')}
                  className="flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-border/60 bg-white/[0.04] text-sm font-medium text-foreground/50 hover:bg-white/[0.08] hover:border-border transition-all cursor-not-allowed"
                >
                  <svg className="w-4 h-4 shrink-0 fill-current opacity-50" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">or email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            </>
          )}

          {/* Error / Success */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 h-12 bg-white/[0.05] border-border/50 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Password — hidden in forgot mode */}
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="pl-10 pr-10 h-12 bg-white/[0.05] border-border/50 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password (signup only) */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-sm font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pl-10 h-12 bg-white/[0.05] border-border/50 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 rounded-xl transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-[15px] font-semibold text-white rounded-xl shadow-lg shadow-violet-500/25 transition-all disabled:opacity-60 mt-1 border-0"
              style={{
                background: 'linear-gradient(135deg, oklch(0.65 0.28 285), oklch(0.55 0.25 305))',
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'forgot' ? (
                'Send reset email'
              ) : mode === 'signin' ? (
                <>Sign in &nbsp;→</>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'forgot' ? (
              <>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
                >
                  Back to sign in
                </button>
              </>
            ) : mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </motion.div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-muted-foreground/40 mt-auto pt-4">
          <span>© 2026 HenceFlow</span>
          <span className="flex items-center gap-1.5">
            <span>SOC 2</span>
            <span className="opacity-50">·</span>
            <span>GDPR</span>
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="hidden lg:block w-px bg-border/20 self-stretch shrink-0" />

      {/* ── Right: decorative panel ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-[#10101c] px-12 py-10 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-sky-600/6 blur-[100px] pointer-events-none" />

        {/* Mock task board */}
        <div className="flex-1 flex items-center justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="w-full max-w-[540px] rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl"
          >
            {/* Panel header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/20">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">Product Development and Launch</span>
              <span className="ml-1.5 text-xs font-bold text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full tabular-nums">3</span>
            </div>

            {/* Mock task cards */}
            <div className="p-3 space-y-2">
              {MOCK_TASKS.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + i * 0.1 }}
                  className="rounded-xl border border-border/25 bg-card/60 p-4 space-y-1.5"
                >
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase ${task.priorityColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.dot}`} />
                    {task.priority}
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-snug">{task.title}</p>
                  <p className="text-[11px] text-muted-foreground/50 font-medium">{task.date}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="relative z-10 space-y-3"
        >
          <p
            className="text-[1.15rem] text-foreground/80 leading-snug"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
          >
            "Cut our planning overhead in half."
          </p>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30" />
        </motion.div>
      </div>
    </div>
  );
}
