package main

import (
	// echo — удобный фреймворк для работы с сервером, где уже готовы функции для маршрутизации, прослушивания и ответа
	"github.com/labstack/echo/v4"
)

func main() {
	// инициализация базы данных. Функция внутри файла database.go
	InitDB()

	// инициализация сервера
	e := echo.New()

	// тестовый маршрут. Не знаю работает ли, но ошибку не получаю
	e.GET("/", func(c echo.Context) error {
		return c.String(200, "Сервер SafeKeeper запущен!")
	})

	e.Logger.Fatal(e.Start(":8080"))
}
