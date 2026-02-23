// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.less'; 
import './styles/_reset.less'; 
import App from './App.js'
import { CryptoProvider } from './context/CryptoContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CryptoProvider>
      <App />
    </CryptoProvider>
  </React.StrictMode>
);