// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.less'; 
import './styles/_reset.less'; 
import RegisterForm from './components/RegisterForm'; // компонент с регистрацией

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RegisterForm />
  </React.StrictMode>
);