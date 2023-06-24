"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResetPassword = exports.validateRegisterInput = void 0;
const joi_1 = __importDefault(require("joi"));
const validateRegisterInput = (registerInput) => {
    const userSchema = joi_1.default.object({
        username: joi_1.default.string()
            .min(4)
            .regex(/^[a-zA-Z0-9]+$/)
            .required()
            .messages({
            message: 'Invalid username',
        }),
        email: joi_1.default.string().pattern(new RegExp('gmail.com')).email().required(),
        password: joi_1.default.string().min(4).max(23).required(),
    });
    return userSchema.validate(registerInput);
};
exports.validateRegisterInput = validateRegisterInput;
const validateResetPassword = (changePasswordInput) => {
    const isNewPassword = joi_1.default.object({
        newPassword: joi_1.default.string().min(4).max(23).required(),
    });
    return isNewPassword.validate(changePasswordInput);
};
exports.validateResetPassword = validateResetPassword;
//# sourceMappingURL=validateRegisterInput.js.map