import React, { useEffect, useState } from 'react';
import '../styles/components/ReqPwdForm.less'; 

// отдельный компонент для удобной отрисовки с дешифровкой
const ReqRow = ({ item }) => {
    const [time, setTime] = useState('0')

    return (
        <tr>
            <td>{item.Title}</td>
            <td>
                <button className="vault-copy-btn">
                    Дать доступ
                </button>

                <button className="vault-copy-btn">
                    Отклонить
                </button>
            </td>
            <td>
                <input 
                    type="time"   
                    className="form-group-input"   
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required          
                />
            </td>
        </tr>
    );
};

function ReqPwdForm() {
    const [req, setReq] = useState([]);

    const fetchReq = async () => {
        // передаю jwt токен для определения пользователя
        const response = await fetch('http://localhost:8080/pwd-acs-req', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        // проверяем, что пришёл именно массив
        if (Array.isArray(data)) {
            setReq(data);
        } else {
            console.error("Сервер прислал не массив:", data);
            setReq([]);
        }
    };

    // при отрисовке вызывается автоматически
    useEffect(() => {
        fetchReq();
    }, []);

    return (
        <div className="vault">
            <h2 className="vault-title">Запросы паролей</h2>
            
            <table className="vault-table">
                <thead>
                    <tr>
                        <th>Сайт</th>
                        <th>Действие</th>
                        <th>Время доступа, ч</th>
                    </tr>
                </thead>
                <tbody>
                    {/* просто итератор. Вся отрисовка выше, тут только перебираем запросы на получение паролей */}
                    {req.map((item) => (
                        <ReqRow 
                            key={item.ID} 
                            item={item} 
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ReqPwdForm;