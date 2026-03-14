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

	// объединил маршруты в группу по смыслу
	auth := e.Group("api/auth")
	// настройка маршрута к созданию пользователя. Сначала указываем маршрут. Если на него приходит POST запрос, то запускается
	// функция RegisterHandler
	auth.POST("/register", RegisterHandler)
	// маршрут для входа
	auth.POST("/login", LoginHandler)
	// маршрут для получения соли
	auth.GET("/get-salt", GetSaltHandler)

	// защищённые маршруты. Без jwt токена к ним доступа нет
	// создаем группу маршрутов, которые требуют JWT токен
	private := e.Group("api/private")
	// подключаем Middleware. Оно будет проверять заголовок Authorization: Bearer <token>
	// если токена нет или он с ошибкой, то к функциям ниже доступа просто нет
	private.Use(echojwt.JWT(jwtSecret))

	private.GET("/refresh-jwt", RefreshJWT)

	// маршрут для добавления пароля теперь внутри защищенной группы
	private.POST("/add-pass", AddPasswordHandler)
	private.GET("/get-pass", GetPasswordHandler)

	private.POST("/pwd-show", ShowPasswordHandler)
	private.POST("/pwd-copy", CopyPasswordHandler)

	// получение URL для генерации QR кода для 2FA
	private.GET("/get-QR-2FA", GetQRFor2FA)
	// проверяем код для 2FA
	private.POST("/ver-2FA-code", Verificate2FACode)

	// получение списка запросов на получение пароля
	private.GET("/pwd-acs-req", GetPasswordAccessRequest)
	// добавление запроса на получение пароля
	private.POST("/pwd-req", AddPasswordRequest)
	// указываем в запросе title. В body запихнуть нельзя, у GET запроса не может быть body
	private.GET("/get-one-dek", GetOneDEK)
	// маршрут для обodрения пароля. Будет выдан пароль другому пользователю
	private.POST("/pwd-acs-appr", PasswordAccessApprove)
	// отклонение запроса на получение пароля
	private.POST("/pwd-acs-rej", PasswordAccessReject)
	// получение публичного ключа по почте
	private.GET("/get-public-key", GetPublicKey)
	// проверка пользователя на то, что именно владелец перед экраном
	private.GET("/verify-owner", VerifyOwner)
	// та же соль, что и раньше, но по jwt токену
	private.GET("/get-salt-jwt", GetSaltByJWT)
	// меняем пароль
	private.PUT("/pwd-edit", EditPassword)
	// получение всех публичных ключей пользователей, которые имеют тот или иной расшаренный пароль
	private.POST("/get-rec-keys", GetRecipientKeys)

	// удаление оригинального пароля
	private.POST("/pwd-del-owner", PwdDelOwner)
	// удаление расшаренного пароля
	private.POST("/pwd-del-share", PwdDelShare)

	e.Logger.Fatal(e.Start(":8080"))
}
