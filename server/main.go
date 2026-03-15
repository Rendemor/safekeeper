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
		AllowOrigins:     []string{"http://localhost:3000"},                    // тут запущен клиент
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.DELETE}, // указываю методы, которые разрешены
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "credentials"},
		AllowCredentials: true,
	}))

	// объединил маршруты в группу по смыслу
	auth := e.Group("api/auth")
	// настройка маршрута к созданию пользователя. Сначала указываем маршрут. Если на него приходит POST запрос, то запускается
	// функция RegisterHandler
	auth.POST("/register", RegisterHandler)
	// маршрут для входа
	auth.POST("/login", LoginHandler)
	// маршрут для получения соли
	auth.GET("/get-salt", GetSaltHandler)
	// маршрут для обновления JWT токена
	auth.GET("/refresh-jwt", RefreshJWT)

	// защищённые маршруты. Без jwt токена к ним доступа нет
	// создаем группу маршрутов, которые требуют JWT токен
	private := e.Group("api/private")
	// подключаем Middleware. Оно будет проверять заголовок Authorization: Bearer <token>
	// если токена нет или он с ошибкой, то к функциям ниже доступа просто нет
	private.Use(echojwt.JWT(jwtSecret))

	// маршрут для добавления пароля теперь внутри защищенной группы
	private.POST("/add-pwd", AddPasswordHandler)
	private.GET("/get-user-pwd", GetPasswordHandler)

	// получение URL для генерации QR кода для 2FA
	private.GET("/get-QR-2FA", GetQRFor2FA)
	// проверяем код для 2FA
	private.POST("/ver-2FA-code", Verificate2FACode)

	// получение списка запросов на получение пароля
	private.GET("/pwd-acs-req", GetPasswordAccessRequest)
	// добавление запроса на получение пароля
	private.POST("/pwd-req", AddPasswordRequest)
	// указываем в запросе title. В body запихнуть нельзя, у GET запроса не может быть body
	private.GET("/get-dek", GetDEK)
	// маршрут для обodрения пароля. Будет выдан пароль другому пользователю
	private.POST("/pwd-acs-appr", PasswordAccessApprove)
	// отклонение запроса на получение пароля
	private.POST("/pwd-acs-rej", PasswordAccessReject)
	// получение публичного ключа по почте
	private.GET("/get-public-key", GetPublicKey)
	// проверка пользователя на то, что именно владелец перед экраном
	private.GET("/verify-pwd", VerifyOwner)
	// та же соль, что и раньше, но по jwt токену
	private.GET("/get-salt", GetSaltByJWT)
	// меняем пароль
	private.PUT("/pwd-edit", EditPassword)
	// получение всех публичных ключей пользователей, которые имеют тот или иной расшаренный пароль
	private.POST("/get-rec-keys", GetRecipientKeys)

	// удаление оригинального пароля
	private.POST("/del-owner-pwd", PwdDelOwner)
	// удаление расшаренного пароля
	private.POST("/del-shared-pwd", PwdDelShare)

	log := e.Group("api/log")
	log.Use(echojwt.JWT(jwtSecret))
	log.POST("/pwd-show", ShowPasswordHandler)
	log.POST("/pwd-copy", CopyPasswordHandler)

	e.Logger.Fatal(e.Start(":8080"))
}
