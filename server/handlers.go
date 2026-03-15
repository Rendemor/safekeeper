package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"

	"golang.org/x/crypto/bcrypt"
)

// функция регистрации. В Go сначала пишем название переменной, потом тип данных. После функции пишем тип данных, который возвращаем
func RegisterHandler(c echo.Context) error {

	// локальная структура для принятия данных. `json:"email"` и `json:"password"` это теги, которые помогают программе понимать
	// из каких полей класть информацию из файла в структуру. То есть в файле будет
	// { "email": "test@example.com", "password": "my_password" } и всё корректно разложится
	type RegisterRequest struct {
		Email               string `json:"email"`
		Password            string `json:"password"`
		MasterKeySalt       string `json:"master_key_salt"`
		PublicKey           string `json:"public_key"`
		EncryptedPrivateKey string `json:"encrypted_private_key"`
	}

	req := new(RegisterRequest)

	// сокращённая запись if в Go. То есть if "инициализация переменной"; условие {}. Но можно написать как обычно, разницы не будет
	// Bind(req) сопоставляет данные из полученного json файла с моей структурой, которая объявлена в req. Если сопоставить данные
	// не получается, то получаю ошибку
	// map[string]string{"error": "Неверные данные"} создаёт структуру json файла для возврата.
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверные данные"})
	}

	// хэширование зашифрованного пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка обработки пароля"})
	}

	newUser := User{
		Email:               req.Email,
		PasswordHash:        string(hashedPassword),
		MasterKeySalt:       req.MasterKeySalt,
		PublicKey:           req.PublicKey,
		EncryptedPrivateKey: req.EncryptedPrivateKey,
	}

	if err := DB.Create(&newUser).Error; err != nil {
		logAudit(c, ActionRegFailed, uuid.Nil)

		// Проверяем код ошибки PostgreSQL (23505 - уникальный ключ)
		if strings.Contains(err.Error(), "23505") {
			return c.JSON(http.StatusConflict, APIError{Error: "Пользователь с таким email уже зарегистрирован"})
		}

		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка при создании аккаунта"})
	}

	// функция лдя логирования. Обычно uuid достают из jwt токена, но во время регистрации пользователь ещё не имеет токена, поэтому
	// указываем ID самостоятельно.
	logAudit(c, ActionRegSuccess, newUser.ID)

	// возвращаем успех, если всё ок
	return c.JSON(http.StatusCreated, map[string]string{"message": "Пользователь успешно создан!"})
}

// секретный ключ для подписи токенов
var jwtSecret = []byte("secret_key_for_jwt")

func LoginHandler(c echo.Context) error {
	// структура для входа
	type LoginInput struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	input := new(LoginInput)

	if err := c.Bind(input); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверные данные"})
	}

	// поиск пользователя по email
	var user User
	if err := DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пользователь не найден"})
	}

	// хэшируем полученный пароль при входе и сравниваем хеш с тем, который лежит в базе
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "неверный пароль"})
	}

	accessToken := getJWTaccess(user.ID)
	refreshToken := getJWTrefresh(user.ID)

	ta, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		logAudit(c, ActionLoginFailed, user.ID)
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка генерации токена"})
	}

	tf, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		logAudit(c, ActionLoginFailed, user.ID)
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка генерации токена"})
	}

	cookie := new(http.Cookie)
	cookie.Name = "refresh_token"
	cookie.Value = tf
	cookie.Expires = time.Now().Add(24 * 7 * time.Hour)
	cookie.MaxAge = 60 * 60 * 24 * 7
	cookie.HttpOnly = true
	// надо будет поменять на true, когда будет HTTPS. Это значит, что кука будет передаваться только по защищённому протоколу
	cookie.Secure = false

	// самый мягкий режим
	cookie.SameSite = http.SameSiteLaxMode

	// видно всем
	cookie.Path = "/"

	c.SetCookie(cookie)

	logAudit(c, ActionLoginSuccess, user.ID)

	// отправляем оба токена сразу
	type LoginResponse struct {
		Message             string `json:"message"`
		Token               string `json:"token"`
		PublicKey           string `json:"public_key"`
		EncryptedPrivateKey string `json:"encrypted_private_key"`
		OTPEnabled          bool   `json:"otp_enabled"`
	}

	return c.JSON(http.StatusOK, LoginResponse{
		Message:             "Вход выполнен!",
		Token:               ta,
		PublicKey:           user.PublicKey,
		EncryptedPrivateKey: user.EncryptedPrivateKey,
		OTPEnabled:          user.OTPEnabled,
	})
}

func GetQRFor2FA(c echo.Context) error {
	userID, _ := getUserIDuuid(c)

	var user User
	if err := DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пользователь не найден"})
	}

	if user.OTPSecret == "" || user.OTPEnabled == false {
		// генерируем ключ для 2FA
		key, _ := totp.Generate(totp.GenerateOpts{
			// Название приложения, которое увидит пользователь
			Issuer: "MyPasswordManager",
			// идентификатор пользователя
			AccountName: user.Email,
		})

		if err := DB.Model(&user).Select("OTPSecret", "OTPEnabled").Updates(User{
			OTPSecret:  key.Secret(),
			OTPEnabled: false,
		}).Error; err != nil {
			return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка сохранения в БД"})
		}

		return c.JSON(http.StatusOK, map[string]string{
			"qr_url": key.URL(),
		})
	}

	return c.NoContent(http.StatusNoContent)
}

func Verificate2FACode(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	var user User
	if err := DB.Where("id = ?", userIDuuid).First(&user).Error; err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пользователь не найден"})
	}

	type Res struct {
		Code string `json:"code"`
	}
	res := new(Res)
	if err := c.Bind(res); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверные данные"})
	}

	// проверка пришедшего кода
	valid := totp.Validate(res.Code, user.OTPSecret)

	if !valid {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный код. Попробуйте еще раз"})
	}

	// маршрут для проверки под универсальный (для добавления 2FA и для проверки после добавления)
	DB.Model(&user).Update("OTPEnabled", true)

	return c.JSON(http.StatusOK, APIError{Error: "2FA успешно активирована!"})
}

func AddPasswordHandler(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)
	// структура для пароля
	type PasswordInput struct {
		Title           string `json:"title"`
		Login           string `json:"login"`
		EncryptedData   string `json:"encrypted_data"`
		EncryptionNonce string `json:"encryption_nonce"`
		EncryptedDEK    string `json:"encrypted_dek"`
	}

	input := new(PasswordInput)
	if err := c.Bind(input); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	if err := DB.Select("id").First(&User{}, userIDuuid).Error; err != nil {
		return c.JSON(http.StatusNotFound, APIError{Error: "Пользователь не найден"})
	}

	// сохраняем данные в структуру как в БД
	newSecret := Secret{
		Title:           input.Title,
		Login:           input.Login,
		EncryptedData:   input.EncryptedData,
		EncryptionNonce: input.EncryptionNonce,
		EncryptedDEK:    input.EncryptedDEK,
		UserID:          userIDuuid,
	}

	if err := DB.Create(&newSecret).Error; err != nil {
		logAudit(c, ActionPasswordCreateFailed, uuid.Nil)
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка сохранения в БД"})
	}

	logAudit(c, ActionPasswordCreate, uuid.Nil)

	return c.JSON(http.StatusCreated, newSecret)
}

func GetSaltHandler(c echo.Context) error {
	// из получаемых данных получаем ключ "email"
	email := c.QueryParam("email")

	var user User
	// ищем в базе пользователя с таким email
	if err := DB.Where("email = ?", email).First(&user).Error; err != nil {
		logAudit(c, ActionSaltGetFailed, user.ID)
		return c.JSON(http.StatusNotFound, APIError{Error: "Пользователь не найден"})
	}

	// соль выдаётся для генерации KEK во время входа, поэтому jwt токена ещё нет
	logAudit(c, ActionSaltGet, user.ID)

	// возвращаем только соль, больше ничего не надо
	return c.JSON(http.StatusOK, map[string]string{"salt": user.MasterKeySalt})
}

func GetSaltByJWT(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	var user User
	// ищем в базе пользователя с таким email
	if err := DB.Where("id = ?", userIDuuid).First(&user).Error; err != nil {
		logAudit(c, ActionSaltGetFailed, user.ID)
		return c.JSON(http.StatusNotFound, APIError{Error: "Пользователь не найден"})
	}

	// соль выдаётся для генерации KEK во время входа, поэтому jwt токена ещё нет
	logAudit(c, ActionSaltGet, user.ID)

	// возвращаем только соль, больше ничего не надо
	return c.JSON(http.StatusOK, map[string]string{"salt": user.MasterKeySalt})
}

func GetPasswordHandler(c echo.Context) error {
	type UnifiedPassword struct {
		ID              uuid.UUID `json:"id"`
		Title           string    `json:"title"`
		Login           string    `json:"login"`
		EncryptedData   string    `json:"encrypted_data"`
		EncryptedDEK    string    `json:"encrypted_dek"`
		EncryptionNonce string    `json:"encryption_nonce"`
		OwnerID         uuid.UUID `json:"owner_id"`
		IsShared        bool      `json:"is_shared"`
	}

	userId := getUserId(c)
	var results []UnifiedPassword

	// запрос в виде SQL запроса, а не конструкций из Go
	// запрос на вид ужасный, но по сути нормальный. Просто создаём (выбором) новую таблицу из первого запроса
	// потом создаём вторую таблицу. По полям она должна совпадать ну вот 100%, никак иначе
	// вторая таблица зависит от первой, поэтому наполняется она данными из первой таблицы по условию, что они смотрят на записи по
	// одному и тому же id. Дальше таблицы склеиваются. Буквально к первой таблице снизу прикрепляется вторая
	query := `
        SELECT s.id, s.title, s.login, s.encrypted_data, s.encrypted_dek, s.encryption_nonce, s.user_id as owner_id, false as is_shared
        FROM secrets s
        WHERE s.user_id = ?
        UNION ALL
        SELECT s.id, s.title, s.login, s.encrypted_data, ss.shared_encrypted_dek as encrypted_dek, s.encryption_nonce, ss.owner_id, true as is_shared
        FROM shared_secrets ss
        JOIN secrets s ON ss.secret_id = s.id
        WHERE ss.recipient_id = ?
    `

	// запишиваем запрос. userId передаётся дважды (два ? в самом запросе)
	if err := DB.Raw(query, userId, userId).Scan(&results).Error; err != nil {
		logAudit(c, ActionPasswordRequestFailed, uuid.Nil)
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка при получении списка паролей"})
	}

	logAudit(c, ActionPasswordRequest, uuid.Nil)

	// если вдруг нет паролей, то просто отдаём пустой массив
	if results == nil {
		results = []UnifiedPassword{}
	}

	return c.JSON(http.StatusOK, results)
}

func ShowPasswordHandler(c echo.Context) error {
	logAudit(c, ActionPasswordView, uuid.Nil)

	// пустой ответ. Статус 204
	return c.NoContent(http.StatusNoContent)
}

func CopyPasswordHandler(c echo.Context) error {
	logAudit(c, ActionPasswordCopy, uuid.Nil)

	return c.NoContent(http.StatusNoContent)
}

func GetPasswordAccessRequest(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	// создаём массив запросов на получение пароля
	var pwdRequest []PasswordAccessRequest

	if err := DB.Where("user_id_to = ?", userIDuuid).Find(&pwdRequest).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка базы данных"})
	}

	return c.JSON(http.StatusOK, pwdRequest)
}

func AddPasswordRequest(c echo.Context) error {

	type Res struct {
		Title string `json:"title"`
		Login string `json:"login"`
		// почта того, у кого хотим взять пароль
		Email string `json:"email"`
	}

	input := new(Res)
	if err := c.Bind(input); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	userIDuuidFrom, _ := getUserIDuuid(c)

	// поиск пользователя по email
	var userTo User
	if err := DB.Where("email = ?", input.Email).First(&userTo).Error; err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пользователь не найден"})
	}
	var userFrom User
	if err := DB.Where("id = ?", userIDuuidFrom).First(&userFrom).Error; err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пользователь не найден"})
	}
	var pwd Secret
	if err := DB.Where(
		"user_id = ? AND title = ? AND login = ?",
		userTo.ID, input.Title, input.Login).First(&pwd).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Такого пароля нет"})
	}

	var exists bool
	err := DB.Model(&PasswordAccessRequest{}).
		// делаем булевый запрос. Если записей больше 0, то вернёт 1, иначе 0
		Select("count(*) > 0").
		Where(
			"user_id_from = ? AND user_id_to = ? AND title = ? AND login = ?",
			userFrom.ID, userTo.ID, input.Title, input.Login).
		Find(&exists).
		Error

	if err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Ошибка поиска записи"})
	}

	if exists {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Запрос уже отправлен"})
	}

	err = DB.Model(&SharedSecret{}).
		// делаем булевый запрос. Если записей больше 0, то вернёт 1, иначе 0
		Select("count(*) > 0").
		Where(
			"secret_id = ? AND owner_id = ? AND recipient_id = ?",
			pwd.ID, userTo.ID, userFrom.ID).
		Find(&exists).
		Error

	if err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Ошибка поиска записи"})
	}

	if exists {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пароль уже предоставлен"})
	}

	pwdReq := PasswordAccessRequest{
		UserIDFrom: userIDuuidFrom,
		UserIDTo:   userTo.ID,
		Title:      input.Title,
		Login:      pwd.Login,
		// публичный ключ человека, который запросил пароль, чтобы владелец пароля мог зашифровать пароль этим ключом
		PublicKey: userFrom.PublicKey,
	}

	// отправляем запрос пароля в БД
	if err := DB.Create(&pwdReq).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка сохранения в БД"})
	}

	return c.NoContent(http.StatusNoContent)
}

func PasswordAccessApprove(c echo.Context) error {
	type Res struct {
		Title              string    `json:"Title"`
		SecretID           uuid.UUID `json:"SecretID"`
		OwnerID            uuid.UUID `json:"OwnerID"`
		RecipientID        uuid.UUID `json:"RecipientID"`
		SharedEncryptedDEK string    `json:"SharedEncryptedDEK"`
		ExpiresAt          time.Time `json:"ExpiresAt"`
	}

	res := new(Res)
	if err := c.Bind(res); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	var exists bool
	err := DB.Model(&SharedSecret{}).
		// делаем булевый запрос. Если записей больше 0, то вернёт 1, иначе 0
		Select("count(*) > 0").
		Where("secret_id = ? AND owner_id = ? AND recipient_id = ?", res.SecretID, res.OwnerID, res.RecipientID).
		Find(&exists).
		Error

	if err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Ошибка поиска записи"})
	}

	if exists {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пароль уже предоставлен"})
	}

	// проверка на то, что пользователь делится паролем сам с собой. Это надо, поскольку таблицу с общими паролями
	// нельзя сделал unique ни одно поле
	err = DB.Model(&Secret{}).
		// делаем булевый запрос. Если записей больше 0, то вернёт 1, иначе 0
		Select("count(*) > 0").
		Where("id = ? AND user_id = ?", res.SecretID, res.RecipientID).
		Find(&exists).
		Error

	if err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Ошибка поиска записи"})
	}

	if exists {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Нельзя делиться паролем с самим собой"})
	}

	var user User
	if err := DB.Where("id = ?", res.RecipientID).First(&user).Error; err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Пользователь не найден"})
	}

	pwd := SharedSecret{
		SecretID:           res.SecretID,
		OwnerID:            res.OwnerID,
		RecipientID:        res.RecipientID,
		SharedEncryptedDEK: res.SharedEncryptedDEK,
		ExpiresAt:          &res.ExpiresAt,
	}

	// добавляем запрошенный пароль пользователю, который запросил его
	if err := DB.Create(&pwd).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка сохранения в БД"})
	}

	// удаляем запрос на получение пароля
	if err := DB.Where(
		"user_id_from = ? AND user_id_to = ? AND title = ?",
		res.RecipientID, res.OwnerID, res.Title).Delete(&PasswordAccessRequest{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка удаления старой записи"})
	}

	return c.NoContent(http.StatusNoContent)
}

func GetDEK(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	// вытаскиваем параметр title из URL
	title := c.QueryParam("title")
	if title == "" {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Не указано название"})
	}
	login := c.QueryParam("login")
	if login == "" {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Не указан логин"})
	}

	// нашли нужный пароль
	var pwd Secret
	if err := DB.Where("title = ? AND login = ? AND user_id = ?", title, login, userIDuuid).First(&pwd).Error; err != nil {
		return c.JSON(http.StatusNotFound, APIError{Error: "Пользователь или пароль не найдены"})
	}

	type Res struct {
		ID       uuid.UUID `json:"id"`
		Owner_ID uuid.UUID `json:"owner_id"`
		Enc_dek  string    `json:"enc_dek"`
	}

	// отправляем пароль клиенту. Пароль зашифрован. Без ключей (получили при логине), пароль теоретически невозможно взломать
	return c.JSON(http.StatusOK, Res{
		ID:       pwd.ID,
		Owner_ID: pwd.UserID,
		Enc_dek:  pwd.EncryptedDEK,
	})
}

func PasswordAccessReject(c echo.Context) error {
	userIDto, _ := getUserIDuuid(c)

	type Res struct {
		ID    uuid.UUID `json:"ID"` // пароль того, кто запросил пароль
		Title string    `json:"Title"`
	}

	res := new(Res)
	if err := c.Bind(res); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	if err := DB.Where(
		"user_id_from = ? AND user_id_to = ? AND title = ?",
		res.ID, userIDto, res.Title).Delete(&PasswordAccessRequest{}).Error; err != nil {

		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка удаления старой записи"})
	}

	return c.NoContent(http.StatusNoContent)
}

func GetPublicKey(c echo.Context) error {
	email := c.QueryParam("email")
	if email == "" {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный email"})
	}

	var user User
	if err := DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, APIError{Error: "Пользователь не найден"})
	}

	return c.JSON(http.StatusOK, user)
}

func VerifyOwner(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	var user User
	if err := DB.Where("id = ?", userIDuuid).First(&user).Error; err != nil {
		return c.JSON(http.StatusNotFound, APIError{Error: "Пользователь не найден"})
	}

	hash := c.QueryParam("hash")

	// хэшируем полученный пароль при входе и сравниваем хеш с тем, который лежит в базе
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(hash))
	if err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "неверный пароль"})
	}

	return c.NoContent(http.StatusNoContent)
}

func EditPassword(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	type Req struct {
		ID            uuid.UUID `json:"id"`
		Title         string    `json:"title"`
		Login         string    `json:"login"`
		EncryptedData string    `json:"encrypted_data"`
		EncryptedDEK  string    `json:"encrypted_dek"`
		Nonce         string    `json:"encryption_nonce"`
		SharedKeys    []struct {
			RecipientID  string `json:"recipient_id"`
			EncryptedDEK string `json:"encrypted_dek"`
		} `json:"shared_dek"`
	}
	req := new(Req)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	return DB.Transaction(func(tx *gorm.DB) error {
		// обновление основного пароля
		if err := tx.Model(&Secret{}).Where("id = ?", req.ID).Updates(Secret{
			Title:           req.Title,
			Login:           req.Login,
			EncryptedData:   req.EncryptedData,
			EncryptedDEK:    req.EncryptedDEK,
			EncryptionNonce: req.Nonce,
			UpdatedAt:       time.Now(),
		}).Error; err != nil {
			return err
		}

		// обновление ключей в расшаренной таблице
		for _, k := range req.SharedKeys {
			err := tx.Exec(`
			INSERT INTO shared_secrets (secret_id, recipient_id, shared_encrypted_dek, owner_id, created_at)
			VALUES (?, ?, ?, ?, NOW())
			ON CONFLICT (secret_id, recipient_id) 
			DO UPDATE SET shared_encrypted_dek = EXCLUDED.shared_encrypted_dek`,
				req.ID, k.RecipientID, k.EncryptedDEK, userIDuuid).Error //
			if err != nil {
				return err
			}
		}

		return c.NoContent(http.StatusNoContent)
	})
}

func GetRecipientKeys(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	type Req struct {
		Title string `json:"Title"`
		Login string `json:"login"`
	}

	req := new(Req)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	var pwd Secret
	if err := DB.Where(
		"user_id = ? and title = ? and login = ?",
		userIDuuid, req.Title, req.Login).
		First(&pwd).
		Error; err != nil {
		return c.JSON(http.StatusNotFound, APIError{Error: "Пароль не найден"})
	}

	query := `
		SELECT u.id, u.email, u.public_key
        FROM users u 
        JOIN shared_secrets ss ON u.id = ss.recipient_id
        WHERE ss.secret_id = ?
    `

	type RecipientKey struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		PublicKey string `json:"public_key"`
	}

	var keys []RecipientKey
	if err := DB.Raw(query, pwd.ID).Scan(&keys).Error; err != nil {
		return c.JSON(http.StatusNotFound, APIError{Error: "Пароль не найден"})
	}

	// надо обзательно вернуть хотя бы пустой массив, иначе map просто ломается на фронте
	if len(keys) == 0 {
		return c.JSON(http.StatusOK, []RecipientKey{})
	}

	return c.JSON(http.StatusOK, keys)
}

func PwdDelOwner(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	type Req struct {
		ID    uuid.UUID `json:"id"`
		Title string    `json:"title"`
		Login string    `json:"login"`
	}

	req := new(Req)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	// запускаем транзакицю. Либо удаляем всё, либо ничего
	return DB.Transaction(func(tx *gorm.DB) error {
		var secret Secret

		// находим id удаляемого пароля
		if err := tx.Select("id").Where("user_id = ? AND title = ? AND login = ?",
			userIDuuid, req.Title, req.Login).First(&secret).Error; err != nil {
			return echo.NewHTTPError(http.StatusNotFound, "Пароль не найден")
		}

		if secret.ID != req.ID {
			return c.JSON(http.StatusBadRequest, APIError{Error: "Ошибка удаления"})
		}

		// удаляем пароль из таблицы расшаренных паролей
		if err := tx.Where("secret_id = ?", secret.ID).Delete(&SharedSecret{}).Error; err != nil {
			return err
		}

		// удаляем оригинальный пароль. Конкретную таблицу не указал, потому что secret переменная типа Secret. GROM сам подтянул
		// название нужной переменной
		if err := tx.Delete(&secret).Error; err != nil {
			return err
		}

		return c.NoContent(http.StatusNoContent)
	})
}

func PwdDelShare(c echo.Context) error {
	userIDuuid, _ := getUserIDuuid(c)

	type Req struct {
		ID    uuid.UUID `json:"id"`
		Title string    `json:"title"`
		Login string    `json:"login"`
	}

	req := new(Req)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, APIError{Error: "Неверный формат данных"})
	}

	if err := DB.Where("secret_id = ? AND recipient_id = ?", req.ID, userIDuuid).Delete(&SharedSecret{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка удаления"})
	}

	return c.NoContent(http.StatusNoContent)
}

func RefreshJWT(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		return c.JSON(http.StatusUnauthorized, APIError{Error: "Refresh токен не найден"})
	}

	claims, err := parseJWT(cookie.Value, string(jwtSecret))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, APIError{Error: "Некорректный refresh токен"})
	}

	userID, ok := (*claims)["user_id"].(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, APIError{Error: "Некорректные данные токена"})
	}

	var user User
	if err := DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, APIError{Error: "Пользователь не найден"})
	}

	accessToken := getJWTaccess(user.ID)
	refreshToken := getJWTrefresh(user.ID)

	ta, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		logAudit(c, ActionLoginFailed, user.ID)
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка генерации токена"})
	}

	tf, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		logAudit(c, ActionLoginFailed, user.ID)
		return c.JSON(http.StatusInternalServerError, APIError{Error: "Ошибка генерации токена"})
	}

	newCookie := new(http.Cookie)
	newCookie.Name = "refresh_token"
	newCookie.Value = tf
	newCookie.Expires = time.Now().Add(time.Hour * 24 * 7)
	newCookie.HttpOnly = true
	// потом поменять на true, когда будет HTTPS. Это значит, что кука будет передаваться только по защищённому протоколу
	newCookie.Secure = false
	// указываю куда эта кука будет отправляться. То есть она прикрепляется только к запросу на указанный маршрут
	newCookie.Path = "/"
	newCookie.SameSite = http.SameSiteLaxMode

	c.SetCookie(newCookie)

	type Res struct {
		Token string `json:"token"`
	}

	return c.JSON(http.StatusOK, Res{Token: ta})
}
