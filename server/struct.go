package main

type ActionCode string

const (
	ActionLoginSuccess   ActionCode = "auth_login"
	ActionLoginFailed    ActionCode = "auth_fail"
	ActionPasswordView   ActionCode = "pwd_view"
	ActionPasswordCopy   ActionCode = "pwd_copy"
	ActionPasswordCreate ActionCode = "pwd_create"
	ActionPasswordDelete ActionCode = "pwd_delete"
	ActionKeyExport      ActionCode = "key_export"
)
