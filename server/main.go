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
	// навешиваем на всю группу маршрутов middleware для проверки "заблокирован ли пользователь"
	private.Use(CheckBlocked)

	// функция RegisterHandler
	private.POST("/register", RegisterHandler, CheckPermissionMiddleware("users:create"))
	// маршрут для добавления пароля теперь внутри защищенной группы
	private.POST("/add-pwd", AddPasswordHandler, CheckPermissionMiddleware("secrets:create"))
	private.GET("/get-user-pwd", GetPasswordHandler)

	// получение URL для генерации QR кода для 2FA
	private.GET("/get-QR-2FA", GetQRFor2FA)
	// проверяем код для 2FA
	private.POST("/ver-2FA-code", Verificate2FACode)

	// получение списка запросов на получение пароля
	private.GET("/pwd-acs-req", GetPasswordAccessRequest, CheckPermissionMiddleware("secrets:request_access"))
	// добавление запроса на получение пароля
	private.POST("/pwd-req", AddPasswordRequest, CheckPermissionMiddleware("secrets:create"))
	// указываем в запросе title. В body запихнуть нельзя, у GET запроса не может быть body
	private.GET("/get-dek", GetDEK) // добавить middleware, коды в тетради. Перед этим немного переписать его
	// маршрут для обodрения пароля. Будет выдан пароль другому пользователю
	private.POST("/pwd-acs-appr", PasswordAccessApprove, CheckPermissionMiddleware("secrets:grant_access"))
	// отклонение запроса на получение пароля
	private.POST("/pwd-acs-rej", PasswordAccessReject)
	// получение публичного ключа по почте
	private.GET("/get-public-key", GetPublicKey)
	// проверка пользователя на то, что именно владелец перед экраном
	private.GET("/verify-pwd", VerifyOwner)
	// та же соль, что и раньше, но по jwt токену
	private.GET("/get-salt", GetSaltByJWT)
	// меняем пароль
	private.PUT("/pwd-edit", EditPassword, CheckPermissionMiddleware("secrets_owner:update"))
	// получение всех публичных ключей пользователей, которые имеют тот или иной расшаренный пароль
	private.POST("/get-rec-keys", GetRecipientKeys)
	// получение всех ролей
	private.GET("/get-all-roles", GetAllRoles, CheckPermissionMiddleware("users:create"))

	// удаление оригинального пароля
	private.POST("/del-owner-pwd", PwdDelOwner, CheckPermissionMiddleware("secrets_owner:delete"))
	// удаление расшаренного пароля
	private.POST("/del-shared-pwd", PwdDelShare, CheckPermissionMiddleware("secrets_shared:delete"))

	// получение всех пользователей
	private.GET("/get-users", GetUsers, CheckPermissionMiddleware("users:view"))

	// получение всех прав
	private.GET("/get-permissions", GetPermissions, CheckPermissionMiddleware("role:create"))
	// создание ролей
	private.POST("/create-role", AddRole, CheckPermissionMiddleware("role:create"))

	// блокируем пользователя
	private.POST("/user-blocked", BlockedUser, CheckPermissionMiddleware("users:set_blocked"))
	// разблокируем пользователя
	private.POST("/user-unblocked", UnblockedUser, CheckPermissionMiddleware("users:set_blocked"))
	// удаляем пользователя
	private.POST("/user-del", DeleteUser, CheckPermissionMiddleware("users:delete"))
	// получение всех ролей
	private.GET("/get-roles", GetRoles, CheckPermissionMiddleware("role:view"))
	// получение одной роли
	private.GET("/get-role", GetRole, CheckPermissionMiddleware("role:view"))

	log := e.Group("api/log")
	log.Use(echojwt.JWT(jwtSecret))
	log.POST("/pwd-show", ShowPasswordHandler)
	log.POST("/pwd-copy", CopyPasswordHandler)

	e.Logger.Fatal(e.Start(":8080"))
}
