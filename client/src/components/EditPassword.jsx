import React, { useState, useRef } from 'react'
import '../styles/components/EditPassword.less' // импорт стилей для формы
import {useCryptoStore} from '../utils/store'
import {
    encryptData,
    shareKey
} from '../utils/crypto'

function EditPassword({existingData, onSave, onCancel}) {
    // объявление переменных состояния
    const [email, setEmail] = useState(existingData?.login || '') // логин от стороннего сайта 
    const [password, setPassword] = useState(existingData?.decrypted_password || '') // пароль от стороннего сайта
    const [site, setSite] = useState(existingData?.title || '') // название сайта 
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const initialValues = useRef({
        title: existingData?.title || '',
        login: existingData?.login || ''
    })

    const oldTitle = initialValues.current.title
    const oldLogin = initialValues.current.login

    const publicKey = useCryptoStore((state) => state.publicKey)
    const privateKey = useCryptoStore((state) => state.privateKey)

    // запрашиваем все публичные ключи людей, у который есть доступ к моему паролю
    const reqPublicKeys = async (e) => {
        // указываем куда отправить данные
        const res = await fetch('http://localhost:8080/get-rec-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // отправляем токен, чтобы сервер знал email того, кто отправляет пароль 
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                title: oldTitle, // название сайта
                login: oldLogin, // логин от сайта 
            }),
        })
        const data = await res.json()

        if(res.ok) {
            return data
        } else {
            setIsError(true)
            setMessage('Ошибка получения ключей')
        }
    }

    const getOneDEK = async (e) => {
        const pwd = await fetch(
            `http://localhost:8080/get-one-dek?title=${encodeURIComponent(oldTitle)}&login=${encodeURIComponent(oldLogin)}`, {
                method:'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            }                
        )
        return await pwd.json()
    }

    const handleSubmit = async (e) => {
        e.preventDefault() // запрет перезагрузки, чтобы страница не моргала
        setIsError(false)
        // шифруем пароль
        const encryptedData = await encryptData(password, publicKey)

        try {
            const {
                enc_dek: enc_dek,
                id: ID,
                owner_id: ownerID
            } = await getOneDEK()
            const keys = await reqPublicKeys()
            
            const alianEncDEK = await Promise.all(
                keys.map(async (userKey) => {
                    const encryptedKey = await shareKey(encryptedData.encrypted_dek, privateKey, userKey.public_key)
                    console.log(userKey.public_key)
                    return {
                        recipient_id: userKey.id,
                        encrypted_dek: encryptedKey
                    }
                })
            );

            // формируем что надо отправить
            const payload = {
                id: ID,                  
                title: site,
                login: email,
                encrypted_data: encryptedData.encrypted_content, 
                encryption_nonce: encryptedData.iv,           
                encrypted_dek: encryptedData.encrypted_dek,
                // до этого были данные для обновления основного пароля
                // теперь передаю массив из комбинации ID (доп. владелец пароля)
                shared_dek: alianEncDEK
            }

            // указываем куда отправить данные
            const res = await fetch('http://localhost:8080/pwd-edit', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    // отправляем токен, чтобы сервер знал email того, кто отправляет пароль 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })
            
            if(res.ok) {
                setIsError(false)
                onSave()
            } else {
                setMessage('Ошибка изменения пароля')
                setIsError(true)
            }
        } catch (error) {
            console.error('Ошибка сети или сервера:', error)
            setMessage('Не удалось подключиться к серверу.')
            setIsError(true)
        }
    }

    return (
        <div className="edit">
            <h2 className="edit-title">Изменить пароль</h2>

            <form onSubmit={handleSubmit} className="edit-form">
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-group-label">Пароль от сайта</label>
                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="form-group-input"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button 
                            type="button" 
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex="-1"
                        >
                            {showPassword ? "Скрыть" : "Показать"} 
                        </button>
                    </div>
                </div>

                <div className="edit-buttons">
                    <button type="submit" className="edit-button">
                        Сохранить
                    </button>
                    <button type="button" className="edit-button cancel" onClick={onCancel}>
                        Отмена
                    </button>
                </div>
            </form>

            {message && (
                <p className={`login-message ${isError ? 'login-message--error' : 'login-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}

export default EditPassword