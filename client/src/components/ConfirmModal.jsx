import React, { useState } from 'react';
import '../styles/components/ConfirmModal.less';
import {
    deriveLoginHash,
} from '../utils/crypto'
import { privateAPI } from '../api/private'

function ConfirmModal({ title, onConfirm, onCancel }) {
    
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
            
        try {
            const salt = await privateAPI.getSalt()

            // на основе пароля генерируем LoginHash и KEK. Ну KEK не нужен, но просто для проверки можно посчитать и посмотреть 
            // что получилось
            const loginHash = await deriveLoginHash(password, salt)
            await privateAPI.VerifyPwd(loginHash)
            onConfirm(true)
        } catch (err) {
            setError('Неверный мастер-пароль')
        }

    };

    return (
        <div className="confirm-overlay" onClick={onCancel}>
            {/* Остановка всплытия, чтобы клик по самой модалке её не закрывал */}
            <div className="confirm-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="confirm-title">Подтвердите личность</h3>
                <p className="confirm-text">Введите мастер-пароль для доступа к паролю {title}</p>
                
                <form onSubmit={handleSubmit} className="confirm-form">
                    <input 
                        type="password" 
                        className="confirm-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Мастер-пароль"
                        autoFocus
                        required
                    />
                    {error && <span className="confirm-message confirm-message--error">{error}</span>}
                    
                    <div className="confirm-actions">
                        <button type="submit" className="confirm-button confirm-button--submit">
                            Подтвердить
                        </button>
                        <button type="button" onClick={onCancel} className="confirm-button confirm-button--cancel">
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ConfirmModal;