import React, { useState } from 'react'
import '../styles/components/SharePassword.less' // импорт стилей для формы
import {useCryptoStore} from '../utils/store'
import {
    encryptData,
    decryptData,
    shareKey,
} from '../utils/crypto'

function SharePassword({setPage, item}) {
    // объявление переменных состояния
    const [login, setLogin] = useState(item?.login || '') // логин от стороннего сайта 
    const [email, setEmail] = useState('') // пароль от стороннего сайта
    const [site, setSite] = useState(item?.title || '') // название сайта 
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)
    const [time, setTime] = useState('0')
    
    // достаем публичный ключ из "облака", чтобы зашифровать данные
    const privateKey = useCryptoStore((state) => state.privateKey)

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const pwd = await fetch(
                `http://localhost:8080/get-one-dek?title=${encodeURIComponent(site)}&login=${encodeURIComponent(login)}`, {
                    method:'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                }                
            )

            const {
                enc_dek: encDEK,
                id: ID,
                owner_id: ownerID
            } = await pwd.json()

            // превращаем время в объект "Дата"
            const dateObject = new Date(time)
            // превращаем в формат "2026-03-08T13:30:00.000Z"
            const formattedTime = dateObject.toISOString()

            // получаем публичный ключ пользователя, которому даём пароль
            const res = await fetch(
                `http://localhost:8080/get-public-key?email=${encodeURIComponent(email)}`, {
                    method:'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                }                
            )
            const otherUser = await res.json()
            const publicKeyOtherUser = otherUser.PublicKey

            // расшифровываем DEK и одновременно шифруем другим ключом 
            const alianEncDEK = await shareKey(encDEK, privateKey, publicKeyOtherUser)

            // передаём пароль другому пользователю
            const response = await fetch("http://localhost:8080/pwd-acs-appr", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    Title: site,
                    // ID пароля из таблицы паролей
                    SecretID: ID,
                    // ID владельца пароля
                    OwnerID: ownerID,
                    // ID пользователя, который имеет к нему доступ
                    RecipientID: otherUser.ID,
                    // DEK, зашифрованный публичным ключом нового владельца
                    SharedEncryptedDEK: alianEncDEK,
                    ExpiresAt: formattedTime,
                })
            })

            if(response.ok) {
                setEmail('')
                setLogin('')
                setEmail('')
                setMessage('Пароль отправлен')
                setIsError(false)
                setPage('vault')
            } else {
                setMessage('Ошибка выдачи проля')
                setIsError(true)
            }

        } catch (error) {
            console.error('Ошибка сети или сервера:', error)
            setMessage('Не удалось подключиться к серверу.')
            setIsError(true)
        }
    }

    return (
        <div className="add">
            <h2 className="add-title">Поделиться паролем</h2>

            <form onSubmit={handleSubmit} className="add-form">
                <div className="form-group">
                    <label className="form-group-label">Название сайта</label>
                    <input
                        type="text"
                        className="form-group-input"
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                        required
                        placeholder="например, VK или Google"
                    />
                </div>

                <div className="form-group">
                    <label className="form-group-label">Логин (Email)</label>
                    <input
                        type="text"
                        className="form-group-input"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-group-label">Почта получателя</label>
                    <input
                        type="text"
                        className="form-group-input"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="login-button">
                    Отправить пароль
                </button>
            </form>

            {message && (
                <p className={`login-message ${isError ? 'login-message--error' : 'login-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}

export default SharePassword