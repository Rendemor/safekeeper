import React, { useEffect, useState } from 'react'
import '../styles/components/ReqPwdForm.less'
import { 
    shareKey
} from '../utils/crypto'
import {useCryptoStore} from '../utils/store'
import { privateAPI } from '../api/private'

// отдельный компонент для удобной отрисовки с дешифровкой
const ReqRow = ({ item, onUpdate }) => {
    const [time, setTime] = useState('0')
    const privateKey = useCryptoStore((state) => state.privateKey)

    // даём доступ
    const handleGrantAccess = async (e) => {

        try {
            // запрашиваем конкретный пароль, чтобы зашифровать его и отправить другому пользователю
            const pwd = await privateAPI.GetDEK(item.Title, item.Login)

            const {
                enc_dek: encDEK,
                id: ID
            } = pwd

            const alianEncDEK = await shareKey(encDEK, privateKey, item.PublicKey)

            // превращаем время в объект "Дата"
            const dateObject = new Date(time)
            // превращаем в формат "2026-03-08T13:30:00.000Z"
            const formattedTime = dateObject.toISOString()

            await privateAPI.PwdAcsApp({
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

            onUpdate()
        } catch (err) {

        }
    }

    // отклоняем
    const handleRejectAccess = async (e) => {
        try{
            await privateAPI.PwdAcsRej({
                Title: item.Title,
                RecipientID: item.UserIDFrom,
            })
            onUpdate()
        } catch (err) {
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
    )
}

function ReqPwdForm() {
    const [req, setReq] = useState([])

    const fetchReq = async () => {
        try {
            const data = await privateAPI.PwdAcsReq()
            setReq(data)
        } catch (err) {
            setReq([])
        }
    }

    // при отрисовке вызывается автоматически
    useEffect(() => {
        fetchReq()
    }, [])

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
    )
}

export default ReqPwdForm