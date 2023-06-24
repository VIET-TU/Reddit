"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = void 0;
const User_1 = require("../entities/User");
const type_graphql_1 = require("type-graphql");
const argon2_1 = __importDefault(require("argon2"));
const UserMutationResponse_1 = require("../@types/UserMutationResponse");
const RegisterInput_1 = require("../@types/RegisterInput");
const validateRegisterInput_1 = require("../utils/validateRegisterInput");
const LoginInput_1 = require("../@types/LoginInput");
const constants_1 = require("../constants");
const checkAuth_1 = require("../middleware/checkAuth");
const ForgotPasswordInput_1 = require("../@types/ForgotPasswordInput");
const sendEmail_1 = require("../utils/sendEmail");
const Token_1 = require("../models/Token");
const uuid_1 = require("uuid");
const ChangePasswordInput_1 = require("../@types/ChangePasswordInput");
let UserResolver = exports.UserResolver = class UserResolver {
    email(user, { req }) {
        return req.session.userId === user.id ? user.id : '';
    }
    async register(registerInput, { req }) {
        console.log('register');
        const { error } = (0, validateRegisterInput_1.validateRegisterInput)(registerInput);
        if (error) {
            const field = error.details.map((error) => error.path[0]).toString();
            const message = error.details.map((e) => e.message).toString();
            return {
                code: 400,
                success: false,
                message: `Invalid ${field}`,
                errors: [{ field, message }],
            };
        }
        try {
            const { username, email, password } = registerInput;
            const existingUser = await User_1.User.findOne({
                where: [{ username }, { email }],
            });
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
                };
            }
            const hashPassword = await argon2_1.default.hash(password);
            const newUser = User_1.User.create({
                username,
                password: hashPassword,
                email,
            });
            await newUser.save();
            req.session.userId = newUser.id;
            return {
                code: 200,
                success: true,
                message: 'User registration successful',
                user: newUser,
            };
        }
        catch (error) {
            console.log(error);
            return {
                code: 500,
                success: false,
                message: `Internal server error >> ${error.message}`,
            };
        }
    }
    async login({ usernameOrEmail, password }, { req }) {
        console.log('login');
        try {
            const exitsingUser = await User_1.User.findOneBy(usernameOrEmail.includes('@')
                ? { email: usernameOrEmail }
                : { username: usernameOrEmail });
            if (!exitsingUser) {
                return {
                    code: 400,
                    success: false,
                    message: 'User not found',
                    errors: [{ field: 'usernameOrEmail', message: 'Username or email incorrect' }],
                };
            }
            const isPasswordVaild = await argon2_1.default.verify(exitsingUser.password, password);
            if (!isPasswordVaild) {
                return {
                    code: 400,
                    success: false,
                    message: 'Wrong password',
                    errors: [{ field: 'password', message: 'Wrong password' }],
                };
            }
            req.session.userId = exitsingUser.id;
            return {
                code: 200,
                success: true,
                message: 'Logged in successfully',
                user: exitsingUser,
            };
        }
        catch (error) {
            console.log(error);
            return {
                code: 500,
                success: false,
                message: `Internal server error ${error.message}`,
            };
        }
    }
    logout({ req, res }) {
        return new Promise((resolve, _reject) => {
            res.clearCookie(constants_1.COOKIE_NAME);
            req.session.destroy((error) => {
                if (error) {
                    console.log('DESTROYING SESSION ERROR', error);
                    resolve(false);
                }
                resolve(true);
            });
        });
    }
    async me({ req }) {
        if (!req.session.userId)
            return null;
        return await User_1.User.findOneBy({ id: req.session.userId });
    }
    async forgotPassword(forgotPasswordInput) {
        const user = await User_1.User.findOneBy({
            email: forgotPasswordInput.email,
        });
        if (!user)
            return false;
        await Token_1.TokenModel.findOneAndDelete({ userId: user.id.toString() });
        const resetToken = (0, uuid_1.v4)();
        const hashedResetToken = await argon2_1.default.hash(resetToken);
        await new Token_1.TokenModel({ userId: user.id.toString(), token: hashedResetToken }).save();
        await (0, sendEmail_1.sendEmail)(forgotPasswordInput.email, `<a href="http://localhost:3000/change-password?token=${resetToken}&userId=${user.id}">Click here to reset your password</a>`);
        return true;
    }
    async changePassword(token, userId, changePasswordInput, { req }) {
        const { error } = (0, validateRegisterInput_1.validateResetPassword)(changePasswordInput);
        if (error) {
            const field = error.details.map((error) => error.path[0]).toString();
            const message = error.details.map((e) => e.message).toString();
            return {
                code: 400,
                success: false,
                message: `Invalid ${field}`,
                errors: [{ field, message }],
            };
        }
        try {
            const resetPasswordTokenRecord = await Token_1.TokenModel.findOne({ userId });
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
                };
            }
            const resetPasswordTokenValid = argon2_1.default.verify(resetPasswordTokenRecord.token, token);
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
                };
            }
            const userIdNum = parseInt(userId);
            const user = await User_1.User.findOneBy({ id: userIdNum });
            if (!user) {
                return {
                    code: 400,
                    success: false,
                    message: 'User no longer exists',
                    errors: [{ field: 'token', message: 'User no longer exists' }],
                };
            }
            const updatedPassword = await argon2_1.default.hash(changePasswordInput.newPassword);
            await User_1.User.update({ id: userIdNum }, { password: updatedPassword });
            await resetPasswordTokenRecord.deleteOne();
            req.session.userId = user.id;
            return {
                code: 200,
                success: true,
                message: 'User password reset successfully',
                user,
            };
        }
        catch (error) {
            console.log(error);
            return {
                code: 500,
                success: false,
                message: `Internal server error ${error.message}`,
            };
        }
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)((_return) => String),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_1.User, Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "email", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => UserMutationResponse_1.UserMutationResponse),
    __param(0, (0, type_graphql_1.Arg)('registerInput')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterInput_1.RegisterInput, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => UserMutationResponse_1.UserMutationResponse),
    __param(0, (0, type_graphql_1.Arg)('loginInput')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginInput_1.LoginInput, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => Boolean),
    (0, type_graphql_1.UseMiddleware)(checkAuth_1.checkAuth),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "logout", null);
__decorate([
    (0, type_graphql_1.Query)((_return) => User_1.User, { nullable: true }),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "me", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => Boolean),
    __param(0, (0, type_graphql_1.Arg)('forgotPassowrdInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ForgotPasswordInput_1.ForgotPasswordInput]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "forgotPassword", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => UserMutationResponse_1.UserMutationResponse),
    __param(0, (0, type_graphql_1.Arg)('token')),
    __param(1, (0, type_graphql_1.Arg)('userId')),
    __param(2, (0, type_graphql_1.Arg)('changePasswordInput')),
    __param(3, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ChangePasswordInput_1.ChangePasswordInput, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "changePassword", null);
exports.UserResolver = UserResolver = __decorate([
    (0, type_graphql_1.Resolver)((_of) => User_1.User)
], UserResolver);
//# sourceMappingURL=user.js.map