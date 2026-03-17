import React, { useEffect, useState } from 'react'
import '../styles/components/RegisterForm.less' // импорт стилей для формы регистрации
import { 
    generateSalt, 
    deriveMasterKey, 
    generateRSAKeyPair, 
    exportKey, 
    encryptPrivateKey,
    deriveLoginHash
} from '../utils/crypto' // импорт функций для шифрования паролей
import { privateAPI } from '../api/private'

function RegisterForm({setPage}) {
    // объявление переменных состояния
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [patronymic, setPatronymic] = useState('')
    const [roles, setRoles] = useState([])
    const [selectedRole, setSelectedRole] = useState("")

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
            await privateAPI.Register({
                lastName, firstName, patronymic,
                role: selectedRole,
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

    useEffect(() => {
        // создаем внутреннюю асинхронную функцию
        const fetchRoles = async () => {
            const data = await privateAPI.GetAllRoles()
            setRoles(data)
        }

        fetchRoles()
    }, [])

    return (
        <div className="RegForm">
            <div className="RegForm__card">
                <h2 className="RegForm__title">Создать аккаунт</h2>

                <form onSubmit={handleSubmit} className="RegForm__form">
                    <div className="RegForm__field">
                        <label htmlFor="lastName" className="RegForm__label">Фамилия</label>
                        <input
                            type="text"
                            id="lastName"
                            className="RegForm__input"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="RegForm__field">
                        <label htmlFor="firstName" className="RegForm__label">Имя</label>
                        <input
                            type="text"
                            id="firstName"
                            className="RegForm__input"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="RegForm__field">
                        <label htmlFor="patronymic" className="RegForm__label">Отчество</label>
                        <input
                            type="text"
                            id="patronymic"
                            className="RegForm__input"
                            value={patronymic}
                            onChange={(e) => setPatronymic(e.target.value)}
                            required
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="email" className="RegForm__label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="RegForm__input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="role-select" className="RegForm__label">Роль пользователя</label>
                        <select
                            id="role-select"
                            className="RegForm__input RegForm__input--select"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            required
                        >
                            <option value="" disabled>Выберите роль</option>
                            {roles.map((role, index) => (
                                <option key={index} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
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
                        Создать пользователя
                    </button>
                </form>

                {message && (
                    <p className={`RegForm__message ${isError ? 'RegForm__message--error' : 'RegForm__message--success'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

export default RegisterForm