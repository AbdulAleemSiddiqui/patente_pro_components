import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './router/AppRouter.jsx';
import './index.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);