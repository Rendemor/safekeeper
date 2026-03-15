import {useCryptoStore} from './store';

// рекурсивный вызов функции для обновления токена и повторного запроса, если получили 401 ошибку
export const interceptorsFetch = async (url, options = {}, retryCount = 0) => {
    let response = await fetch(url, options)

    // пробуем обновить токен только один раз
    if (response.status === 401 && retryCount < 1) { 
        // creditials означает подключить куки к запросу, чтобы сервер смог найти refresh токен
        const refreshRes = await fetch('http://localhost:8080/api/auth/refresh-jwt', { method: 'GET', credentials: 'include' })

        if (refreshRes.ok) {
            const data = await refreshRes.json()
            localStorage.setItem('token', data.token)

            // обновляем заголовок. Кладём новый токен в Authorization для повторного запроса
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${data.token}`
            }

            return interceptorsFetch(url, options, retryCount + 1)
        } else {
            // если обновить токен не удалось, принудительно разлогиниваем пользователя
            useCryptoStore.getState().logout()
            return response 
        }
    }

    return response
}