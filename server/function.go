package main

import (
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"fmt"
)

func getUserId(c echo.Context) string {
	userToken := c.Get("user").(*jwt.Token)
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

	newLog := AuditLog{
		UserID:    manualUUID,
		Action:    string(action),
		IPAddress: ip,
		UserAgent: ua,
	}

	// добавляем лог. Возвращается ошибка (или nil, если ошибки не было)
	err := DB.Create(&newLog).Error

	if err != nil {
		fmt.Printf("Ошибка аудита: %v\n", err)
	}
}
