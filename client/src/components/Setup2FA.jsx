import React, { useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import '../styles/components/Setup2FA.less'
import { privateAPI } from '../api/private'

function Setup2FA ( {setPage, setOTPEnable} ) {
    const [code, setCode] = useState('')
    const [otpUrl, setOtpUrl] = useState('')
    const [isError, setIsError] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsError(false)

        try {
            await privateAPI.Setup2FA({code})
            setIsError(false)
            setMessage("Подключение 2FA прошло успешно")
            setOTPEnable(true)
            setPage('vault')
        } catch (err) {
            setIsError(true)
            setMessage(err?.message || "Ошибка подключения 2FA")
        }
    }

    const GetQR = async () => {
        try {
            const data = await privateAPI.GetQR()
            setOtpUrl(data.qr_url)
        } catch (err) {
            setMessage(err?.message || "Не удалось получить QR код")
        }
    }

    // при отрисовке вызывается автоматически
    useEffect(() => {
        GetQR();
    }, []);

    return (
        <div className="setup">
            <h2 className="setup-title">Защита аккаунта</h2>
            <p className="setup-subtitle">Сканируйте QR-код для активации 2FA</p>

            <div className="setup-qr">
                {otpUrl ? (
                    <QRCodeCanvas value={otpUrl} size={180} level="H" includeMargin={true} />
                    ) : (
                    <div className="setup-qr-placeholder">Генерация...</div>
                )}
            </div>

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

export default Setup2FA