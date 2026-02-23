import React from 'react';
import '../styles/components/PasswordManager.less'; // Сейчас создадим этот файл

function PasswordManager() {
    // Временные данные (имитация того, что придет с сервера)
    const passwords = [
        { id: 1, site: 'google.com', login: 'myemail@gmail.com', pass: 'qwerty123' },
        { id: 2, site: 'github.com', login: 'rendemor', pass: 'secret_key' },
        { id: 3, site: 'vk.com', login: '79991234567', pass: 'password111' },
    ];

    return (
        <div className="vault">
            <h2 className="vault-title">Мои пароли</h2>
            
            <table className="vault-table">
                <thead>
                    <tr>
                        <th>Сайт</th>
                        <th>Логин</th>
                        <th>Пароль</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody>
                    {passwords.map((item) => (
                        <tr key={item.id}>
                            <td>{item.site}</td>
                            <td>{item.login}</td>
                            <td>
                                <input 
                                    type="password" 
                                    value={item.pass} 
                                    readOnly 
                                    className="vault-input-readonly"
                                />
                            </td>
                            <td>
                                <button className="vault-copy-btn">Копировать</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <button className="vault-add-btn">+ Добавить пароль</button>
        </div>
    );
}

export default PasswordManager;