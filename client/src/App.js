import React, { useState, useEffect } from 'react'
import './/styles/components/App.less'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import PasswordManager from './components/PasswordManager'
import AddPassword from './components/AddPassword'
import AcsReqPwdForm from './components/ReqPwdForm'
import PwdReq from './components/PwdReq'
import SharePassword from './components/SharePassword'
import Setup2FA from './components/Setup2FA'
import Verificate2FA from './components/Verificate2FA'
import EditPassword from './components/EditPassword'
import { useCrypto } from './context/CryptoContext'

function App() { 
  const [page, setPage] = useState('login') // переключение между формами
  const [OTPEnable, setOTPEnable] = useState(false)
  const [is2FAVerified, setIs2FAVerified] = useState(false) // прошел ли пользователь проверку прямо сейчас
  // хранит выбранный проль для передачи его в компонент edit
  const [selectedPassword, setSelectedPassword] = useState(null)
  
  const { privateKey, isAuthenticated, setIsAuthenticated, logout } = useCrypto()


  const handleEditClick = (pwd) => {
    // сохраняем данные пароля
    setSelectedPassword(pwd)
    // меняем компонент отрисовки
    setPage('pwd-edit')         
  }

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
        case 'pwd-edit': 
        return <EditPassword  
          existingData={selectedPassword} 
          onSave={() => {
            setPage('vault')
            setSelectedPassword(null)
          }}
          onCancel={() => setPage('vault')}
        />
        case 'vault':
        default: return <PasswordManager onEdit={handleEditClick} />
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
    <div className="app">
      {isAuthenticated && (
        <header>
          <nav>
            {OTPEnable && is2FAVerified && (
              <ul>
                <li><button onClick={() => setPage('vault')}>Менеджер</button></li>
                <li><button onClick={() => setPage('add')}>Добавить</button></li>
                <li><button onClick={() => setPage('pwd-share')}>Поделиться</button></li>
                <li><button onClick={() => setPage('pwd-req')}>Запросить</button></li>
                <li><button onClick={() => setPage('pwd-acs-req')}>Входящие</button></li>
              </ul>
            )}
            <button className="logout" onClick={handleLogout}>Выйти</button>
          </nav>
        </header>
      )}
      
      <main>
        <section>
          {renderContent()}
        </section>
      </main>
    </div>
  )
}

export default App