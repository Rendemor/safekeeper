package main

import (
	"time"

	"github.com/google/uuid"
)

// таблица пользователей
type User struct {
	// id пользователя
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// почта
	Email        string `gorm:"unique;not null"`
	// хеш пароля для входа в систему.
	PasswordHash string `gorm:"not null"`
	// публичный ключ для шифрования пароля, чтобы можно было безопасно делиться ими
	PublicKey           string `gorm:"type:text"`
	// зашифрованный мастер-пароль (приватный), чтобы можно было с другого устройства узнать свои пароли
	EncryptedPrivateKey string `gorm:"type:text"`
	// время создания
	CreatedAt time.Time
}

// данные (пароли)
type Secret struct {
	// id записи внутри текущей таблицы
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// id пользователя из таблицы с пользователями, чтобы понимать чей пароль
	UserID uuid.UUID `gorm:"type:uuid;not null"`
	// название пароля
	Title string `gorm:"size:100"`
	// зашифрованные данные (пароль). Они шифруются публичным ключом того, кто добавил пароль
	EncryptedData string `gorm:"type:text;not null"`
	UpdatedAt     time.Time
}

// логирование действий
type AuditLog struct {
	// id записи внутри текущей таблицы
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// id пользователя из таблицы с пользователями, чтобы понимать кто запросил/добавил/изменил/удалил данные (пароль)
	UserID uuid.UUID `gorm:"type:uuid"`
	// действие
	Action string
	// IP устройства, откуда произошли изменения
	IPAddress string
	// время
	CreatedAt time.Time
}
