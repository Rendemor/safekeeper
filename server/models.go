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
	// секретный ключ для генерации кодов для двухфакторной аутентификации
	OTPSecret string
	// по идее это временное поле. В идеале его убрать, поскольку 2FA для менеджера паролей это базовый минимум, а не выбор пользователя
	OTPEnabled bool
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

// таблица с запросами для получения пароля
type PasswordAccessRequest struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// два ID. От кого запрос и кому
	UserIDFrom uuid.UUID `gorm:"type:uuid"`
	UserIDTo   uuid.UUID `gorm:"type:uuid"`
	// название сервиса от коготорого запрашивается пароль
	Title string `gorm:"size:100;not null"`
	// логин от сервиса
	Login string `gorm:"type:text"`
	// публичный ключ того, кто запросил пароль для шифрования
	PublicKey string `gorm:"type:text;not null"`
	CreatedAt time.Time
}

type SharedSecret struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// Кто поделился (владелец)
	OwnerID uuid.UUID `gorm:"type:uuid;not null"`

	// Ссылка на оригинальный секрет и кому дали доступ. Важно, это зависимые поля. Такая связка строго уникальна
	SecretID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_secret_recipient"`
	RecipientID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_secret_recipient"`

	// КРИТИЧНО: DEK, перешифрованный публичным ключом ПОЛУЧАТЕЛЯ
	// Оригинальный EncryptedDEK из таблицы Secret получатель расшифровать не сможет!
	SharedEncryptedDEK string `gorm:"type:text;not null"`

	// Время истечения доступа (nil, если бессрочно)
	ExpiresAt *time.Time
	CreatedAt time.Time
}

// роли
type Role struct {
	ID   int    `gorm:"primaryKey"`
	Name string `gorm:"size:50;not null;unique"`
}

// права
type Permission struct {
	ID int `gorm:"primaryKey"`
	// ну типо полное название
	Name string `gorm:"size:100;not null"`
	// сокращённое название для удобства
	Code string `gorm:"size:50;not null;uniqueIndex"`
}

// права роли
type RolePermission struct {
	// составной первичный ключ из ID роли и ID права. Это гарантирует, что одна роль не может иметь одно и то же право несколько раз
	// Это работает лучше, чем UniqueIndex, потому что сама БД оптимизирует поиск по составному первичному ключу, а UniqueIndex
	// только гарантирует уникальность, но не оптимизирует поиск
	RoleID       int `gorm:"primaryKey"`
	PermissionID int `gorm:"primaryKey"`
	// Указываем связи для GORM
	Role       Role       `gorm:"constraint:OnDelete:CASCADE;"`
	Permission Permission `gorm:"constraint:OnDelete:CASCADE;"`
}
