import React, { useState } from 'react'
import '../styles/components/RegisterForm.less' // импорт стилей для формы регистрации
import { 
    generateSalt, 
    deriveMasterKey, 
    generateRSAKeyPair, 
    exportKey, 
    encryptPrivateKey,
    deriveLoginHash
} from '../utils/crypto' // импорт функций для шифрования паролей
import { authAPI } from '../api/auth'

function RegisterForm({setPage}) {
    // объявление переменных состояния
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault() // заперт перезагрузки, чтобы страница не моргала после отправки данных

        // временно выводим сообщение. Статус ошибки пишем false, если вдруг до этого был true
        setMessage('Регистрация...')
        setIsError(false)

        try {
            // генерация соли и RSA (публичный + приватный ключи)
            const salt = generateSalt()
            const RSAKeys = await generateRSAKeyPair()

            // генерация KEK (key encryption for key - ключ для шифрования ключа) на основе мастер-пароля (просто ключ от учётной записи)
            const kek = await deriveMasterKey(password, salt)

            // хеширование пароля, чтобы на сервер сразу приходил только хеш пароля
            const loginHash = await deriveLoginHash(password, salt) 

            // шифрование приватного ключа с помощью kek
            const encryptedPrivKey = await encryptPrivateKey(RSAKeys.privateKey, kek)

            // экспортирование ключа в base64
            const exportedPubKey = await exportKey(RSAKeys.publicKey)

            // экспортирование соли в base64 для хранения
            const saltString = btoa(String.fromCharCode(...salt))

            // указываем куда отправить данные, а также тип запрос, какие данные и само наполнение
            await authAPI.Register({
                email: email, 
                password: loginHash, // пароль для bcrypt на сервере
                master_key_salt: saltString,
                public_key: exportedPubKey,
                encrypted_private_key: encryptedPrivKey
            })

            setMessage('Регистрация прошла успешно!')
            setIsError(false)
            // очистка полей
            setEmail('') 
            setPassword('')
            setPage('login')
        } catch (err) {
            setMessage(err?.message || 'Не удалось подключиться к серверу')
            setIsError(true)
        }
    }

    return (
        <div className="registration">
            <h2 className="registration-title">Создать аккаунт</h2>

            <form onSubmit={handleSubmit} className="registration-form">
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

                <button type="submit" className="registration-button">
                    Зарегистрироваться
                </button>
            </form>

            {/* если massage не пустой, то будет отрисовываться новый блок с сообщением с сервера */}
            {message && (
                <p className={`registration-message ${isError ? 'registration-message--error' : 'registration-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}

export default RegisterForm