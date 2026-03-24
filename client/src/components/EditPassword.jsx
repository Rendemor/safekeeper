import React, { useState, useRef } from 'react'
import '../styles/components/EditPassword.less' // импорт стилей для формы
import {useCryptoStore} from '../utils/store'
import {
    encryptData,
    shareKey
} from '../utils/crypto'
import { privateAPI } from '../api/private'

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
            } = await privateAPI.GetDEK(oldTitle, oldLogin)
            const keys = await privateAPI.RecPublicKeys({ title: oldTitle, login: oldLogin })
            
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

            await privateAPI.EditPwd(payload)

            setIsError(false)
            setMessage('Пароль успешно изменён')
            onSave()
        } catch (error) {
            setMessage('Ошибка изменения пароля')
            setIsError(true)
        }
    }

    return (
        <div className="RegForm">
            <div className="RegForm__card">
                <h2 className="RegForm__title">Изменить пароль</h2>

                <form onSubmit={handleSubmit} className="RegForm__form">
                    <div className="RegForm__field">
                        <label htmlFor="site" className="RegForm__label">Название сайта</label>
                        <input
                            type="text"
                            id="site"
                            className="RegForm__input"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            required
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="email" className="RegForm__label">Логин (Email)</label>
                        <input
                            type="text"
                            id="email"
                            className="RegForm__input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="pass" className="RegForm__label">Пароль от сайта</label>
                        <div className="RegForm__input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="pass"
                                className="RegForm__input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button" 
                                className="RegForm__toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? "Скрыть" : "Показать"}
                            </button>
                        </div>
                    </div>

                    <div className="RegForm__actions">
                        <button type="submit" className="RegForm__button">
                            Сохранить
                        </button>
                        <button 
                            type="button" 
                            className="RegForm__button RegForm__button--danger" 
                            onClick={onCancel}
                        >
                            Отмена
                        </button>
                    </div>
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

export default EditPassword