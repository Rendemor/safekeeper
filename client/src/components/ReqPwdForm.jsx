import React, { useEffect, useState } from 'react'
import '../styles/components/ReqPwdForm.less'
import { 
    shareKey
} from '../utils/crypto'
import { 
    useCrypto,
} from '../context/CryptoContext'

// отдельный компонент для удобной отрисовки с дешифровкой
const ReqRow = ({ item, onUpdate }) => {
    const [time, setTime] = useState('0')
    const { privateKey } = useCrypto()

    // даём доступ
    const handleGrantAccess = async (e) => {

        // запрашиваем конкретный пароль, чтобы зашифровать его и отправить другому пользователю
        const pwd = await fetch(
            `http://localhost:8080/get-one-dek?title=${encodeURIComponent(item.Title)}&login=${encodeURIComponent(item.Login)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        })

        const {
            enc_dek: encDEK,
            id: ID
        } = await pwd.json()

        const alianEncDEK = await shareKey(encDEK, privateKey, item.PublicKey)

        // превращаем время в объект "Дата"
        const dateObject = new Date(time)
        // превращаем в формат "2026-03-08T13:30:00.000Z"
        const formattedTime = dateObject.toISOString()

        const response = await fetch("http://localhost:8080/pwd-acs-appr", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                Title: item.Title,
                // ID пароля из таблицы паролей
                SecretID: ID,
                // ID владельца пароля
                OwnerID: item.UserIDTo,
                // ID пользователя, который имеет к нему доступ
                RecipientID: item.UserIDFrom,
                // DEK, зашифрованный публичным ключом нового владельца
                SharedEncryptedDEK: alianEncDEK,
                ExpiresAt: formattedTime,
            })
        })

        if(response.ok) {
            onUpdate()
        }   
    }

    // отклоняем
    const handleRejectAccess = async (e) => {
        const response = await fetch("http://localhost:8080/pwd-acs-rej", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                ID: item.UserIDFrom, // ID пользователя, который запросил пароль
                Title: item.Title,
            })
        })

        if(response.ok) {
            onUpdate()
        } else {
            alert("Ошибка отклонения доступа")
        }
    }

    return (
        <tr>
            <td>{item.Title}</td>
            <td>
                <button className="vault-copy-btn" onClick={handleGrantAccess}>
                    Дать доступ
                </button>

                <button className="vault-copy-btn" onClick={handleRejectAccess}>
                    Отклонить
                </button>
            </td>
            <td>
                <input 
                    type="datetime-local"
                    className="form-group-input"   
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required          
                />
            </td>
        </tr>
    );
};

function ReqPwdForm() {
    const [req, setReq] = useState([]);

    const fetchReq = async () => {
        // передаю jwt токен для определения пользователя
        const response = await fetch('http://localhost:8080/pwd-acs-req', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        // проверяем, что пришёл именно массив
        if (Array.isArray(data)) {
            setReq(data);
        } else {
            console.error("Сервер прислал не массив:", data);
            setReq([]);
        }
    };

    // при отрисовке вызывается автоматически
    useEffect(() => {
        fetchReq();
    }, []);

    return (
        <div className="vault">
            <h2 className="vault-title">Запросы паролей</h2>
            
            <table className="vault-table">
                <thead>
                    <tr>
                        <th>Сайт</th>
                        <th>Действие</th>
                        <th>Время доступа, ч</th>
                    </tr>
                </thead>
                <tbody>
                    {/* просто итератор. Вся отрисовка выше, тут только перебираем запросы на получение паролей */}
                    {req.map((item) => (
                        <ReqRow 
                            key={item.ID} 
                            item={item} 
                            // передаём ребёнку доступ к функции, которая отправляет запрос в БД для получения всех запросов
                            // это необходимо, чтобы когда доступ был предоставлен или наоборот был запрещён, произошёл запрос
                            // в БД и были получены актуальные данные. Это самый безопасный вариант
                            onUpdate={fetchReq}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ReqPwdForm;