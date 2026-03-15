import React, { useState } from 'react'
import '../styles/components/AddPassword.less' // импорт стилей для формы
import { useCryptoStore } from '../utils/store'
import {
    encryptData
} from '../utils/crypto'
import { privateAPI } from '../api/private'

function AddPassword() {
    // объявление переменных состояния
    const [email, setEmail] = useState('') // логин от стороннего сайта 
    const [password, setPassword] = useState('') // пароль от стороннего сайта
    const [site, setSite] = useState('') // название сайта 
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)
    
    // достаём публичный ключ из "хранилища", чтобы зашифровать данные
    const publicKey = useCryptoStore((state) => state.publicKey)

    const handleSubmit = async (e) => {
        e.preventDefault() // запрет перезагрузки, чтобы страница не моргала

        setMessage('Сохранение...')
        setIsError(false)

        try {
            // шифруем пароль. На выходе получаем объект с зашифрованным текстом, ключом DEK и IV (nonce)
            const encryptedData = await encryptData(password, publicKey)


            await privateAPI.AddPwd({
                title: site, // название сайта
                login: email, // логин от сайта 
                encrypted_data: encryptedData.encrypted_content, // зашифрованный пароль
                encryption_nonce: encryptedData.iv, // IV выступает в роли случайного шума
                encrypted_dek: encryptedData.encrypted_dek // зашифрованный ключ для этого пароля
            })
            
            setMessage("Пароль добавлен успешно!")
            setIsError(false)
            // очищаем поля после успеха
            setSite('')
            setEmail('')
            setPassword('')
        } catch (err) {
            setMessage(err.message || 'Произошла ошибка')
            setIsError(true)
        }
    }

    return (
        <div className="add">
            <h2 className="add-title">Добавить новый пароль</h2>

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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-group-label">Пароль от сайта</label>
                    <input
                        type="password"
                        className="form-group-input"
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="login-button">
                    Сохранить пароль
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

export default AddPassword