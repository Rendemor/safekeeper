package main

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// функция регистрации. В Go сначала пишем название переменной, потом тип данных. После функции пишем тип данных, который возвращаем
func RegisterHandler(c echo.Context) error {

	// локальная структура для принятия данных. `json:"email"` и `json:"password"` это теги, которые помогают программе понимать
	// из каких полей класть информацию из файла в структуру. То есть в файле будет
	// { "email": "test@example.com", "password": "my_password" } и всё корректно разложится
	type RegisterRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	req := new(RegisterRequest)

	// сокращённая запись if в Go. То есть if "инициализация переменной"; условие {}. Но можно написать как обычно, разницы не будет
	// Bind(req) сопоставляет данные из полученного json файла с моей структурой, которая объявлена в req. Если сопоставить данные
	// не получается, то получаю ошибку
	// map[string]string{"error": "Неверные данные"} создаёт структуру json файла для возврата.
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Неверные данные"})
	}

	// создание структуры пользователя и заполнение его данными из req, полученного ранее. Сам User был объявлен в models.go.
	// пароль пока без хэша, просто хранится в том виде, как он пришёл
	newUser := User{
		Email:        req.Email,
		PasswordHash: req.Password,
	}

	// Сохранение данных в БД.
	result := DB.Create(&newUser)
	if result.Error != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Ошибка сохранения в базу"})
	}

	// возвращаем успех, если всё ок
	return c.JSON(http.StatusCreated, map[string]string{"message": "Пользователь успешно создан!"})
}
