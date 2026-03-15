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
        <div className="add">
            <h2 className="add-title">Добавить запрос пароля</h2>

            <form onSubmit={handleSubmit} className="add-form">
                <div className="form-group">
                    <label className="form-group-label">Название сайта</label>
                    <input
                        type="text"
                        className="form-group-input"
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                        required
                        placeholder="например, VK или Google"
                    />
                </div>

                <div className="form-group">
                    <label className="form-group-label">Логин</label>
                    <input
                        type="text"
                        className="form-group-input"
                        value={login} 
                        onChange={(e) => setLogin(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-group-label">Email владельца пароля</label>
                    <input
                        type="text"
                        className="form-group-input"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="login-button">
                    Отправть запрос
                </button>
            </form>

            {message && (
                <p className={`login-message ${isError ? 'login-message--error' : 'login-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}

export default ReqPwd