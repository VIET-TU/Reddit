import Joi from 'joi'
import { RegisterInput } from '../@types/RegisterInput'
import { ChangePasswordInput } from 'src/@types/ChangePasswordInput'

export const validateRegisterInput = (registerInput: RegisterInput) => {
	const userSchema = Joi.object<RegisterInput>({
		username: Joi.string()
			.min(4)
			.regex(/^[a-zA-Z0-9]+$/)
			.required()
			.messages({
				message: 'Invalid username',
			}),
		email: Joi.string().pattern(new RegExp('gmail.com')).email().required(),
		password: Joi.string().min(4).max(23).required(),
	})
	return userSchema.validate(registerInput)
}

export const validateResetPassword = (changePasswordInput: ChangePasswordInput) => {
	const isNewPassword = Joi.object<ChangePasswordInput>({
		newPassword: Joi.string().min(4).max(23).required(),
	})
	return isNewPassword.validate(changePasswordInput)
}
