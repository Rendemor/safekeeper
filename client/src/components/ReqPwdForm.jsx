import React, { useEffect, useState } from 'react'
import '../styles/components/PasswordManager.less' 
import { shareKey } from '../utils/crypto'
import { useCryptoStore } from '../utils/store'
import { privateAPI } from '../api/private'

// отдельный компонент для удобной отрисовки с дешифровкой
const ReqRow = ({ item, onUpdate }) => {
    // текущее время + 7 дней
    const get_in_seven_days = () => {
        const now = new Date()
        now.setDate(now.getDate() + 7)
        
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const [time, set_time] = useState(get_in_seven_days())
    const private_key = useCryptoStore((state) => state.privateKey)

    // даём доступ
    const handle_grant_access = async () => {
        try {
            const pwd = await privateAPI.GetDEK(item.Title, item.Login)

            const {
                enc_dek: enc_dek_orig,
                id: secret_id
            } = pwd

            const alien_enc_dek = await shareKey(enc_dek_orig, private_key, item.PublicKey)

            const date_object = new Date(time)
            const formatted_time = date_object.toISOString()

            await privateAPI.PwdAcsApp({
                Title: item.Title,
                SecretID: secret_id,
                OwnerID: item.UserIDTo,
                RecipientID: item.UserIDFrom,
                SharedEncryptedDEK: alien_enc_dek,
                ExpiresAt: formatted_time,
            })

            onUpdate()
        } catch (err) {
            console.error("ОШИБКА ПРЕДОСТАВЛЕНИЯ ДОСТУПА:", err)
            alert("Ошибка предоставления доступа")
        }
    }

    // отклоняем
    const handle_reject_access = async () => {
        try {
            await privateAPI.PwdAcsRej({
                Title: item.Title,
                ID: item.UserIDFrom,
            })
            onUpdate()
        } catch (err) {
            console.error("ОШИБКА ОТКЛОНЕНИЯ ДОСТУПА:", err)
            alert("Ошибка отклонения доступа")
        }
    }

    return (
        <tr className="VaultRow">
            <td className="VaultRow__cell VaultRow__cell--title">{item.Title}</td>
            <td className="VaultRow__cell VaultRow__cell--login">{item.Login || '—'}</td>
            <td className="VaultRow__cell VaultRow__cell--password">
                <input 
                    type="datetime-local"
                    value={time}
                    onChange={(e) => set_time(e.target.value)}
                    className="VaultRow__input"
                />
            </td>
            <td className="VaultRow__cell VaultRow__cell--actions">
                {/* Группа 1: Основные действия */}
                <div className="VaultRow__group">
                    <button className="VaultRow__button VaultRow__button--primary" onClick={handle_grant_access}>
                        Дать доступ
                    </button>
                </div>

                {/* Группа 2: Отмена */}
                <div className="VaultRow__group">
                    <button className="VaultRow__button VaultRow__button--danger" onClick={handle_reject_access}>
                        Отклонить
                    </button>
                </div>
            </td>
        </tr>
    )
}

function ReqPwdForm() {
    const [requests, set_requests] = useState([])

    const fetch_requests = async () => {
        try {
            const data = await privateAPI.PwdAcsReq()
            set_requests(data)
        } catch (err) {
            console.error("ОШИБКА ПОЛУЧЕНИЯ ЗАПРОСОВ:", err)
            set_requests([])
        }
    }

    useEffect(() => {
        fetch_requests()
    }, [])

    return (
        <div className="Vault">
            <h2 className="Vault__title">Запросы паролей</h2>
            
            <table className="Vault__table">
                <thead className="Vault__head">
                    <tr>
                        <th className="Vault__th">Сайт</th>
                        <th className="Vault__th">Логин</th>
                        <th className="Vault__th">Срок доступа до</th>
                        <th className="Vault__th">Действие</th>
                    </tr>
                </thead>
                <tbody className="Vault__body">
                    {requests.map((item) => (
                        <ReqRow 
                            key={item.ID} 
                            item={item} 
                            onUpdate={fetch_requests}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default ReqPwdForm