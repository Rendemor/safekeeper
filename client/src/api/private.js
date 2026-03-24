import { interceptorsFetch } from "../utils/interceptorsFetch"

export const privateAPI = {
    Register: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [Register]:", err)
            throw err
        }
    },

    AddPwd: async (payload) => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/private/add-pwd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            return await res.json()
        } catch (err) {
            console.error("API Error [Ver2FA]:", err)
            throw err
        }
    },

    GetUserPwd: async () => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/private/get-user-pwd', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            const data = await res.json()

            if(!Array.isArray(data)) {
                throw new Error('Сервер прислал не массив паролей')
            }

            return data
        } catch (err) {
            console.error("API Error [GetUserPwd]:", err)
            throw err
        }
    },

    DelSharedPwd: async (payload) => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/private/del-shared-pwd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [DelSharedPwd]:", err)
            throw err
        }
    },

    DelOwnerPwd: async (payload) => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/private/del-owner-pwd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [DelOwnerPwd]:", err)
            throw err
        }
    },

    getSalt: async () => {
        try {
            // получаем соль с сервера. Запрос идёт на get-salt. Дальше идёт ?, который означает "дальше идут дополнительные параметры"
            // в качестве дополнительных параметров я указал почту, чтобы сервер смог найти пользователя в БД и отправить соль
            const res = await interceptorsFetch(`http://localhost:8080/api/private/get-salt`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })

            // если ошибка, то выводим сообщение об ошибке
            if (!res.ok) {
                const errorData = await res.json()
                // пробразываем ошибку в catch
                throw new Error(errorData.error || 'Ошибка сервера')
            }
            const data = await res.json()
            const { salt: saltBase64 } = data
            
            // перевод соли из base64 обратно в байты
            const salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)))

            return salt
        } catch (err) {
            // логируем ошибку для себя
            console.error("API Error [getSalt]:", err)
            // кидаем ошибку дальше, чтобы уже сам компонент видел её
            throw err
        }
    },

    VerifyPwd: async (hash) => {
        try {
            const res = await interceptorsFetch(`http://localhost:8080/api/private/verify-pwd?hash=${encodeURIComponent(hash)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [VerPwd]:", err)
            throw err
        }
    },

    RecPublicKeys: async (payload = {}) => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/private/get-rec-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // отправляем токен, чтобы сервер знал email того, кто отправляет пароль 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            return await res.json()
        } catch (err) {
            console.error("API Error [RecPublicKeys]:", err)
            throw err
        }
    },

    GetDEK: async (title, login) => {
        try {
            const res = await interceptorsFetch(            
                `http://localhost:8080/api/private/get-dek?title=${encodeURIComponent(title)}&login=${encodeURIComponent(login)}`, {
                method:'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            return await res.json()
        } catch (err) {
            console.error("API Error [GetDEK]:", err)
            throw err
        }
    },

    EditPwd: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(            
                'http://localhost:8080/api/private/pwd-edit', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    // отправляем токен, чтобы сервер знал email того, кто отправляет пароль 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [EditPwd]:", err)
            throw err
        }
    },

    SharePassword: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(            
                "http://localhost:8080/api/private/pwd-acs-appr", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [PwdAcsApp]:", err)
            throw err
        }
    },

    GetPublicKey: async (email) => {
        try {
            const res = await interceptorsFetch(            
                `http://localhost:8080/api/private/get-public-key?email=${encodeURIComponent(email)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            return await res.json()
        } catch (err) {
            console.error("API Error [GetPublicKey]:", err)
            throw err
        }
    },

    PwdReq: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(            
                'http://localhost:8080/api/private/pwd-req', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [PwdReq]:", err)
            throw err
        }
    },

    PwdAcsApp: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(            
                "http://localhost:8080/api/private/pwd-acs-appr", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [PwdAcsApp]:", err)
            throw err
        }
    },

    PwdAcsRej: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(            
                "http://localhost:8080/api/private/pwd-acs-rej", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [PwdAcsRej]:", err)
            throw err
        }
    },

    PwdAcsReq: async () => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/pwd-acs-req', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            const data = await res.json()
            if (!Array.isArray(data)) {
                throw new Error('Сервер прислал не массив')
            }

            return data
        } catch (err) {
            console.error("API Error [PwdAcsReq]:", err)
            throw err
        }
    },

    Setup2FA: async (payload = {}) => {
        const token = localStorage.getItem('token')

        try {
            const res = await interceptorsFetch('http://localhost:8080/api/private/ver-2FA-code', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify (payload)
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [Ver2FA]:", err)
            throw err
        }
    },

    GetQR: async () => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/get-QR-2FA', {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            return await res.json()
        } catch (err) {
            console.error("API Error [GetQR]:", err)
            throw err
        }
    },

    GetAllRoles: async () => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/get-all-roles', {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            
            const data = await res.json()
            if (!Array.isArray(data)) {
                throw new Error('Сервер прислал не массив')
            }


            return data
        } catch (err) {
            console.error("API Error [GetAllRoles]:", err)
            throw err
        }
    },

    GetUsers: async () => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/get-users', {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
            
            const data = await res.json()
            if (!Array.isArray(data)) {
                throw new Error('Сервер прислал не массив')
            }

            return data
        } catch (err) {
            console.error("API Error [GetUsers]:", err)
            throw err
        }
    },

    GetPermissions: async () => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/get-permissions', {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
            
            const data = await res.json()
            if (!Array.isArray(data)) {
                throw new Error('Сервер прислал не массив')
            }

            return data
        } catch (err) {
            console.error("API Error [GetPermissions]:", err)
            throw err
        }
    },

    CreateRole: async (payload = {}) => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/create-role', {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [CreatRole]:", err)
            throw err
        }
    },

    BlockedUser: async (uuid = '') => {
        try {
            const res = await interceptorsFetch(
                `http://localhost:8080/api/private/user-blocked?uuid=${uuid}`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [BlockedUser]:", err)
            throw err
        }
    },

    UnblockedUser: async (uuid = '') => {
        try {
            const res = await interceptorsFetch(
                `http://localhost:8080/api/private/user-unblocked?uuid=${uuid}`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [UnblockedUser]:", err)
            throw err
        }
    },

    DeleteUser: async (uuid = '') => {
        try {
            const res = await interceptorsFetch(
                `http://localhost:8080/api/private/user-del?uuid=${uuid}`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [DeleteUser]:", err)
            throw err
        }
    },

    GetRoles: async () => {
        try {
            const res = await interceptorsFetch(
                'http://localhost:8080/api/private/get-roles', {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
            
            const data = await res.json()
            if (!Array.isArray(data)) {
                throw new Error('Сервер прислал не массив')
            }

            return data
        } catch (err) {
            console.error("API Error [GetRoles]:", err)
            throw err
        }
    },

    GetRole: async (id) => {
        try {
            const res = await interceptorsFetch(
                `http://localhost:8080/api/private/get-role?id=${id}`, {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
            
            return await res.json()
        } catch (err) {
            console.error("API Error [GetRole]:", err)
            throw err
        }
    },
}

