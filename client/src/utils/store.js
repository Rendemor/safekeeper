import { create } from 'zustand';

// хранилище данных ВНЕ дерева компонентнов. Вызывается где угодно, не только внутри React-компонентов
export const useCryptoStore = create((set) => ({
    // состояния
    privateKey: null,
    publicKey: null,
    isAuthenticated: false,

    // действия. Аналогия с useState
    setPrivateKey: (key) => set({ privateKey: key }),
    setPublicKey: (key) => set({ publicKey: key }),
    setIsAuthenticated: (value) => set({ isAuthenticated: value }),

    // выход из аккаунта. Чистим и RAM, и localStorage
    logout: () => {
        localStorage.removeItem('token')
        set({ 
            privateKey: null, 
            publicKey: null, 
            isAuthenticated: false 
        }); 
    },
}));