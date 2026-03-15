import React, { useState } from 'react'
import '../styles/components/SharePassword.less' // импорт стилей для формы
import {useCryptoStore} from '../utils/store'
import {
    encryptData,
    decryptData,
    shareKey,
} from '../utils/crypto'
import { privateAPI } from '../api/private'

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
            const pwd = await privateAPI.GetDEK(site, login)
            const {
                id: ID,
                owner_id: OwnerID,
                enc_dek: encDEK
            } = pwd

            // превращаем время в объект "Дата"
            const dateObject = new Date(time)
            // превращаем в формат "2026-03-08T13:30:00.000Z"
            const formattedTime = dateObject.toISOString()

            const otherUser = await privateAPI.GetPublicKey(email)
            const publicKeyOtherUser = otherUser.PublicKey


            // расшифровываем DEK и одновременно шифруем другим ключом 
            const alianEncDEK = await shareKey(encDEK, privateKey, publicKeyOtherUser)

            // передаём пароль другому пользователю
            await privateAPI.SharePassword({
                Title: site,
                SecretID: ID,
                OwnerID: OwnerID,
                RecipientID: otherUser.ID,
                SharedEncryptedDEK: alianEncDEK,
                ExpiresAt: formattedTime
            })

            setEmail('')
            setLogin('')
            setEmail('')
            setMessage('Пароль отправлен')
            setIsError(false)
            setPage('vault')
        } catch (error) {
            console.error("Error sharing password:", error)
            setMessage('Ошибка выдачи проля')
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