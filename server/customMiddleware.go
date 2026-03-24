package main

import (
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

// вся эта дичь типо декоратор
func CheckPermissionMiddleware(requiredPermission string) echo.MiddlewareFunc {
	// запускается один раз при старте сервера. Почему так писать хрен знает, но это стандарт вроде как. Главное дальше
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		// запускается каждый раз при запроса
		return func(c echo.Context) error {
			// достаем пользователя из контекста (его туда кладет стандартный JWT Middleware)
			user := c.Get("user").(*jwt.Token)
			claims := user.Claims.(jwt.MapClaims)

			// извлекаем интерфейс прав и приводим его к слайсу
			permissions_interface, ok := claims["permissions"].([]interface{})
			if !ok {
				return c.JSON(http.StatusForbidden, APIError{Error: "права не найдены в токене"})
			}

			// проверяем, есть ли нужное право
			has_permission := false
			for _, p := range permissions_interface {
				if p.(string) == requiredPermission {
					has_permission = true
					break
				}
			}

			if !has_permission {
				return c.JSON(http.StatusForbidden, APIError{Error: "недостаточно прав"})
			}

			// если всё ок — идем дальше
			return next(c)
		}
	}
}

func CheckBlocked(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, _ := getUserIDuuid(c)

		var isBlocked bool
		err := DB.Model(&User{}).Select("blocked").Where("id = ?", userID).Scan(&isBlocked).Error

		if err != nil {
			return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка проверки статуса"})
		}

		if isBlocked {
			return c.JSON(http.StatusUnauthorized, APIError{Error: "Ваш аккаунт заблокирован"})
		}

		return next(c)
	}
}
