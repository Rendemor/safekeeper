package main

type ActionCode string

const (
	ActionRegSuccess ActionCode = "reg_success"
	ActionRegFailed  ActionCode = "reg_failed"

	ActionLoginSuccess ActionCode = "auth_login"
	ActionLoginFailed  ActionCode = "auth_fail"

	ActionPasswordView          ActionCode = "pwd_view"
	ActionPasswordCopy          ActionCode = "pwd_copy"
	ActionPasswordCreate        ActionCode = "pwd_create"
	ActionPasswordDelete        ActionCode = "pwd_delete"
	ActionPasswordCreateFailed  ActionCode = "pwd_create_fail"
	ActionPasswordRequest       ActionCode = "pwd_request"
	ActionPasswordRequestFailed ActionCode = "pwd_request_fail"

	ActionKeyExport ActionCode = "key_export"

	ActionSaltGet       ActionCode = "salt_get"
	ActionSaltGetFailed ActionCode = "salt_get_fali"
)
