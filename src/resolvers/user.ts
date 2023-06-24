import { User } from '../entities/User'
import {
	Resolver,
	Mutation,
	Arg,
	Ctx,
	UseMiddleware,
	Query,
	FieldResolver,
	Root,
} from 'type-graphql'
import argon2 from 'argon2'
import { UserMutationResponse } from '../@types/UserMutationResponse'
import { RegisterInput } from '../@types/RegisterInput'
import { validateRegisterInput, validateResetPassword } from '../utils/validateRegisterInput'
import { LoginInput } from '../@types/LoginInput'
import { Context } from '../@types/Context'
import { COOKIE_NAME } from '../constants'
import { checkAuth } from '../middleware/checkAuth'
import { ForgotPasswordInput } from '../@types/ForgotPasswordInput'
import { sendEmail } from '../utils/sendEmail'
import { TokenModel } from '../models/Token'
import { v4 as uuidv4 } from 'uuid'
import { ChangePasswordInput } from '../@types/ChangePasswordInput'

@Resolver((_of) => User)
export class UserResolver {
	// overwrite file email
	@FieldResolver((_return) => String)
	email(@Root() user: User, @Ctx() { req }: Context) {
		return req.session.userId === user.id ? user.id : ''
	}

	@Mutation((_return) => UserMutationResponse)
	async register(
		@Arg('registerInput') registerInput: RegisterInput,
		@Ctx() { req }: Context
	): Promise<UserMutationResponse> {
		console.log('register')

		const { error } = validateRegisterInput(registerInput)
		if (error) {
			const field = error.details.map((error) => error.path[0]).toString()
			const message = error.details.map((e) => e.message).toString()
			return {
				code: 400,
				success: false,
				message: `Invalid ${field}`,
				errors: [{ field, message }],
			}
		}

		try {
			const { username, email, password } = registerInput
			const existingUser = await User.findOne({
				where: [{ username }, { email }],
			})
			if (existingUser) {
				return {
					code: 400,
					success: false,
					message: 'Duplicated username or email',
					errors: [
						{
							field: existingUser.username === username ? 'username' : 'email',
							message: `${existingUser.username === username ? 'Username' : 'Email'} already taken`,
						},
					],
				}
			}
			const hashPassword = await argon2.hash(password)
			const newUser = User.create({
				username,
				password: hashPassword,
				email,
			})
			await newUser.save()
			req.session.userId = newUser.id
			return {
				code: 200,
				success: true,
				message: 'User registration successful',
				user: newUser,
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error >> ${error.message}`,
			}
		}
	}
	@Mutation((_return) => UserMutationResponse)
	async login(
		@Arg('loginInput') { usernameOrEmail, password }: LoginInput,
		@Ctx() { req }: Context
	): Promise<UserMutationResponse> {
		console.log('login')

		try {
			const exitsingUser = await User.findOneBy(
				usernameOrEmail.includes('@')
					? { email: usernameOrEmail as string }
					: { username: usernameOrEmail }
			)
			if (!exitsingUser) {
				return {
					code: 400,
					success: false,
					message: 'User not found',
					errors: [{ field: 'usernameOrEmail', message: 'Username or email incorrect' }],
				}
			}
			const isPasswordVaild = await argon2.verify(exitsingUser.password, password)
			if (!isPasswordVaild) {
				return {
					code: 400,
					success: false,
					message: 'Wrong password',
					errors: [{ field: 'password', message: 'Wrong password' }],
				}
			}

			// Create session and return cookie
			req.session.userId = exitsingUser.id

			return {
				code: 200,
				success: true,
				message: 'Logged in successfully',
				user: exitsingUser,
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error ${error.message}`,
			}
		}
	}
	@Mutation((_return) => Boolean)
	@UseMiddleware(checkAuth)
	logout(@Ctx() { req, res }: Context): Promise<boolean> {
		return new Promise((resolve, _reject) => {
			res.clearCookie(COOKIE_NAME)

			req.session.destroy((error) => {
				if (error) {
					console.log('DESTROYING SESSION ERROR', error)
					resolve(false)
				}
				resolve(true)
			})
		})
	}

	@Query((_return) => User, { nullable: true })
	async me(@Ctx() { req }: Context): Promise<User | null> {
		if (!req.session.userId) return null
		return await User.findOneBy({ id: req.session.userId })
	}

	@Mutation((_return) => Boolean)
	async forgotPassword(
		@Arg('forgotPassowrdInput') forgotPasswordInput: ForgotPasswordInput
	): Promise<boolean> {
		const user = await User.findOneBy({
			email: forgotPasswordInput.email,
		})
		if (!user) return false

		// delete token if user send many forgot password
		await TokenModel.findOneAndDelete({ userId: user.id.toString() })

		const resetToken = uuidv4()
		const hashedResetToken = await argon2.hash(resetToken)

		// save token to db
		await new TokenModel({ userId: user.id.toString(), token: hashedResetToken }).save()

		// send reset passowrd link to uer via email
		await sendEmail(
			forgotPasswordInput.email,
			`<a href="http://localhost:3000/change-password?token=${resetToken}&userId=${user.id}">Click here to reset your password</a>`
		)

		return true
	}

	@Mutation((_return) => UserMutationResponse)
	async changePassword(
		@Arg('token') token: string,
		@Arg('userId') userId: string,
		@Arg('changePasswordInput') changePasswordInput: ChangePasswordInput,
		@Ctx() { req }: Context
	): Promise<UserMutationResponse> {
		const { error } = validateResetPassword(changePasswordInput)
		if (error) {
			const field = error.details.map((error) => error.path[0]).toString()
			const message = error.details.map((e) => e.message).toString()
			return {
				code: 400,
				success: false,
				message: `Invalid ${field}`,
				errors: [{ field, message }],
			}
		}

		try {
			const resetPasswordTokenRecord = await TokenModel.findOne({ userId })
			if (!resetPasswordTokenRecord) {
				return {
					code: 400,
					success: false,
					message: 'Invalid or expired password reset token',
					errors: [
						{
							field: 'token',
							message: 'Invalid or expired password reset token',
						},
					],
				}
			}
			const resetPasswordTokenValid = argon2.verify(resetPasswordTokenRecord.token, token)
			if (!resetPasswordTokenValid) {
				return {
					code: 400,
					success: false,
					message: 'Invalid or expired password reset token',
					errors: [
						{
							field: 'token',
							message: 'Invalid or expired password reset token',
						},
					],
				}
			}

			const userIdNum = parseInt(userId)
			const user = await User.findOneBy({ id: userIdNum })

			if (!user) {
				return {
					code: 400,
					success: false,
					message: 'User no longer exists',
					errors: [{ field: 'token', message: 'User no longer exists' }],
				}
			}

			const updatedPassword = await argon2.hash(changePasswordInput.newPassword)
			await User.update({ id: userIdNum }, { password: updatedPassword })

			await resetPasswordTokenRecord.deleteOne()

			req.session.userId = user.id

			return {
				code: 200,
				success: true,
				message: 'User password reset successfully',
				user,
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error ${error.message}`,
			}
		}
	}
}
