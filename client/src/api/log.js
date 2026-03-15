import { interceptorsFetch } from "../utils/interceptorsFetch"

export const logAPI = {
    PwdShow: async () => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/log/pwd-show', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [getSalt]:", err)
            throw err
        }
    },

    PwdCopy: async () => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/log/pwd-copy', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }
        } catch (err) {
            console.error("API Error [getSalt]:", err)
            throw err
        }
    },
}