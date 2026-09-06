import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/ui/Toasts';
import { getInitialTheme, applyTheme } from './lib/theme';
import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/global.css';

const theme = getInitialTheme();
applyTheme(theme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);