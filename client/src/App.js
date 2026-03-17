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
import { useCryptoStore } from './utils/store'
import { HasPermission } from './components/HasPermission'
import AdminPanel from './components/ViewUsers'

function App() { 
  const [page, setPage] = useState('login') // переключение между формами
  const [OTPEnable, setOTPEnable] = useState(false)
  const [is2FAVerified, setIs2FAVerified] = useState(false) // прошел ли пользователь проверку прямо сейчас
  // хранит выбранный проль для передачи его в компонент edit
  const [selectedPassword, setSelectedPassword] = useState(null)

  const logout = useCryptoStore((state) => state.logout)
  const isAuthenticated = useCryptoStore((state) => state.isAuthenticated)
  const setIsAuthenticated = useCryptoStore((state) => state.setIsAuthenticated)
  const privateKey = useCryptoStore((state) => state.privateKey)

  const handleEditClick = (pwd) => {
    // сохраняем данные пароля
    setSelectedPassword(pwd)
    // меняем компонент отрисовки
    setPage('pwd-edit')         
  }

  const handleShareClick = (pwd) => {
    // сохраняем данные пароля
    setSelectedPassword(pwd)
    // меняем компонент отрисовки
    setPage('pwd-share')         
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
        case 'pwd-share': return <SharePassword setPage={setPage} item={selectedPassword} /> 
        case 'admin-panel': return <AdminPanel></AdminPanel>
        case 'pwd-edit': 
        return <EditPassword  
          existingData={selectedPassword} 
          onSave={() => {
            setPage('vault')
            setSelectedPassword(null)
          }}
          onCancel={() => setPage('vault')}
        />
        case 'register': return <RegisterForm setPage={setPage} />
        case 'vault':
        default: return <PasswordManager onEdit={handleEditClick} onShare={handleShareClick} />
      }
    }
    
    // логика для тех, кто не вошел
    switch (page) {
      case 'login':
      default:
        return (
          <> 
            <LoginForm setPage={setPage} setOTPEnable={setOTPEnable} />
          </>
        )
    }
  }

  return (
    <div className="app">
      {isAuthenticated && (
        <header className="Header">
          <nav className="Header__nav">
            {OTPEnable && is2FAVerified && (
              <ul className="Header__menu">
                <li className="Header__item">
                  <button 
                    className={`Header__link ${page === 'vault' ? 'Header__link--active' : ''}`} 
                    onClick={() => setPage('vault')}
                  >
                    Менеджер
                  </button>
                </li>
                <HasPermission permission="secrets:create">
                  <li className="Header__item">
                    <button 
                      className={`Header__link ${page === 'add' ? 'Header__link--active' : ''}`} 
                      onClick={() => setPage('add')}
                    >
                      Добавить пароль
                    </button>
                  </li>
                </HasPermission>
                <HasPermission permission="secrets:request_access">
                  <li className="Header__item">
                    <button 
                      className={`Header__link ${page === 'pwd-req' ? 'Header__link--active' : ''}`} 
                      onClick={() => setPage('pwd-req')}
                    >
                      Запросить пароль
                    </button>
                  </li>
                </HasPermission>
                <HasPermission permission="secrets:grant_access">
                  <li className="Header__item">
                    <button 
                      className={`Header__link ${page === 'pwd-acs-req' ? 'Header__link--active' : ''}`} 
                      onClick={() => setPage('pwd-acs-req')}
                    >
                      Запросы
                    </button>
                  </li>
                </HasPermission>
                <HasPermission permission="users:create">
                  <li className="Header__item">
                    <button 
                      className={`Header__link ${page === 'register' ? 'Header__link--active' : ''}`} 
                      onClick={() => setPage('register')}
                    >
                      Регистрация нового пользователя
                    </button>
                  </li>
                </HasPermission>
                <HasPermission permission="users:view">
                  <li className="Header__item">
                    <button 
                      className={`Header__link ${page === 'admin-panel' ? 'Header__link--active' : ''}`} 
                      onClick={() => setPage('admin-panel')}
                    >
                      Пользователи
                    </button>
                  </li>
                </HasPermission>
              </ul>
            )}
            <button className="Header__logout" onClick={handleLogout}>Выйти</button>
          </nav>
        </header>
      )}
      
      <main className="Main">
        <section className="Main__section">
          {renderContent()}
        </section>
      </main>
    </div>
  )
}

export default App