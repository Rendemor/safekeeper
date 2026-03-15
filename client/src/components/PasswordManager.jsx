import React, { useEffect, useState } from 'react'
import '../styles/components/PasswordManager.less' 
import { decryptData } from '../utils/crypto'
import ConfirmModal from '../components/ConfirmModal'
import { useModal } from '../context/ModalContext'
import {useCryptoStore} from '../utils/store'
import { privateAPI } from '../api/private'
import { logAPI } from '../api/log'

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
                    <div>
                        <button className="vault-copy-btn" onClick={() => onShare(item)}>
                            Поделиться
                        </button>

                        <button className="vault-copy-btn" onClick={handleEdit}>
                            Изменить
                        </button>
                    </div>
                )}

                <button className="vault-del-btn" onClick={() => handleDel(item)}>
                    Удалить
                </button>

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
                            onEdit={onEdit}
                            onShare={onShare}
                        />
                    ))}
                </tbody>
            </table>
            
            {/* надо потом добавить переход на форму */}
            <button className="vault-add-btn">+ Добавить пароль</button>

        </div>
    )
}

export default PasswordManager