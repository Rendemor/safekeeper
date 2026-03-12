import React, { useState } from 'react';
import '../styles/components/ConfirmModal.less';
import {
    deriveLoginHash,
} from '../utils/crypto'

function ConfirmModal({ title, onConfirm, onCancel }) {
    
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    // соль через jwt
    const getSalt = async (e) => {
        try {
            // получаем соль с сервера. Запрос идёт на get-salt. Дальше идёт ?, который означает "дальше идут дополнительные параметры"
            // в качестве дополнительных параметров я указал почту, чтобы сервер смог найти пользователя в БД и отправить соль
            const res = await fetch(`http://localhost:8080/get-salt-jwt`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            
            // сначала парсим JSON, независимо от статуса
            const data = await res.json()

            if (!res.ok) {
                // тут data будет содержать {"error": "Пользователь не найден"}
                console.error("Сервер вернул ошибку:", data.error)
                alert(data.error) 
                return
            }
            return data
        } catch (err) {
            // сюда попадем, если сервер вообще недоступен или JSON сломан
            console.error("Сетевая ошибка:", err)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const { salt: saltBase64 } = await getSalt()
            
        // перевод соли из base64 обратно в байты
        const salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)))

        // на основе пароля генерируем LoginHash и KEK. Ну KEK не нужен, но просто для проверки можно посчитать и посмотреть 
        // что получилось
        const loginHash = await deriveLoginHash(password, salt)

        // отправка loginHash на проверку
        const loginRes = await fetch(`http://localhost:8080/verify-owner?hash=${encodeURIComponent(loginHash)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })

        if(loginRes.ok) {
            onConfirm(true)
        } else {
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