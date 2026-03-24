import React, { useState, useMemo, useEffect } from 'react'
import '../styles/components/RoleCreate.less'
import { privateAPI } from '../api/private'

const RoleCreator = ({setPage}) => {
	const [permissions, setPermissions] = useState([])

	useEffect(() => {
		getPermissions()
	}, [])

	const getPermissions = async () => {
		try {
			const data = await privateAPI.GetPermissions()
			setPermissions(data)
		} catch (err) {
			console.error(err)
		}
	}

  const [roleName, setRoleName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState([])

  // группировка по категориям (users, role, secrets)
  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      const category = perm.Code.split(':')[0]
      if (!acc[category]) acc[category] = []
      acc[category].push(perm)
      return acc
    }, {})
  }, [permissions])

  const addPermission = (permCode) => {
    const permission = permissions.find(p => p.Code === permCode)
    if (!permission) return
    setSelectedPermissions([...selectedPermissions, permission])
    setPermissions(permissions.filter(p => p.Code !== permCode))
  }

  const remove_permission = (permCode) => {
    const permission = selectedPermissions.find(p => p.Code === permCode)
    if (!permission) return
    setPermissions([...permissions, permission])
    setSelectedPermissions(selectedPermissions.filter(p => p.Code !== permCode))
  }

  const handleCreateRole = async () => {
		try {
			if(roleName.length < 2) {
				alert('Название роли должно быть больше 2 букв')
				return
			}

			const payload = {
				name: roleName,
				permissions: selectedPermissions.map(item => item.ID)
			}

			await privateAPI.CreateRole(payload)
		} catch (err) {
			console.error(err)
		}
  }

	return (
		<div className="RoleForm">
			<div className="RoleForm__card">
				<h2 className="RoleForm__title">Создание новой роли</h2>

				<div className="RoleForm__field">
					<label className="RoleForm__label">Название роли:</label>
					<input 
						type="text" 
						className="RoleForm__input"
						minLength="2"
						value={roleName}
						onChange={(e) => setRoleName(e.target.value)}
						placeholder="Например: Admin, Editor..."
					/>
				</div>

				<div className="RoleForm__field">
					<label className="RoleForm__label">Выбранные права:</label>
					<div className="RoleForm__chips">
						{selectedPermissions.length === 0 && (
							<span className="RoleForm__placeholder">Права не выбраны</span>
						)}
						{selectedPermissions.map(perm => (
							<span 
								key={perm.Code}
								className="RoleForm__chip"
								onClick={() => remove_permission(perm.Code)}
							>
								{perm.Name}
								<span className="RoleForm__chipRemove">×</span>
							</span>
						))}
					</div>
				</div>

				<div className="RoleForm__field">
					<label className="RoleForm__label">Добавить права:</label>
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
										<option key={perm.Code} value={perm.Code}>{perm.Name}</option>
									))}
								</select>
							</div>
						))}
					</div>
				</div>

				<div className="RoleForm__actions">
					<button 
						className="RoleForm__button RoleForm__button--primary"
						onClick={handleCreateRole}
					>
						Создать роль
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