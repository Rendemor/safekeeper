import React, { useState } from 'react';
import '../styles/components/RegisterForm.less'; // импорт стилей для формы регистрации

function RegisterForm() {
    // объявление переменных состояния
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); // заперт перезагрузки, чтобы страница не моргала после отправки данных

        // временно выводим сообщение. Статус ошибки пишем false, если вдруг до этого был true
        setMessage('Регистрация...');
        setIsError(false);

        try {
            // указываем куда отправить данные, а также тип запрос, какие данные и само наполнение
            const response = await fetch('http://localhost:8080/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            // тут хранится ответ с сервера
            const data = await response.json();

            // если статут 2.., то это успех.
            if (response.ok) {
                setMessage(data.message);
                setIsError(false);
                // очистка полей
                setEmail(''); 
                setPassword('');
            // если статус 4.., 5..
            } else { 
                // вывод ошибки
                setMessage(data.error || 'Произошла ошибка при регистрации.');
                setIsError(true);
            }
        } catch (error) {
            console.error('Ошибка сети или сервера:', error);
            setMessage('Не удалось подключиться к серверу. Проверьте соединение.');
            setIsError(true);
        }
    };

    return (
        <div className="registration">
            <h2 className="registration-title">Создать аккаунт</h2>

            <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-group">
                    <label htmlFor="email" className="form-group-label">Email</label>
                    <input
                        type="email"
                        className="form-group-input"
                        value={email} // указываем, что значение в поле равно значению переменной
                        onChange={(e) => setEmail(e.target.value)} // в случае изменения значения, вызываем функцию изменения значения email
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="pass" className="form-group-label">Пароль</label>
                    <input
                        type="password"
                        className="form-group-input"
                        // аналогично случаю с email
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="registration-button">
                    Зарегистрироваться
                </button>
            </form>

            {/* если massage не пустой, то будет отрисовываться новый блок с сообщением с сервера */}
            {message && (
                <p className={`registration-message ${isError ? 'registration-message--error' : 'registration-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default RegisterForm;