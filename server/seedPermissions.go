package main

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var userPermissions = []Permission{
	{Name: "Создание пользователей", Code: "users:create"},
	{Name: "Удаление пользователей", Code: "users:delete"},
	{Name: "Редактирование пользователей", Code: "users:update"},
	{Name: "Просмотр пользователей", Code: "users:view"},
}

var secretPermissions = []Permission{
	{Name: "Добавление паролей", Code: "secrets:create"},
	{Name: "Удаление своих паролей", Code: "secrets_owner:delete"},
	{Name: "Удаление расшаренных паролей", Code: "secrets_shared:delete"},
	{Name: "Редактирование своих паролей", Code: "secrets_owner:update"},
	{Name: "Просмотр паролей", Code: "secrets:view"},
	{Name: "Запрос доступа к чужим паролям", Code: "secrets:request_access"},
	{Name: "Предоставление доступа к своим паролям", Code: "secrets:grant_access"},
	{Name: "Доступ к возможности самостоятельно делиться паролями", Code: "secrets:shared"},
}

func SeedPermissions(db *gorm.DB, permissions []Permission) {
	for _, p := range permissions {
		// Clause "OnConflict" проверяет наличие по уникальному полю Code.
		// eсли Code уже есть — ничего не делает (или обновляет Name).
		db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"name": p.Name}),
		}).Create(&p)
	}
}

func synchronizePermissions(db *gorm.DB) {
	SeedPermissions(db, userPermissions)
	SeedPermissions(db, secretPermissions)

	var adminRole Role
	db.FirstOrCreate(&adminRole, Role{Name: "super_admin"})

	// вытягиваем все права, чтобы дать их суперадмину
	var perms []Permission
	db.Find(&perms)

	for _, p := range perms {
		// Связываем роль и право
		db.Clauses(clause.OnConflict{DoNothing: true}).Create(&RolePermission{
			RoleID:       adminRole.ID,
			PermissionID: p.ID,
		})
	}
}
