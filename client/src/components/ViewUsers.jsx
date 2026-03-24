import React, { useState, useEffect } from 'react'
import '../styles/components/ViewUsers.less'
import { privateAPI } from '../api/private'
import { useModal } from '../context/ModalContext'
import ConfirmModal from '../components/ConfirmModal'

const AdminPanel = () => {
    const [users, setUsers] = useState([])
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("all")
    const [roles, setRoles] = useState([])
    const { openModal } = useModal()

    useEffect(() => {
        loadUsers()
        fetchRoles()
    }, [])

    const fetchRoles = async () => {
        const data = await privateAPI.GetAllRoles()
        console.log(data)
        setRoles(data)
    }

    const loadUsers = async () => {
        try {
            const data = await privateAPI.GetUsers()
            setUsers(data)
        } catch (err) {
            console.error(err)
        }
    }

    const setBlocked = async (user) => {
        try {
            if (user.isBlocked) {
                await privateAPI.UnblockedUser(user.id)
            } else {
                await privateAPI.BlockedUser(user.id)
            }

            user.isBlocked = !user.isBlocked 
            loadUsers()
        } catch (err) {
            console.error(err)
        }
    }

    const deleteUser = async (user) => {
        const result = await openModal(ConfirmModal, { title: user.email })

        if(!result) {
            return 
        }

        try {
            await privateAPI.DeleteUser(user.id)
            loadUsers()
        } catch (err) {
            console.error(err)
        }
    }

    // фильтрация: сначала по выбранной роли, потом по поиску (если он нужен)
    const filteredUsers = users.filter(user => {
        if (selectedRoleFilter === "all") return true
        return user.role?.Name === selectedRoleFilter
    })

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <h1 className="admin-page__title">Пользователи системы</h1>
                
                <div className="admin-page__filters">
                    <label className="admin-page__label">Фильтр по роли:</label>
                    <select 
                        className="admin-page__select"
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    >
                        <option value="all">Все роли</option>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </header>

            <table className="users-table">
                <thead className="users-table__head">
                    <tr className="users-table__row">
                        <th className="users-table__th">ФИО</th>
                        <th className="users-table__th">Email</th>
                        <th className="users-table__th">Роль</th>
                        <th className="users-table__th">Управление</th>
                    </tr>
                </thead>
                <tbody className="users-table__body">
                    {filteredUsers.map(user => (
                        <tr key={user.id} className={`users-table__row ${user.isBlocked ? 'users-table__row--blocked' : ''}`}>
                            <td className="users-table__td">
                                {`${user.lastName} ${user.firstName} ${user.patronymic}`}
                            </td>
                            <td className="users-table__td">{user.email}</td>
                            <td className="users-table__td">
                                <span className="users-table__role-label">{user.role?.Name || 'Роль'}</span>
                            </td>
                            <td className="users-table__td users-table__td--actions">
                                <button 
                                    className={`admin-btn ${user.isBlocked ? 'admin-btn--unblock' : 'admin-btn--block'}`}
                                    onClick={() => setBlocked(user)}
                                >
                                    {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                </button>
                                <button 
                                    className="admin-btn admin-btn--delete"
                                    onClick={() => deleteUser(user)}
                                >
                                    Удалить
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default AdminPanel