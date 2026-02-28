package main

import (
	"time"

	"github.com/google/uuid"
)

// User - таблица пользователей
type User struct {
	// id пользователя (используем UUID для защиты от перебора)
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// почта
	Email string `gorm:"unique;not null"`
	// хеш мастер-пароля (bcrypt) исключительно для входа в систему
	PasswordHash string `gorm:"not null"`
	// соль (штуда для генерации уникальных ключей) для PBKDF2, которая используется в браузере для генерации ключей шифрования
	MasterKeySalt string `gorm:"type:text;"`
	// публичный ключ пользователя (RSA) для асимметричного шифрования
	PublicKey string `gorm:"type:text;not null"`
	// приватный ключ пользователя (RSA), зашифрованный в браузере ключом KEK (на базе мастер-пароля)
	EncryptedPrivateKey string `gorm:"type:text;not null"`
	// время создания аккаунта
	CreatedAt time.Time
}

// таблица зашифрованных паролей (сейф)
type Secret struct {
	// id записи
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// владелец пароля
	UserID uuid.UUID `gorm:"type:uuid;not null"`
	// название сервиса
	Title string `gorm:"size:100;not null"`
	// логин (лучше сделать шифрование, но пока без него)
	Login string `gorm:"type:text"`
	// сам зашифрованный пароль (зашифрован ключом DEK)
	EncryptedData string `gorm:"type:text;not null"`
	// зашифрованный ключ DEK (зашифрован публичным ключом RSA)
	EncryptedDEK string `gorm:"type:text;not null"`
	// техническая строка для алгоритма шифрования AES-GCM
	EncryptionNonce string `gorm:"type:text;not null"`
	// Время последнего обновления
	UpdatedAt time.Time
}

// логирование действий
type AuditLog struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID uuid.UUID `gorm:"type:uuid"`
	// описание действия (изменение/запрос доступа/просмотр/копирование и т.д.)
	Action string `gorm:"not null"`
	// IP адрес устройства, с которого было совершено действие
	IPAddress string
	// информация о браузере/устройстве
	UserAgent string
	CreatedAt time.Time
}