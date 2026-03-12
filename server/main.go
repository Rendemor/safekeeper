package main

import (
	// echo — удобный фреймворк для работы с сервером, где уже готовы функции для маршрутизации, прослушивания и ответа
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// инициализация базы данных. Функция внутри файла database.go
	InitDB()

	// инициализация сервера
	e := echo.New()

	// разрешаем запросы с любых адресов
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000"},                    // тут запущен клиент
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE}, // указываю методы, которые разрешены
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// настройка маршрута к созданию пользователя. Сначала указываем маршрут. Если на него приходит POST запрос, то запускается
	// функция RegisterHandler
	e.POST("/register", RegisterHandler)
	// маршрут для входа
	e.POST("/login", LoginHandler)
	// маршрут для получения соли
	e.GET("/get-salt", GetSaltHandler)

	// защищённые маршруты. Без jwt токена к ним доступа нет
	// создаем группу маршрутов, которые требуют JWT токен
	r := e.Group("")

	// подключаем Middleware. Оно будет проверять заголовок Authorization: Bearer <token>
	// если токена нет или он с ошибой, то к функциям ниже доступа просто нет
	r.Use(echojwt.JWT(jwtSecret))

	// маршрут для добавления пароля теперь внутри защищенной группы
	r.POST("/add-pass", AddPasswordHandler)
	r.GET("/get-pass", GetPasswordHandler)

	r.POST("/pwd-show", ShowPasswordHandler)
	r.POST("/pwd-copy", CopyPasswordHandler)

	// получение URL для генерации QR кода для 2FA
	r.GET("/get-QR-2FA", GetQRFor2FA)
	// проверяем код для 2FA
	r.POST("ver-2FA-code", Verificate2FACode)

	// получение списка запросов на получение пароля
	r.GET("/pwd-acs-req", GetPasswordAccessRequest)
	// добавление запроса на получение пароля
	r.POST("/pwd-req", AddPasswordRequest)
	// указываем в запросе title. В body запихнуть нельзя, у GET запроса не может быть body
	r.GET("/get-one-dek", GetOneDEK)
	// маршрут для ободрения пароля. Будет выдан пароль другому пользователю
	r.POST("/pwd-acs-appr", PasswordAccessApprove)
	// отклонение запроса на получение пароля
	r.POST("/pwd-acs-rej", PasswordAccessReject)
	// получение публичного ключа по почте
	r.GET("/get-public-key", GetPublicKey)
	// проверка пользователя на то, что именно владелец перед экраном
	r.GET("/verify-owner", VerifyOwner)
	// та же соль, что и раньше, но по jwt токену
	r.GET("get-salt-jwt", GetSaltByJWT)
	// меняем пароль
	r.PUT("pwd-edit", EditPassword)
	// получение всех публичных ключей пользователей, которые имеют тот или иной расшаренный пароль
	r.POST("get-rec-keys", GetRecipientKeys)

	// удаление оригинального пароля
	r.POST("pwd-del-owner", PwdDelOwner)
	// удаление расшаренного пароля
	r.POST("pwd-del-share", PwdDelShare)

	e.Logger.Fatal(e.Start(":8080"))
}
