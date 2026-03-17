import React, { useEffect, useState } from 'react'
import '../styles/components/PasswordManager.less' 
import { decryptData } from '../utils/crypto'
import ConfirmModal from '../components/ConfirmModal'
import { useModal } from '../context/ModalContext'
import {useCryptoStore} from '../utils/store'
import { privateAPI } from '../api/private'
import { logAPI } from '../api/log'
import { HasPermission } from '../components/HasPermission'

// отдельный компонент для удобной отрисовки с дешифровкой
const PasswordRow = ({ item, privateKey, onEdit, onShare }) => {
    const [decryptedPassword, setDecryptedPassword] = useState('********')
    const [isShown, setIsShown] = useState(false)
    const { openModal } = useModal()

    // получение пароля из строки
    const getPlainPassword = async () => {
        try {
            const pwd = await decryptData(
                item.encrypted_data, 
                item.encrypted_dek, 
                item.encryption_nonce, 
                privateKey
            )
            return pwd
        } catch (err) {
            console.error("Ошибка расшифровки:", err)
        }
    }

    const handleEdit = async () => {
        // проверка на то, что пытаемся изменить чужой пароль. На всякий случай сделал проверку, хотя кнопку не рисую в таких случаях
        if(item.is_shared) {
            alert('Чужой пароль изменять нелья')
            return 
        }

        const result = await openModal(ConfirmModal, { title: item.title })

        if(!result) {
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
                const pass = await getPlainPassword()
                setDecryptedPassword(pass)

                await logAPI.PwdShow()
            } catch (err) {
                setDecryptedPassword("Ошибка!")
            }
        } else {
            // просто меняем пароль на звёздочки
            setDecryptedPassword('********')
        }
        setIsShown(!isShown)
    }

    // копирование пароля
    const handleCopy = async () => {
        try {
            const pass = await getPlainPassword()
            // встроенная функция, чтобы скопировать в буффер обмена любой текст
            await navigator.clipboard.writeText(pass)
            await logAPI.PwdCopy()

            alert("Пароль скопирован в буфер обмена!")
        } catch (err) {
            console.error("Не удалось скопировать:", err)
            alert("Ошибка при копировании")
        }
    }

    const handleDel = async (pwd) => {
        // на всякий случай дополнительное подтверждение
        if (!window.confirm(`Удалить пароль для ${pwd.title}?`)) return
        
        // вызываем модалку из контекста
        const result = await openModal(ConfirmModal, { title: item.title })

        if(!result) {
            return 
        }
        
        try {
            if(item.is_shared) {

                await privateAPI.DelSharedPwd({
                    id: item.id,
                    title: item.title,
                    login: item.login
                })
                alert('Пароль удалён') 

            } else {

                await privateAPI.DelOwnerPwd({
                    id: item.id,
                    title: item.title,
                    login: item.login
                })
                alert('Пароль удалён') 
                
            }
        } catch (err) {
            alert('Ошибка удаления пароля')
        }
    }

    return (
        <tr className="VaultRow">
            <td className="VaultRow__cell VaultRow__cell--title">{item.title}</td>
            <td className="VaultRow__cell VaultRow__cell--login">{item.login}</td>
            <td className="VaultRow__cell VaultRow__cell--password">
                <input 
                    type={isShown ? "text" : "password"} 
                    value={decryptedPassword} 
                    readOnly 
                    className="VaultRow__input"
                />
            </td>
            <td className="VaultRow__cell VaultRow__cell--actions">
                {/* Группа 1: Просмотр и копирование */}
                <div className="VaultRow__group">
                    <button className="VaultRow__button VaultRow__button--secondary" onClick={handleToggleShow}>
                        {isShown ? "Скрыть" : "Показать"}
                    </button>
                    <button className="VaultRow__button VaultRow__button--secondary" onClick={handleCopy}>
                        Копировать
                    </button>
                </div>

                {/* Группа 2: Управление (если не shared) */}
                {!item.is_shared && (
                    <div className="VaultRow__group">
                        <HasPermission permission={"secrets:shared"}>
                            <button className="VaultRow__button VaultRow__button--primary" onClick={() => onShare(item)}>
                                Поделиться
                            </button>
                        </HasPermission>
                        <HasPermission permission={"secrets_owner:update"}>
                            <button className="VaultRow__button VaultRow__button--primary" onClick={handleEdit}>
                                Изменить
                            </button>
                        </HasPermission>
                    </div>
                )}

                {/* Группа 3: Удаление */}
                <div className="VaultRow__group">
                    {item.is_shared ? (
                        <HasPermission permission="secrets_shared:delete">
                            <button className="VaultRow__button VaultRow__button--danger" onClick={() => handleDel(item)}>
                                Удалить доступ
                            </button>
                        </HasPermission>
                    ) : (
                        <HasPermission permission="secrets_owner:delete">
                            <button className="VaultRow__button VaultRow__button--danger" onClick={() => handleDel(item)}>
                                Удалить навсегда
                            </button>
                        </HasPermission>
                    )}
                </div>
            </td>
        </tr>
    )
}

function PasswordManager( {onEdit, onShare} ) {
    const [passwords, setPasswords] = useState([])
    // достаём приватный ключ для расшифровки полученных паролей
    const privateKey = useCryptoStore((state) => state.privateKey)

    const fetchPasswords = async () => {
        try {
            const data = await privateAPI.GetUserPwd()
            setPasswords(data)
        } catch {
            setPasswords([])
        }
    }

    // при отрисовке вызывается автоматически
    useEffect(() => {
        fetchPasswords()
    }, [])

    return (
        <div className="Vault">
            <h2 className="Vault__title">Мои пароли</h2>
            
            <table className="Vault__table">
                <thead className="Vault__head">
                    <tr>
                        <th className="Vault__th">Сайт</th>
                        <th className="Vault__th">Логин</th>
                        <th className="Vault__th">Пароль</th>
                        <th className="Vault__th">Действие</th>
                    </tr>
                </thead>
                <tbody className="Vault__body">
                    {passwords.map((item) => (
                        <PasswordRow 
                            key={item.ID} 
                            item={item} 
                            privateKey={privateKey} 
                            onEdit={onEdit}
                            onShare={onShare}
                        />
                    ))}
                </tbody>
            </table>
            
            <button className="Vault__addBtn">+ Добавить пароль</button>
        </div>
    )
}

export default PasswordManager