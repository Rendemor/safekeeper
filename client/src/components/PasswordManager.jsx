import React, { useEffect, useState } from 'react';
import '../styles/components/PasswordManager.less'; 
import { useCrypto } from '../context/CryptoContext';
import { decryptData } from '../utils/crypto';
import ConfirmModal from '../components/ConfirmModal'

// отдельный компонент для удобной отрисовки с дешифровкой
const PasswordRow = ({ item, privateKey, onEdit }) => {
    const [decryptedPassword, setDecryptedPassword] = useState('********');
    const [isShown, setIsShown] = useState(false);

    // получение пароля из строки
    const getPlainPassword = async () => {

        // дефивруем пароль и возвращаем его
        return await decryptData(
            item.encrypted_data, 
            item.encrypted_dek, 
            item.encryption_nonce, 
            privateKey
        );
    };

    const handleEdit = async () => {
        // проверка на то, что пытаемся изменить чужой пароль. На всякий случай сделал проверку, хотя кнопку не рисую в таких случаях
        if(item.is_shared) {
            alert('Чужой пароль изменять нелья')
            return 
        }

        const decrypted_password = await getPlainPassword()

        onEdit({
            ...item, 
            decrypted_password: decrypted_password
        })
    }

    // функция для показывания или скрытия пароля
    const handleToggleShow = async () => {
        if (!isShown) {
            try {
                const pass = await getPlainPassword();
                setDecryptedPassword(pass);

                await fetch('http://localhost:8080/pwd-show', {
                    method: 'POST',
                    headers: { 
                        // обязательно добавляем токен, иначе сервер не поймёт кто отправил запрос
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json' // Хорошим тоном считается указывать тип контента
                    }
                });
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

    // копирование пароля
    const handleCopy = async () => {
        try {
            const pass = await getPlainPassword();
            // встроенная функция, чтобы скопировать в буффер обмена любой текст
            await navigator.clipboard.writeText(pass);

            await fetch('http://localhost:8080/pwd-copy', {
                method: 'POST',
                headers: { 
                    // обязательно добавляем токен, иначе сервер не поймёт кто отправил запрос
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json' // Хорошим тоном считается указывать тип контента
                }
            });

            alert("Пароль скопирован в буфер обмена!");
        } catch (err) {
            console.error("Не удалось скопировать:", err);
            alert("Ошибка при копировании");
        }
    };

    return (
        <tr>
            <td>{item.title}</td>
            <td>{item.login}</td>
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

                {!item.is_shared && (
                    <button className="vault-copy-btn" onClick={handleEdit}>
                        Изменить
                    </button>
                )}

            </td>
        </tr>
    );
};

function PasswordManager( {onEdit} ) {
    const [passwords, setPasswords] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingItem, setPendingItem] = useState(null); // Тут лежит пароль, который ждет подтверждения
    // достаём приватный ключ для расшифровки полученных паролей
    const { privateKey } = useCrypto();

    // передаёт элемент в модалку
    const handleStartEdit = (item) => {
        setPendingItem(item);
        setIsModalOpen(true);  
    };

    // если нажали ок в модалке
    const handleConfirmSuccess = async () => {
        setIsModalOpen(false); 
        
        // расшифровка
        const decrypted = await decryptData(
            pendingItem.encrypted_data, 
            pendingItem.encrypted_dek, 
            pendingItem.encryption_nonce, 
            privateKey
        );

        // передаём пароль выше по иерархии (в app). Дальше там вызывается редактирование
        onEdit({ ...pendingItem, decrypted_password: decrypted });
    };

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
                            // передаём вызовы модалки в кажый item, чтобы к каждой кнопке привязать
                            onEdit={handleStartEdit}
                        />
                    ))}
                </tbody>
            </table>
            
            {/* надо потом добавить переход на форму */}
            <button className="vault-add-btn">+ Добавить пароль</button>

            
            {isModalOpen && (
                <ConfirmModal 
                    onConfirm={handleConfirmSuccess} 
                    onCancel={() => setIsModalOpen(false)} 
                />
            )}
        </div>
    );
}

export default PasswordManager;