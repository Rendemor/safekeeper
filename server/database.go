package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// переменная для обращения к БД. Храним указатель на БД, а не всю БД в переменной
var DB *gorm.DB

func InitDB() {
	// данные для подключения в БД (из server/docker-compose.yml файла)
	dsn := "host=localhost user=postgres password=admin dbname=safekeeper port=5432 sslmode=disable"

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Ошибка подключения к базе данных: ", err)
	}

	// важная особенность Go. Везде в начале указали package main, значит для языка все файлы с package main это один файл.
	// в файле models.go тоже есть package main, а значит и структуры User, Secret и AuditLog видны в database.go. Дальше AutoMigrate
	// сам создаёт таблицы из структур, а также вообще сравнивает какая таблица была, а какая есть сейчас.
	// если появились новые поля, то они появятся и в таблице. Если убрали поля, то таблица изменена не будет, но программно доступа не будет
	// к удалённым полям
	err = DB.AutoMigrate(&User{}, &Secret{}, &AuditLog{})
	if err != nil {
		log.Fatal("Ошибка миграции таблиц: ", err)
	}

	fmt.Println("База данных успешно подключена, таблицы проверены/созданы!")
}
