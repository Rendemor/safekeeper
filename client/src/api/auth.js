import { interceptorsFetch } from "../utils/interceptorsFetch"

export const authAPI = {
    getSalt: async (email) => {
        try {
            // получаем соль с сервера. Запрос идёт на get-salt. Дальше идёт ?, который означает "дальше идут дополнительные параметры"
            // в качестве дополнительных параметров я указал почту, чтобы сервер смог найти пользователя в БД и отправить соль
            const res = await interceptorsFetch(`http://localhost:8080/api/auth/get-salt?email=${email}`, {
                method: 'GET',
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

    // в логин передаём наполнение
    login: async (payload = {}) => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            return await res.json()
        } catch (err) {
            console.error("API Error [login]:", err)
            throw err
        }
    },

    Ver2FA: async (payload = {}) => {
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

    RefreshJWT: async () => {
        try {
            const res = await interceptorsFetch('http://localhost:8080/api/auth/refresh-jwt', {
                method: "GET",
                // указываем, что хотим отправить куку
                credentials: 'include'
            })

            if(!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Ошибка сервера')
            }

            const token = await res.json()

            localStorage.setItem('token', token)
        } catch (err) {
            console.error("API Error [RefreshJWT]:", err)
            throw err
        }
    }
}

