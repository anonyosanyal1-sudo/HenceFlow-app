import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';
import { Loader2, AlertCircle } from 'lucide-react';

export function Auth() {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      let message = "An unexpected error occurred during login.";
      
      if (err.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = "Login popup was closed before completion. Please try again.";
      } else if (err.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized for Firebase Authentication. Please add it to 'Authorized domains' in your Firebase Console.";
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mb-4 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              HF
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-white">HenceFlow</CardTitle>
            <CardDescription className="text-zinc-400 text-base">
              The high-performance platform for dev teams to plan, track, and ship software.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-xs text-red-400 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <Button 
              className="w-full py-7 text-base font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center space-x-3 disabled:opacity-70" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Coming Soon</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 opacity-50 grayscale pointer-events-none">
              <Button variant="outline" className="py-5 border-border text-muted-foreground">Email</Button>
            </div>
          </CardContent>
          <div className="p-6 text-center text-xs text-muted-foreground border-t border-border mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
