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
        <div className="setup">
            <h2 className="setup-title">Проверка кода</h2>

            <form className="setup-form" onSubmit={handleSubmit}>
                <div className="form-group">
                <label className="form-group-label">Введите 6-значный код</label>
                <input
                    type="text"
                    className="form-group-input"
                    placeholder="000000"
                    maxLength="6"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
                </div>

                <button type="submit" className="setup-button" disabled={code.length !== 6}>
                    Подтвердить
                </button>
            </form>

            {message && (
                <p className={`setup-message ${isError ? 'setup-message--error' : 'setup-message--success'}`}>
                {message}
            </p>
            )}
        </div>
    )
}

export default Verificate2FA