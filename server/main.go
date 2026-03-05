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

	// получение списка запросов на получение пароля
	r.GET("/pwd-acs-req", GetPasswordAccessRequest)
	// добавление запроса на получение пароля
	r.POST("/pwd-req", AddPasswordRequest)
	// указываем в запросе title. В body запихнуть нельзя, у GET запроса не может быть body
	r.GET("/get-one-pwd", GetOnePwd)
	// маршрут для ободрения пароля. Будет выдан пароль другому пользователю
	r.POST("/pwd-acs-appr", PasswordAccessApprove)

	e.Logger.Fatal(e.Start(":8080"))
}
