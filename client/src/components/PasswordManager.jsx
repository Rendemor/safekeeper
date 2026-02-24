import React, { useEffect, useState } from 'react';
import '../styles/components/PasswordManager.less'; 
import { useCrypto } from '../context/CryptoContext';
import { decryptData } from '../utils/crypto';

// отдельный компонент для удобной отрисовки с дешифровкой
const PasswordRow = ({ item, privateKey }) => {
    const [decryptedPassword, setDecryptedPassword] = useState('********');
    const [isShown, setIsShown] = useState(false);

    // получение пароля из строки
    const getPlainPassword = async () => {

        // дефивруем пароль и возвращаем его
        return await decryptData(
            item.EncryptedData, 
            item.EncryptedDEK, 
            item.EncryptionNonce, 
            privateKey
        );
    };

    // функция для показывания или скрытия пароля
    const handleToggleShow = async () => {
        if (!isShown) {
            try {
                const pass = await getPlainPassword();
                setDecryptedPassword(pass);
            } catch (err) {
                console.error("Ошибка расшифровки:", err);
                setDecryptedPassword("Ошибка!");
            }
        } else {
            // просто меняем пароль на звёздочки
            setDecryptedPassword('********');
        }
        setIsShown(!isShown);
    };

    const handleCopy = async () => {
        try {
            const pass = await getPlainPassword();
            // встроенная функция, чтобы скопировать в буффер обмена любой текст
            await navigator.clipboard.writeText(pass);
            alert("Пароль скопирован в буфер обмена!");
        } catch (err) {
            console.error("Не удалось скопировать:", err);
            alert("Ошибка при копировании");
        }
    };

    return (
        <tr>
            <td>{item.Title}</td>
            <td>{item.Login}</td>
            <td>
                <input 
                    type={isShown ? "text" : "password"} 
                    value={decryptedPassword} 
                    readOnly 
                    className="vault-input-readonly"
                />
            </td>
            <td>
                <button className="vault-copy-btn" onClick={handleToggleShow}>
                    {isShown ? "Скрыть" : "Показать"}
                </button>

                <button className="vault-copy-btn" onClick={handleCopy}>
                    Копировать
                </button>
            </td>
        </tr>
    );
};

function PasswordManager() {
    const [passwords, setPasswords] = useState([]);
    // достаём приватный ключ для расшифровки полученных паролей
    const { privateKey } = useCrypto();

    const fetchPasswords = async () => {
        // передаю jwt токен для определения пользователя
        const response = await fetch('http://localhost:8080/get-pass', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        // проверяем, что пришёл именно массив
        if (Array.isArray(data)) {
            setPasswords(data);
        } else {
            console.error("Сервер прислал не массив:", data);
            setPasswords([]);
        }
    };

    // при отрисовке вызывается автоматически
    useEffect(() => {
        fetchPasswords();
    }, []);

    return (
        <div className="vault">
            <h2 className="vault-title">Мои пароли</h2>
            
            <table className="vault-table">
                <thead>
                    <tr>
                        <th>Сайт</th>
                        <th>Логин</th>
                        <th>Пароль</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody>
                    {/* просто итератор. Вся отрисовка выше, тут только перебираем пароли */}
                    {passwords.map((item) => (
                        <PasswordRow 
                            key={item.ID} 
                            item={item} 
                            privateKey={privateKey} 
                        />
                    ))}
                </tbody>
            </table>
            
            {/* надо потом добавить переход на форму */}
            <button className="vault-add-btn">+ Добавить пароль</button>
        </div>
    );
}

export default PasswordManager;