package main

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"fmt"
)

func getUserId(c echo.Context) string {
	val := c.Get("user")
	if val == nil {
		// если токена нет, то возвращаем пустую строку
		return ""
	}

	userToken, ok := val.(*jwt.Token)
	if !ok {
		return ""
	}
	claims := userToken.Claims.(jwt.MapClaims)

	userId, ok := claims["user_id"].(string)
	if !ok {
		return ""
	}

	return userId
}

// получаем ID в формате uuid. Возвращаем uuid и error
func getUserIDuuid(c echo.Context) (uuid.UUID, error) {
	userID := getUserId(c)
	// распарсили ID как uuid (так в БД хранится)
	parsedID, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, err
	}

	return parsedID, nil
}

func logAudit(c echo.Context, action ActionCode, manualUUID uuid.UUID) {

	if manualUUID == uuid.Nil {
		// получили id в uuid
		manualUUID, _ = getUserIDuuid(c)
	}

	// получаем ip пользователя
	ip := c.RealIP()
	// данные браузера пользователя
	ua := c.Request().UserAgent()

	// оборачиваем запись лога в БД в анонимную функцию и запускаем горутину
	go func(uID uuid.UUID, act string, userIP string, userAgent string) {
		newLog := AuditLog{
			UserID:    uID,
			Action:    act,
			IPAddress: userIP,
			UserAgent: userAgent,
		}

		// запрос в БД. Запущен в отедльной горутине. Пользователь не ждёт запись лога в БД
		if err := DB.Create(&newLog).Error; err != nil {
			fmt.Printf("Ошибка асинхронного аудита: %v\n", err)
		}
	}(manualUUID, string(action), ip, ua)
}

func getJWTaccess(userID uuid.UUID) *jwt.Token {
	// jwt токен для автоматического входа в систему. Токен действует 10 минут, хранит права, чтобы не обращаться к БД
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		// права. Пока что не реализованы
		// "permissions": permissions,
		"exp": time.Now().Add(time.Minute * 10).Unix(),
	})

	return accessToken
}

func getJWTrefresh(userID uuid.UUID) *jwt.Token {
	// jwt токен для автоматического получения нового access токена. Действует 7 дней
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
	})

	return refreshToken
}
