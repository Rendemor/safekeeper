import React, { useEffect, useState } from 'react'
import '../styles/components/ReqPwdForm.less'
import { decryptData, encryptData } from '../utils/crypto'
import { useCrypto } from '../context/CryptoContext'

// отдельный компонент для удобной отрисовки с дешифровкой
const ReqRow = ({ item, onUpdate }) => {
    const [time, setTime] = useState('0')
    const { privateKey } = useCrypto()

    // даём доступ
    const handleGrantAccess = async (e) => {

        // запрашиваем конкретный пароль, чтобы зашифровать его и отправить другому пользователю
        const pwd = await fetch(
            `http://localhost:8080/get-one-pwd?title=${encodeURIComponent(item.Title)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        })

        const data = await pwd.json()

        // расшифровали пароль
        const decPwd = decryptData(
            data.EncryptedData, 
            data.EncryptedDEK, 
            data.EncryptionNonce, 
            privateKey
        )

        const encryptedData = await encryptData(decPwd, item.PublicKey)

        // непонятные преобразования в формат как на сервере
        // преобразуем time (в минутах/секундах) в дату RFC3339
        const timeInSeconds = parseInt(time, 10); // убедимся, что time — число
        if (isNaN(timeInSeconds)) {
            console.error('Неверный формат времени: time должен быть числом');
            return;
        }
        const targetTime = new Date(Date.now() + timeInSeconds * 1000);
        const isoTimeString = targetTime.toISOString(); // формат: "2023-01-01T14:30:00.000Z"

        console.log(item.UserIDTo, item.UserIDFrom)

        const response = await fetch("http://localhost:8080/pwd-acs-appr", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                ID: item.UserIDFrom, // ID пользователя, который запросил пароль
                Title: item.Title,
                Login: item.Login,
                // это данные для того, кто запросил пароль, чтобы он смог расшифровать полученный пароль
                encrypted_data: encryptedData.encrypted_content, // зашифрованный пароль
                encryption_nonce: encryptedData.iv, // IV выступает в роли случайного шума
                encrypted_dek: encryptedData.encrypted_dek, // зашифрованный ключ для этого пароля
                TimeLife: isoTimeString // время жизни пароля
            })
        })

        if(response.ok) {
            onUpdate()
        } else {
           alert("Ошибка при выдаче доступа") 
        }
    }

    // отклоняем
    const handleRejectAccess = async (e) => {
        
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
                    type="time"   
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