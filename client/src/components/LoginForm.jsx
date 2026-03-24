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
    const setPermissions = useCryptoStore((state) => state.setPermissions)

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

            // получаем из полезной нагрузки jwt права
            const payloadJWT = JSON.parse(atob(token.split('.')[1]));
            const perms = payloadJWT.permissions
            setPermissions(perms)
            
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
        <div className="RegForm">
            <div className="RegForm__card">
                <h2 className="RegForm__title">Войти в аккаунт</h2>

                <form onSubmit={handleSubmit} className="RegForm__form">
                    <div className="RegForm__field">
                        <label htmlFor="email" className="RegForm__label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="RegForm__input"
                            value={email} // указываем, что значение в поле равно значению переменной
                            onChange={(e) => setEmail(e.target.value)} // в случае изменения значения, вызываем функцию изменения
                            required
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="pass" className="RegForm__label">Пароль</label>
                        <input
                            type="password"
                            id="pass"
                            className="RegForm__input"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="RegForm__button">
                        Войти
                    </button>
                </form>

                {/* если message не пустой, то отрисовываем блок с сообщением */}
                {message && (
                    <p className={`RegForm__message ${isError ? 'RegForm__message--error' : 'RegForm__message--success'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

export default LoginForm