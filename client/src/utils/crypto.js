// генерация соли
export const generateSalt = () => {
    return window.crypto.getRandomValues(new Uint8Array(16));
};

// превращение мастер-пароля в KEK
export const deriveMasterKey = async (password, salt) => {
    const encoder = new TextEncoder();
    // Импортируем "сырой" пароль как материал для ключа
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    // эта функция растягивает пароль до 256 бит через 100000 итераций
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        true, // разрешаем экспорт, чтобы использовать для шифрования
        ["encrypt", "decrypt"]
    );
};

// генерация RSA: пара ключей - публичный и приватный
export const generateRSAKeyPair = async () => {
    return window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
};

// шифрование Private Key с помощью KEK (AES-GCM)
export const encryptPrivateKey = async (privateKey, kek) => {
    // экспорт приватного ключа в сырой формат PKCS#8
    const exportedRaw = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    
    // генерация уникального nonce (iv) для шифрования
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        kek,
        exportedRaw
    );

    // собираем IV + зашифрованные данные в один массив
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // кодируем в Base64 для отправки в JSON на сервер Go
    return btoa(String.fromCharCode(...combined));
};

// функция для превращения public key в строку base64
export const exportKey = async (key) => {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

// создаем хеш для отправки на сервер (вместо пароля)
export const deriveLoginHash = async (password, salt) => {
    const masterKey = await deriveMasterKey(password, salt); // создаем мастер-ключ
    
    // экспортируем мастер-ключ в сырые байты
    const exportedKey = await window.crypto.subtle.exportKey("raw", masterKey);
    
    // хешируем эти байты еще раз через SHA-256
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", exportedKey);
    
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
};

// декодирование приватного ключа
export const decryptPrivateKey = async (encryptedBase64, kek) => {
    if (!encryptedBase64) {
        throw new Error("Зашифрованный ключ пуст или не получен с сервера");
    }

    // убираем лишние пробелы или символы переноса строки, которые могли прилететь
    const cleanBase64 = encryptedBase64.trim();

    try {
        // декодируем из Base64 в байты
        const combined = new Uint8Array(atob(cleanBase64).split("").map(c => c.charCodeAt(0)));
        
        // вырезаем IV (первые 12 байт) и сами данные
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        
        // расшифровываем через AES-GCM
        const decryptedRaw = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            kek,
            data
        );
        
        // импортируем обратно как объект ключа RSA
        return window.crypto.subtle.importKey(
            "pkcs8",
            decryptedRaw,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
        );
    } catch (e) {
        console.error("Ошибка внутри decryptPrivateKey:", e);
        throw new Error("Не удалось расшифровать ключ. Возможно, мастер-пароль неверный.");
    }
};

// универсальная функция для перевода байтов в строку
const bufferToBase64 = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// функция для шифрования паролей (уже тех, которые сохраняем)
export const encryptData = async (plainText, publicKey) => {
    const encoder = new TextEncoder();
    let keyForEncryption = publicKey;

    // если ключ пришел как строка (Base64), его надо превратить в объект CryptoKey
    // иначе браузер выдаст ошибку, что параметр 2 — это не CryptoKey
    if (typeof publicKey === 'string') {
        const binaryKey = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));
        keyForEncryption = await window.crypto.subtle.importKey(
            "spki", 
            binaryKey.buffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
        );
    }
    
    // генерация dek (ключ для шифрования данных)
    const dek = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // шифрование данных этим ключом
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        dek,
        encoder.encode(plainText)
    );

    // шифрование DEK публичным ключом
    const exportedDek = await window.crypto.subtle.exportKey("raw", dek);
    const encryptedDek = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        keyForEncryption,
        exportedDek
    );

    // возврат данных в форме base64 для отправки на Go-сервер
    return {
        encrypted_content: bufferToBase64(encryptedContent),
        encrypted_dek: bufferToBase64(encryptedDek),
        iv: bufferToBase64(iv)
    };
};