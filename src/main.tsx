import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {isSupabaseConfigured} from './lib/supabase';
import './index.css';

function ConfigError() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 mb-6 font-bold text-2xl">!</div>
      <h1 className="text-2xl font-bold mb-2">Configuration required</h1>
      <p className="text-muted-foreground max-w-md mb-2">
        HenceFlow can't start because Supabase isn't configured.
      </p>
      <p className="text-muted-foreground/70 max-w-md text-sm font-mono bg-black/30 rounded-lg p-4">
        Set <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in your environment, then reload.
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? <App /> : <ConfigError />}
  </StrictMode>,
);
