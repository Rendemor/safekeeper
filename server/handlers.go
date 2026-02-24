package main

import (
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"golang.org/x/crypto/bcrypt"
)

// функция регистрации. В Go сначала пишем название переменной, потом тип данных. После функции пишем тип данных, который возвращаем
func RegisterHandler(c echo.Context) error {

	// локальная структура для принятия данных. `json:"email"` и `json:"password"` это теги, которые помогают программе понимать
	// из каких полей класть информацию из файла в структуру. То есть в файле будет
	// { "email": "test@example.com", "password": "my_password" } и всё корректно разложится
	type RegisterRequest struct {
		Email               string `json:"email"`
		Password            string `json:"password"`
		MasterKeySalt       string `json:"master_key_salt"`
		PublicKey           string `json:"public_key"`
		EncryptedPrivateKey string `json:"encrypted_private_key"`
	}

	req := new(RegisterRequest)

	// сокращённая запись if в Go. То есть if "инициализация переменной"; условие {}. Но можно написать как обычно, разницы не будет
	// Bind(req) сопоставляет данные из полученного json файла с моей структурой, которая объявлена в req. Если сопоставить данные
	// не получается, то получаю ошибку
	// map[string]string{"error": "Неверные данные"} создаёт структуру json файла для возврата.
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Неверные данные"})
	}

	// хэширование зашифрованного пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Ошибка обработки пароля"})
	}

	newUser := User{
		Email:               req.Email,
		PasswordHash:        string(hashedPassword),
		MasterKeySalt:       req.MasterKeySalt,
		PublicKey:           req.PublicKey,
		EncryptedPrivateKey: req.EncryptedPrivateKey,
	}

	result := DB.Create(&newUser)
	if result.Error != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Пользователь уже существует или ошибка БД"})
	}

	// возвращаем успех, если всё ок
	return c.JSON(http.StatusCreated, map[string]string{"message": "Пользователь успешно создан!"})
}

// Секретный ключ для подписи токенов (храни его в секрете!)
var jwtSecret = []byte("secret_key_for_jwt")

func LoginHandler(c echo.Context) error {
	// структура для входа
	type LoginInput struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	input := new(LoginInput)

	if err := c.Bind(input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Неверные данные"})
	}

	// поиск пользователя по email
	var user User
	if err := DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Пользователь не найден"})
	}

	// хэшируем полученный пароль при входе и сравниваем хеш с тем, который лежит в базе
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "неверный пароль"})
	}

	// создаём jwt токен, чтобы автоматически входить в систему
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(time.Hour * 72).Unix(), // 3 дня (фактически он просто удаляется после обноваления страницы, но
		// пусть будет 3 дня. Базовый минимум)
	})

	t, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Ошибка генерации токена"})
	}

	// возвращаем токен и зашифрованные ключи
	return c.JSON(http.StatusOK, map[string]string{
		"message":               "Вход выполнен!",
		"token":                 t,
		"public_key":            user.PublicKey,
		"encrypted_private_key": user.EncryptedPrivateKey,
	})
}

func AddPasswordHandler(c echo.Context) error {
	// структура для пароля
	type PasswordInput struct {
		Title           string `json:"title"`
		Login           string `json:"login"`
		EncryptedData   string `json:"encrypted_data"`
		EncryptionNonce string `json:"encryption_nonce"`
		EncryptedDEK    string `json:"encrypted_dek"`
	}

	input := new(PasswordInput)
	if err := c.Bind(input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Неверный формат данных"})
	}

	// достаём ID пользователя из токена.
	// в JWT числа обычно парсятся как float64, поэтому приводим так:
	userToken := c.Get("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)

	userIDRaw := claims["user_id"]

	// сохраняем данные в структуру как в БД
	newSecret := Secret{
		Title:           input.Title,
		Login:           input.Login,
		EncryptedData:   input.EncryptedData,
		EncryptionNonce: input.EncryptionNonce,
		EncryptedDEK:    input.EncryptedDEK,
	}

	if str, ok := userIDRaw.(string); ok {
		parsedUserID, err := uuid.Parse(str)
		if err == nil {
			newSecret.UserID = parsedUserID
		}
	}

	if err := DB.Create(&newSecret).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Ошибка сохранения в БД"})
	}

	return c.JSON(http.StatusCreated, newSecret)
}

func GetSaltHandler(c echo.Context) error {
	// из получаемых данных получаем ключ "email"
	email := c.QueryParam("email")

	var user User
	// ищем в базе пользователя с таким email
	if err := DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Пользователь не найден"})
	}

	// возвращаем только соль, больше ничего не надо
	return c.JSON(http.StatusOK, map[string]string{"salt": user.MasterKeySalt})
}

func GetPasswordHandler(c echo.Context) error {
	// достаём ID пользователя из токена.
	// В JWT числа обычно парсятся как float64, поэтому приводим так:
	userToken := c.Get("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userIDRaw := claims["user_id"]

	// поиск всех паролей для пользователя с полученным userIDRaw
	var passwords []Secret // обязательно указали, что не одна строка, а несколько (несколько паролей)
	// важно заметить, что теперь используем Find, то есть ищем все записи, а не первую (First)
	if err := DB.Where("user_id = ?", userIDRaw).Find(&passwords).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Ошибка базы данных"})
	}

	// одаём результат поиска
	return c.JSON(http.StatusOK, passwords)
}
