import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import PasswordManager from './components/PasswordManager';
import AddPassword from './components/AddPassword';
import { useCrypto } from './context/CryptoContext';

function App() {
  const [page, setPage] = useState('login'); // переключение между формами
  
  // достаем всё из контекста, чтобы была синхронизация
  const { privateKey, isAuthenticated, setIsAuthenticated, logout } = useCrypto();

  // проверка состояния сессии при загрузке или изменении ключа
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // если токен в браузере есть, а ключа в памяти нет — значит страницу обновили и секретные данные стерлись
    if (token && !privateKey) {
      alert("Сессия истекла. Введите мастер-пароль заново для расшифровки данных.");
      logout(); // чистим всё через контекст
      setPage('login'); // кидаем на вход
    } 
    // если и токен на месте, и ключ в памяти появился (после логина) — показываем пароли
    else if (token && privateKey) {
      setIsAuthenticated(true);
      setPage('vault');
    }
  }, [privateKey, logout, setIsAuthenticated]);

  // функция для выхода. Просто вызываем наш глобальный logout и сбрасываем страницу
  const handleLogout = () => {
    logout(); 
    setPage('login');
  };

  // функция для отрисовки. В ней просто логика когда и что отрисовывается
  const renderContent = () => {
    // теперь ориентируемся на isAuthenticated из контекста + наличие ключа
    if (isAuthenticated && privateKey) {
      switch (page) {
        case 'add':
          return (
            <>
              <p><button onClick={() => setPage('vault')}>Менеджер паролей</button></p>
              <AddPassword />
            </>
          )
        case 'vault':
        default:
          return (
            <>
              <p><button onClick={() => setPage('add')}>Добавить пароль</button></p>
              <PasswordManager />
            </>
          )
      }
    }

    // логика для тех, кто не вошел или у кого нет ключа в памяти
    switch (page) {
      case 'register':
        return (
          <>
            <RegisterForm />
            <p>Уже есть аккаунт? <button onClick={() => setPage('login')}>Войти</button></p>
          </>
        );
      case 'login':
      default:
        return (
          <>
            {/* LoginForm сам вызовет setPrivateKey, и useEffect выше это подхватит */}
            <LoginForm />
            <p>Нет аккаунта? <button onClick={() => setPage('register')}>Регистрация</button></p>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      {/* кнопка выхода видна только когда мы реально внутри и с ключами */}
      {isAuthenticated && (
        <button className="logout-button" onClick={handleLogout}>Выйти</button>
      )}
      
      {renderContent()}
    </div>
  );
}

export default App;