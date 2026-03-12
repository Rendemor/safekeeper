import React, { createContext, useState, useContext } from 'react'

const ModalContext = createContext()

export const ModalProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        component: null, // передаём модальное окно
        props: {}        // пропсы модалки
    })

    // Внутри ModalProvider
    const openModal = (component, props = {}) => {
        // оборачиваем всё в пропс, чтобы выполнение модалки могло останоить выполнение остального кода, если вызвать через await 
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                component,
                props: {
                    ...props,
                    // закидываю два своих пропса, оба закрывают модалку. Первый отдаёт какие-то данные, например, подтверждение чего-либо
                    // второй мой пропс просто отдаёт ничего
                    onConfirm: (data) => {
                        closeModal()
                        resolve(data)
                    },
                    onCancel: () => {
                        closeModal()
                        resolve(null)
                    }
                }
            })
        })
    }

    // закрытие любого окна
    const closeModal = () => {
        setModalConfig({ isOpen: false, component: null, props: {} })
    }

    return (
        // создаю сам контекст, чтобы любой дочерний элемент мог воспользоваться функциями в value
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            {/* глобальный рендер модалки */}
            {modalConfig.isOpen && modalConfig.component && (
                <div className="modal-overlay">
                    {/* вызываю компонент для отрисовки. Принудительно передаю пропс для закрытия модалки */}
                    <modalConfig.component 
                        {...modalConfig.props} 
                        close={closeModal} 
                    />
                </div>
            )}
        </ModalContext.Provider>
    )
}

// хук для вызова
export const useModal = () => useContext(ModalContext)