import React, { createContext, useState, useContext } from 'react';

// создание пустой коробки для хранения данных. Будем хранить ключи
const CryptoContext = createContext(null);

export const CryptoProvider = ({ children }) => {
    // эти переменные создаются в RAM. После обноваления страницы всё будет удалено
    const [privateKey, setPrivateKey] = useState(null); // Тут будет лежать расшифрованный ПРИВАТНЫЙ ключ
    const [publicKey, setPublicKey] = useState(null);   // Тут ПУБЛИЧНЫЙ ключ
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Флаг: пустили нас внутрь или нет

    // очистка памяти. На всякий случай очищаем и ключи, хотя это должно быть автоматически
    const logout = () => {
        setPrivateKey(null);
        setPublicKey(null);
        setIsAuthenticated(false);
        // токен тоже надо чистить, так как он лежит на диске
        localStorage.removeItem('token'); 
    };

    // оборачиваем сайт в Provider и указываем к чему есть доступ у детей.
    return (
        <CryptoContext.Provider value={{ 
            privateKey, setPrivateKey, 
            publicKey, setPublicKey, 
            isAuthenticated, setIsAuthenticated,
            logout 
        }}>
            {children} 
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => useContext(CryptoContext);