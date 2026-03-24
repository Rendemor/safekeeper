import React, { useState, useMemo, useEffect } from 'react'
import '../styles/components/RoleCreate.less'
import { privateAPI } from '../api/private'

const RoleCreator = ({ setPage, id }) => {
    const [permissions, setPermissions] = useState([]) // Доступные (те, что в выпадающих списках)
    const [selectedPermissions, setSelectedPermissions] = useState([]) // Выбранные (те, что в чипсах)
    const [roleName, setRoleName] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Получаем ВСЕ права системы (из твоего GetPermissions)
                const allPerms = await privateAPI.GetPermissions()
                
                // 2. Получаем данные РОЛИ (твой Req с полями id, name, permissions)
                const roleData = await privateAPI.GetRole(id)
                setRoleName(roleData.name)
                
                const currentRolePerms = roleData.permissions || []
                setSelectedPermissions(currentRolePerms)

                // 3. Синхронизируем: в доступных оставляем только то, чего нет в роли
                const available = allPerms.filter(ap => 
                    !currentRolePerms.some(rp => rp.code === ap.code)
                )
                setPermissions(available)
            } catch (err) {
                console.error("Ошибка загрузки данных:", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [id])

	const groupedPermissions = useMemo(() => {
		// Проверка: если permissions вдруг не массив или пуст, возвращаем пустой объект
		if (!Array.isArray(permissions)) return {}

		return permissions.reduce((acc, perm) => {
			// Защита: если perm или perm.code не существует, пропускаем
			if (!perm || !perm.code) return acc

			// Теперь includes и split точно не упадут
			const category = perm.code.includes(':') ? perm.code.split(':')[0] : perm.code
			
			if (!acc[category]) acc[category] = []
			acc[category].push(perm)
			return acc
		}, {})
	}, [permissions])

    const addPermission = (permCode) => {
        const permission = permissions.find(p => p.code === permCode)
        if (!permission) return
        
        setSelectedPermissions(prev => [...prev, permission])
        setPermissions(prev => prev.filter(p => p.code !== permCode))
    }

    const remove_permission = (permCode) => {
        const permission = selectedPermissions.find(p => p.code === permCode)
        if (!permission) return

        setPermissions(prev => [...prev, permission])
        setSelectedPermissions(prev => prev.filter(p => p.code !== permCode))
    }

    const handleUpdateRole = async () => {
        try {
            if (roleName.length < 2) {
                alert('Название роли должно быть больше 2 букв')
                return
            }

            const payload = {
                id: id,
                name: roleName,
                // Отправляем массив ID (int), как ждет твой PermissionDTO на бэке
                permissions: selectedPermissions.map(item => item.id)
            }
			console.log(payload)

            // await privateAPI.UpdateRole(payload)
            setPage() 
        } catch (err) {
            console.error("Ошибка обновления:", err)
        }
    }

    if (loading) return <div className="RoleForm">Загрузка...</div>

    return (
        <div className="RoleForm">
            <div className="RoleForm__card">
                <h2 className="RoleForm__title">Редактирование роли</h2>

                <div className="RoleForm__field">
                    <label className="RoleForm__label">НАЗВАНИЕ РОЛИ:</label>
                    <input 
                        type="text" 
                        className="RoleForm__input"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                    />
                </div>

                <div className="RoleForm__field">
                    <label className="RoleForm__label">ВЫБРАННЫЕ ПРАВА:</label>
                    <div className="RoleForm__chips">
                        {selectedPermissions.length === 0 && (
                            <span className="RoleForm__placeholder">Права не выбраны</span>
                        )}
                        {selectedPermissions.map(perm => (
                            <span 
                                key={perm.code} 
                                className="RoleForm__chip"
                                onClick={() => remove_permission(perm.code)}
                            >
                                {perm.code}
                                <span className="RoleForm__chipRemove">×</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="RoleForm__field">
                    <label className="RoleForm__label">ДОБАВИТЬ ПРАВА:</label>
                    <div className="RoleForm__selects">
                        {Object.keys(groupedPermissions).map(category => (
                            <div key={category} className="RoleForm__selectGroup">
                                <span className="RoleForm__category">{category.toUpperCase()}</span>
                                <select 
                                    className="RoleForm__select"
                                    value="" 
                                    onChange={(e) => addPermission(e.target.value)}
                                >
                                    <option value="" disabled>Добавить...</option>
                                    {groupedPermissions[category].map(perm => (
                                        <option key={perm.code} value={perm.code}>
                                            {perm.code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="RoleForm__actions">
                    <button 
                        className="RoleForm__button RoleForm__button--primary" 
                        onClick={handleUpdateRole}
                    >
                        Сохранить изменения
                    </button>
                    <button 
                        className="RoleForm__button RoleForm__button--secondary" 
                        onClick={() => setPage()}
                    >
                        Отменить
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RoleCreator