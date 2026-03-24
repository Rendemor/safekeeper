import React, { useState } from 'react'
import '../styles/components/PwdReq.less' // импорт стилей для формы
import { privateAPI } from '../api/private'

function ReqPwd() {
    // объявление переменных состояния
    const [email, setEmail] = useState('') // почта пользователя, у которого запрашивается пароль 
    const [site, setSite] = useState('') // название ресурса от которого нужен пароль
    const [login, setLogin] = useState('')
    const [message, setMessage] = useState('') 
    const [isError, setIsError] = useState(false)
    
    const handleSubmit = async (e) => {
        e.preventDefault() // запрет перезагрузки, чтобы страница не моргала

        try {
            await privateAPI.PwdReq({ 
                title: site, // название сайта
                login: login,
                email: email, // логин от сайта 
             })

            setMessage('Запрос на получение пароля успешно отправлен')
            setIsError(false)
            setSite('')
            setEmail('')
        } catch (error) {
            setMessage(error?.message || 'Неверные данные')
            setIsError(true)
        }
    }

    return (
        <div className="RegForm">
            <div className="RegForm__card">
                <h2 className="RegForm__title">Добавить запрос пароля</h2>

                <form onSubmit={handleSubmit} className="RegForm__form">
                    <div className="RegForm__field">
                        <label htmlFor="site" className="RegForm__label">Название сайта</label>
                        <input
                            type="text"
                            id="site"
                            className="RegForm__input"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            required
                            placeholder="например, VK или Google"
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="login" className="RegForm__label">Логин</label>
                        <input
                            type="text"
                            id="login"
                            className="RegForm__input"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            required
                        />
                    </div>

                    <div className="RegForm__field">
                        <label htmlFor="email" className="RegForm__label">Email владельца пароля</label>
                        <input
                            type="text"
                            id="email"
                            className="RegForm__input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="RegForm__button">
                        Отправить запрос
                    </button>
                </form>

                {message && (
                    <p className={`RegForm__message ${isError ? 'RegForm__message--error' : 'RegForm__message--success'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

export default ReqPwd