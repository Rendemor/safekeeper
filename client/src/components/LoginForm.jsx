import React, { useState } from 'react';
import '../styles/components/LoginForm.less'; // импорт стилей для формы регистрации
import { 
    deriveMasterKey, 
    deriveLoginHash,
    decryptPrivateKey
} from '../utils/crypto'; // импорт функций для шифрования паролей
import { useCrypto } from '../context/CryptoContext'; 

// указываем функцию, кооторую можно вызывать внутри LoginForm, при этом сама функция внешняя 
function LoginForm({onLoginSuccess}) {
    // объявление переменных состояния
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    // получаем перменные состояния из useCrypto, где хранятся ключи
    const { setPrivateKey, setPublicKey, setIsAuthenticated } = useCrypto();

    const handleSubmit = async (e) => {
        e.preventDefault(); // заперт перезагрузки, чтобы страница не моргала после отправки данных

        // временно выводим сообщение. Статус ошибки пишем false, если вдруг до этого был true
        setMessage('Регистрация...');
        setIsError(false);

        try {
            // получаем соль с сервера. Запрос идёт на get-salt. Дальше идёт ?, который означает "дальше идут дополнительные параметры"
            // в качестве дополнительных параметров я указал почту, чтобы сервер смог найти пользователя в БД и отправить соль
            const saltRes = await fetch(`http://localhost:8080/get-salt?email=${email}`);
            const { salt: saltBase64 } = await saltRes.json();
            
            // перевод соли из base64 обратно в байты
            const salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)));

            // на основе пароля генерируем LoginHash и KEK. Ну KEK не нужен, но просто для проверки можно посчитать и посмотреть 
            // что получилось
            const loginHash = await deriveLoginHash(password, salt);
            const kek = await deriveMasterKey(password, salt);

            // отправка loginHash на проверку
            const loginRes = await fetch('http://localhost:8080/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: loginHash })
            });

            const data = await loginRes.json();

            // если статут 2.., то это успех.
            if (loginRes.ok) {
                // сохранение токена в браузере (localStorage)
                setMessage("Вы вошли успешно!");
                setIsError(false);

                console.log("Данные с сервера:", data); // СМОТРИ СЮДА В КОНСОЛИ!

                // Внутри handleLogin после успешного ответа от сервера:
                const { token, encrypted_private_key, public_key } = data;

                // зная kek, расшифровываем приватный ключ, который получили от сервера
                const privateKey = await decryptPrivateKey(encrypted_private_key, kek);

                // сохраняем ключи в контексте (в памяти)
                setPrivateKey(privateKey);
                setPublicKey(public_key);
                localStorage.setItem('token', token);
                setIsAuthenticated(true);
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
        <div className="login">
            <h2 className="login-title">Войти в аккаунт</h2>

            <form onSubmit={handleSubmit} className="login-form">
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

                <button type="submit" className="login-button">
                    Войти
                </button>
            </form>

            {/* если massage не пустой, то будет отрисовываться новый блок с сообщением с сервера */}
            {message && (
                <p className={`login-message ${isError ? 'login-message--error' : 'login-message--success'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default LoginForm;