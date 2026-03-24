import React, { useEffect, useState } from 'react'
import '../styles/components/PasswordManager.less' 
import { decryptData } from '../utils/crypto'
import {useCryptoStore} from '../utils/store'
import { privateAPI } from '../api/private'
import { HasPermission } from '../components/HasPermission'
import { useModal } from '../context/ModalContext'
import ConfirmModal from '../components/ConfirmModal'

// отдельный компонент для удобной отрисовки с дешифровкой
const ViewRolesRaw = ({item, onEdit}) => {
    const { openModal } = useModal()

    const handleEdit = async () => {
        const result = await openModal(ConfirmModal, { title: item.name })
        if(!result) {
            return 
        }
        onEdit(item.id)
    }

    const handleDel = async () => {
        const result = await openModal(ConfirmModal, { title: item.name })
        if(!result) {
            return 
        }
    }

    return (
        <tr className="VaultRow">
            <td className="VaultRow__cell VaultRow__cell--title">{item.name}</td>
            <td className="VaultRow__cell VaultRow__cell--actions">
                <HasPermission permission={"role:update"}>
                    <button className="VaultRow__button VaultRow__button--primary" onClick={handleEdit}>
                        Изменить
                    </button>
                </HasPermission>
                <HasPermission permission={"role:delete"}>
                    <button className="VaultRow__button VaultRow__button--danger" onClick={() => handleDel(item)}>
                        Удалить
                    </button>
                </HasPermission>
            </td>
        </tr>
    )
}

function ViewRoles({onEdit}) {
    const [roles, setRoles] = useState([])

    const fetchRoles = async () => {
        try {
            const data = await privateAPI.GetRoles()
            setRoles(data)
        } catch {
            setRoles([])
        }
    }

    // при отрисовке вызывается автоматически
    useEffect(() => {
        fetchRoles()
    }, [])

    return (
        <div className="Vault">
            <h2 className="Vault__title">Роли</h2>
            
            <table className="Vault__table">
                <thead className="Vault__head">
                    <tr>
                        <th className="Vault__th">Роль</th>
                        <th className="Vault__th">Действие</th>
                    </tr>
                </thead>
                <tbody className="Vault__body">
                    {roles.map((item) => (
                        <ViewRolesRaw
                            key={item.ID} 
                            item={item} 
                            onEdit={onEdit}
                        />
                    ))}
                </tbody>
            </table>
            
            <button className="Vault__addBtn">+ Добавить роль</button>
        </div>
    )
}

export default ViewRoles