import React, { useState } from 'react';
import '../styles/components/SharePassword.less'; // импорт стилей для формы
import {useCrypto} from '../context/CryptoContext'
import {
    encryptData,
    decryptData
} from '../utils/crypto'

function SharePassword() {
    // объявление переменных состояния
    const [login, setLogin] = useState(''); // логин от стороннего сайта 
    const [email, setEmail] = useState(''); // пароль от стороннего сайта
    const [site, setSite] = useState(''); // название сайта 
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    
    // достаем публичный ключ из "облака", чтобы зашифровать данные
    const {privateKey} = useCrypto();

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            var res = await fetch(
                `http://localhost:8080/get-one-pwd?title=${encodeURIComponent(site)}&login=${encodeURIComponent(login)}`, {
                    method:'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                }                
            )
            const encryptPwd = await res.json()

            res = await fetch(
                `http://localhost:8080/get-public-key?email=${encodeURIComponent(email)}`, {
                    method:'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    }
                }                
            )
            const otherUser = await res.json()
            const publicKeyOtherUser = otherUser.PublicKey
            console.log(publicKeyOtherUser)

            const decPwd = await decryptData(
                        encryptPwd.EncryptedData, 
                        encryptPwd.EncryptedDEK, 
                        encryptPwd.EncryptionNonce, 
                        privateKey)
            
            // шифруем пароль публичным ключом человека, которому даём пароль
            const encPwd = await encryptData(decPwd, publicKeyOtherUser)

            const targetTime = new Date(Date.now() + 1 * 1000);
            const isoTimeString = targetTime.toISOString(); // формат: "2023-01-01T14:30:00.000Z"
            
            const response = await fetch("http://localhost:8080/pwd-acs-appr", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    ID: otherUser.ID, // ID пользователя, который запросил пароль
                    Title: site,
                    Login: login,
                    // это данные для того, кто запросил пароль, чтобы он смог расшифровать полученный пароль
                    encrypted_data: encPwd.encrypted_content, // зашифрованный пароль
                    encryption_nonce: encPwd.iv, // IV выступает в роли случайного шума
                    encrypted_dek: encPwd.encrypted_dek, // зашифрованный ключ для этого пароля
                    TimeLife: isoTimeString // время жизни пароля
                })
            })

            if(response.ok) {
                setEmail('')
                setLogin('')
                setEmail('')
                setMessage('Пароль отправлен')
                setIsError(false)
            } else {
                setMessage('Ошибка добавления проля')
                setIsError(true)
            }

        } catch (error) {
            console.error('Ошибка сети или сервера:', error);
            setMessage('Не удалось подключиться к серверу.');
            setIsError(true);
        }
    };

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
    );
}

export default SharePassword;