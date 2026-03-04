import React, { useState } from 'react';
import '../styles/components/PwdReq.less'; // импорт стилей для формы

function ReqPwd() {
    // объявление переменных состояния
    const [email, setEmail] = useState(''); // почта пользователя, у которого запрашивается пароль 
    const [site, setSite] = useState(''); // название ресурса от которого нужен пароль
    const [message, setMessage] = useState(''); 
    const [isError, setIsError] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault(); // запрет перезагрузки, чтобы страница не моргала

        try {
            
            // указываем куда отправить данные
            const response = await fetch('http://localhost:8080/pwd-req', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // отправляем токен, чтобы сервер знал email того, кто отправляет пароль 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    title: site, // название сайта
                    email: email, // логин от сайта 
                 }),
            })

            // проверка какой ответ пришёл от сервера
            if(response.ok) {
                setMessage('Запрос на получение пароля успешно отправлен')
                setIsError(false)
                setSite('')
                setEmail('')
            } else {
                setMessage('Неверные данные')
                setIsError(true)
            }
        } catch (error) {
            console.error('Ошибка сети или сервера:', error);
            setMessage('Не удалось подключиться к серверу.');
            setIsError(true);
        }
    };

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
    );
}

export default ReqPwd;