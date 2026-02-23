import React, { useState } from 'react';
import '../styles/components/RegisterForm.less'; // импорт стилей для формы регистрации
import { 
    generateSalt, 
    deriveMasterKey, 
    generateRSAKeyPair, 
    exportKey, 
    encryptPrivateKey,
    deriveLoginHash
} from '../utils/crypto'; // импорт функций для шифрования паролей

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
            // генерация соли и RSA (публичный + приватный ключи)
            const salt = generateSalt();
            const RSAKeys = await generateRSAKeyPair();

            // генерация KEK (key encryption for key - ключ для шифрования ключа) на основе мастер-пароля (просто ключ от учётной записи)
            const kek = await deriveMasterKey(password, salt);

            // хеширование пароля, чтобы на сервер сразу приходил только хеш пароля
            const loginHash = await deriveLoginHash(password, salt); 

            // шифрование приватного ключа с помощью kek
            const encryptedPrivKey = await encryptPrivateKey(RSAKeys.privateKey, kek);

            // экспортирование ключа в base64
            const exportedPubKey = await exportKey(RSAKeys.publicKey);

            // экспортирование соли в base64 для хранения
            const saltString = btoa(String.fromCharCode(...salt));

            // указываем куда отправить данные, а также тип запрос, какие данные и само наполнение
            const response = await fetch('http://localhost:8080/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: email, 
                    password: loginHash, // Пароль для bcrypt на сервере
                    master_key_salt: saltString,
                    public_key: exportedPubKey,
                    encrypted_private_key: encryptedPrivKey
                    }),
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