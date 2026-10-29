import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';

// Aether uses a permanent light theme.
// The .dark class is unconditionally removed on every render.

export const App: React.FC = () => {
  useEffect(() => {
    // Permanently ensure light theme — remove any residual .dark class
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
