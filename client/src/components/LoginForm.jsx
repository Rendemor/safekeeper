import React, { useState } from 'react'
import '../styles/components/LoginForm.less' // импорт стилей для формы регистрации
import { 
    deriveMasterKey, 
    deriveLoginHash,
    decryptPrivateKey
} from '../utils/crypto' // импорт функций для шифрования паролей
import { useCryptoStore } from '../utils/store'
import { authAPI } from '../api/auth'

// указываем функцию, кооторую можно вызывать внутри LoginForm, при этом сама функция внешняя 
function LoginForm({setPage, setOTPEnable}) {
    // объявление переменных состояния
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)

    const setPrivateKey = useCryptoStore((state) => state.setPrivateKey)
    const setPublicKey = useCryptoStore((state) => state.setPublicKey)
    const setIsAuthenticated = useCryptoStore((state) => state.setIsAuthenticated)  

    const handleSubmit = async (e) => {
        e.preventDefault() // заперт перезагрузки, чтобы страница не моргала после отправки данных

        // временно выводим сообщение. Статус ошибки пишем false, если вдруг до этого был true
        setMessage('Вход...')
        setIsError(false)

        try {
            // получили соль через API
            const salt = await authAPI.getSalt(email)

            // на основе пароля генерируем LoginHash и KEK. Ну KEK не нужен, но просто для проверки можно посчитать и посмотреть 
            // что получилось
            const loginHash = await deriveLoginHash(password, salt)
            const kek = await deriveMasterKey(password, salt)

            const payload = { email, password: loginHash }

            // отправляем запрос на проверку хэша
            const data = await authAPI.login(payload)

            // сохранение токена в браузере (localStorage)
            setMessage("Вы вошли успешно!")
            setIsError(false)

            // внутри handleLogin после успешного ответа от сервера
            const { token, encrypted_private_key, public_key, otp_enabled } = data

            // зная kek, расшифровываем приватный ключ, который получили от сервера
            const privateKey = await decryptPrivateKey(encrypted_private_key, kek)

            // сохраняем ключи в контексте (в памяти)
            setPrivateKey(privateKey)
            setPublicKey(public_key)
            localStorage.setItem('token', token)
            setIsAuthenticated(true)
            setPage('ver-2FA')
            setOTPEnable(otp_enabled)
        } catch (err) {
            setMessage(err.message || 'Произошла ошибка')
            setIsError(true)
        }
    }

    return (
        <div className="login">
            <h2 className="login-title">Войти в аккаунт</h2>

            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label htmlFor="email" className="form-group-label">Email</label>
                    <input
                        type="email"
                        className="form-group-input"
                        value={email} // указываем, что значение в поле равно значению переменной
                        onChange={(e) => setEmail(e.target.value)} // в случае изменения значения, вызываем функцию изменения значения email
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="pass" className="form-group-label">Пароль</label>
                    <input
                        type="password"
                        className="form-group-input"
                        // аналогично случаю с email
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="login-button">
                    Войти
                </button>
            </form>

            {/* если massage не пустой, то будет отрисовываться новый блок с сообщением с сервера */}
            {message && (
                <p className={`login-message ${isError ? 'login-message--error' : 'login-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}

export default LoginForm