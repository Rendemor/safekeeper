import React, { useState, useEffect } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import PasswordManager from './components/PasswordManager'
import AddPassword from './components/AddPassword'
import AcsReqPwdForm from './components/ReqPwdForm'
import PwdReq from './components/PwdReq'
import SharePassword from './components/SharePassword'
import Setup2FA from './components/Setup2FA'
import Verificate2FA from './components/Verificate2FA'
import { useCrypto } from './context/CryptoContext'

function App() { 
  const [page, setPage] = useState('login') // переключение между формами
  const [OTPEnable, setOTPEnable] = useState(false)
  const [is2FAVerified, setIs2FAVerified] = useState(false) // Новый флаг: прошел ли юзер проверку прямо сейчас
  
  const { privateKey, isAuthenticated, setIsAuthenticated, logout } = useCrypto()

  // проверка состояния сессии при загрузке или изменении ключа
  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (token && !privateKey) {
      alert("Сессия истекла. Введите мастер-пароль заново для расшифровки данных.")
      logout() 
      setPage('login')
    } 
    // Если залогинились (есть токен и ключ), решаем куда направить
    else if (token && privateKey) {
      setIsAuthenticated(true)

      if (!OTPEnable) {
        // Сценарий 1: 2FA не подключена -> только настройка
        setPage('2FA')
      } else if (!is2FAVerified) {
        // Сценарий 2: 2FA включена, но код еще не подтвержден в этой сессии
        setPage('ver-2FA')
      } else {
        // Сценарий 3: Все проверки пройдены -> в сейф
        setPage('vault')
      }
    }
  }, [privateKey, OTPEnable, is2FAVerified, logout, setIsAuthenticated])

  const handleLogout = () => {
    logout() 
    setPage('login')
    setOTPEnable(false)
    setIs2FAVerified(false)
  }

  const renderContent = () => {
    if (isAuthenticated && privateKey) {
      switch (page) {
        case '2FA': return <Setup2FA setPage={setPage} setOTPEnable={setOTPEnable} />
        case 'ver-2FA': return <Verificate2FA setPage={setPage} setIs2FAVerified={setIs2FAVerified} />
        case 'add': return <AddPassword />
        case 'pwd-acs-req': return <AcsReqPwdForm />
        case 'pwd-req': return <PwdReq />
        case 'pwd-share': return <SharePassword /> 
        case 'vault':
        default: return <PasswordManager />
      }
    }

    // логика для тех, кто не вошел
    switch (page) {
      case 'register':
        return (
          <>
            <RegisterForm setPage={setPage} />
            <p>Уже есть аккаунт? <button onClick={() => setPage('login')}>Войти</button></p>
          </>
        )
      case 'login':
      default:
        return (
          <> 
            <LoginForm setPage={setPage} setOTPEnable={setOTPEnable} />
            <p>Нет аккаунта? <button onClick={() => setPage('register')}>Зарегистрироваться</button></p>
          </>
        )
    }
  }

  return (
    <div className="app-container">
      {isAuthenticated && (
        <div className="nav-menu">
          {/* Кнопка выхода видна ВСЕГДА */}
          <p><button className="logout-button" onClick={handleLogout}>Выйти</button></p>
          
          {/* Кнопки управления появляются ТОЛЬКО если 2FA настроена И пройдена проверка кода */}
          {OTPEnable && is2FAVerified && (
            <>
              <p><button onClick={() => setPage('add')}>Добавить пароль</button></p>
              <p><button onClick={() => setPage('vault')}>Менеджер паролей</button></p>
              <p><button onClick={() => setPage('pwd-acs-req')}>Запросы паролей</button></p>
              <p><button onClick={() => setPage('pwd-share')}>Поделиться паролем</button></p>
              <p><button onClick={() => setPage('pwd-req')}>Запросить пароль</button></p>
            </>
          )}
        </div>
      )}
      
      {renderContent()}
    </div>
  )
}

export default App