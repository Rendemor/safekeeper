import React, { useState } from 'react'
import '../styles/components/Verificate2FA.less'
import { authAPI } from '../api/auth'

function Verificate2FA ( {setPage, setIs2FAVerified} ) {
    const [code, setCode] = useState('')
    const [isError, setIsError] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsError(false)

        try {
            await authAPI.Ver2FA({code})
            setMessage("Подключение 2FA прошло успешно")
            setIs2FAVerified(true)
            setPage('vault')}
        catch (err) {
            setMessage(err.message || 'Произошла ошибка')
            setIsError(true)
        }
    }

    return (
        <div className="RegForm">
            <div className="RegForm__card">
                <h2 className="RegForm__title">Проверка кода</h2>

                <form onSubmit={handleSubmit} className="RegForm__form">
                    <div className="RegForm__field">
                        <label htmlFor="code" className="RegForm__label">Введите 6-значный код</label>
                        <input
                            type="text"
                            id="code"
                            className="RegForm__input"
                            placeholder="000000"
                            maxLength="6"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            style={{
                                fontSize: '24px',
                                textAlign: 'center',
                                letterSpacing: '4px',
                                fontWeight: 'bold'
                            }}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="RegForm__button"
                        disabled={code.length !== 6}
                    >
                        Подтвердить
                    </button>
                </form>

                {message && (
                    <p className={`RegForm__message ${isError ? 'RegForm__message--error' : 'RegForm__message--success'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

export default Verificate2FA