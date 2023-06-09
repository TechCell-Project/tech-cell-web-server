import { AuthUtilService } from './auth.util.service';
import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
    NotAcceptableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import {
    CheckEmailRequestDTO,
    ForgotPasswordDTO,
    LoginRequestDTO,
    VerifyEmailRequestDTO,
    VerifyForgotPasswordDTO,
    RegisterRequestDTO,
    NewTokenRequestDTO,
    UserDataResponseDTO,
} from '~/apps/auth/dtos';
import { User } from '@app/resource/users/schemas';
import { RpcException } from '@nestjs/microservices';
import { ConfirmEmailRegisterDTO, ForgotPasswordEmailDTO, MailEventPattern } from '~/apps/mail';
import { OtpType } from '@app/resource/otp';
import { IUserFacebookResponse, IUserGoogleResponse, ITokenVerifiedResponse } from './interfaces';
import { generateRandomString } from '@app/common';
import { MAX_PASSWORD_LENGTH } from '~/constants';

@Injectable()
export class AuthService extends AuthUtilService {
    getPing() {
        return {
            message: 'pong',
            services: 'auth',
        };
    }

    async login({ email, password }: LoginRequestDTO) {
        const user = await this.validateUser(email, password);

        if (!user) {
            throw new RpcException(
                new UnauthorizedException('Your username or password is incorrect'),
            );
        }

        if (user.block && user.block.isBlocked) {
            throw new RpcException(
                new ForbiddenException(
                    'Your account has been locked, please contact the administrator',
                ),
            );
        }

        if (!user.emailVerified) {
            const otp = await this.otpService.createOrRenewOtp({
                email,
                otpType: OtpType.VerifyEmail,
            });
            const emailContext: ConfirmEmailRegisterDTO = {
                otpCode: otp.otpCode,
            };

            this.mailService.emit(MailEventPattern.sendMailConfirm, {
                email,
                emailContext,
            });

            throw new RpcException(
                new NotAcceptableException(
                    'Email is not verified, please check your email to verify it.',
                ),
            );
        }

        return await this.buildUserTokenResponse(user);
    }

    async checkEmail({ email }: CheckEmailRequestDTO) {
        const userFound = await this.usersService.countUser({ email });

        if (userFound > 0) {
            throw new RpcException(new ConflictException('Email is already exists'));
        }

        return {
            message: 'Email is not in use',
        };
    }

    async register({ email, firstName, lastName, password, re_password }: RegisterRequestDTO) {
        let userFound: User;
        try {
            userFound = await this.usersService.getUser({
                email,
            });
        } catch (error) {
            userFound = undefined;
        }

        if (userFound || (userFound && userFound.emailVerified)) {
            throw new RpcException(new ConflictException('Email is already registered'));
        }

        if (password !== re_password) {
            throw new RpcException(new BadRequestException('Password does not match'));
        }

        userFound = await this.usersService.createUser({
            email,
            firstName,
            lastName,
            password,
        });

        return await this.sendMailOtp({
            email,
            otpType: OtpType.VerifyEmail,
            cmd: 'mail_send_confirm',
        });
    }

    async verifyEmail({ email, otpCode }: VerifyEmailRequestDTO) {
        const userFound = await this.usersService.getUser({ email });

        if (userFound.emailVerified) {
            throw new RpcException(new BadRequestException('Email is already verified'));
        }

        const isVerified = await this.otpService.verifyOtp({
            email,
            otpCode,
            otpType: OtpType.VerifyEmail,
        });

        if (!isVerified) {
            throw new RpcException(new UnprocessableEntityException('Email verify failed'));
        }

        await this.usersService.findOneAndUpdateUser({ email }, { emailVerified: isVerified });

        return {
            message: 'Email is verified, update your information now',
        };
    }

    async getNewToken({
        refreshToken: oldRefreshToken,
    }: NewTokenRequestDTO): Promise<UserDataResponseDTO> {
        try {
            if (!oldRefreshToken) {
                throw new RpcException(new BadRequestException('Refresh token is required'));
            }

            const { email } = await this.verifyRefreshToken(oldRefreshToken);
            const userFound = await this.usersService.getUser({ email });

            const { _id, email: emailUser, role } = userFound;
            const { accessToken, refreshToken } = await this.signTokens({
                _id,
                email: emailUser,
                role,
            });
            return { ...this.cleanUserBeforeResponse(userFound), accessToken, refreshToken };
        } catch (error) {
            throw new RpcException(new ForbiddenException(error.message));
        }
    }

    async forgotPassword({ email }: ForgotPasswordDTO) {
        // If not found, auto throw the exception
        const userFound = await this.usersService.getUser({ email });

        const otp = await this.otpService.createOrRenewOtp({
            email,
            otpType: OtpType.ForgotPassword,
        });

        const emailContext: ForgotPasswordEmailDTO = {
            userEmail: userFound.email,
            otpCode: otp.otpCode,
            firstName: userFound.firstName,
        };

        this.mailService.emit(MailEventPattern.sendMailForgotPassword, { ...emailContext });

        return {
            message: 'An email has already been sent to you email address, please check your email',
        };
    }

    async verifyForgotPassword({ email, otpCode, password, re_password }: VerifyForgotPasswordDTO) {
        await this.usersService.getUser({ email });

        if (password !== re_password) {
            throw new RpcException(new BadRequestException('Password does not match'));
        }

        const isVerified = await this.otpService.verifyOtp({
            email,
            otpCode,
            otpType: OtpType.ForgotPassword,
        });
        if (!isVerified) {
            throw new RpcException(new UnprocessableEntityException('Otp code does not match'));
        }

        const userUpdated = await this.usersService.changeUserPassword({ email, password });
        if (!userUpdated) {
            throw new RpcException(
                new BadRequestException('Something went wrong, please try again'),
            );
        }

        return {
            message: 'Password changed successfully',
        };
    }

    async verifyAccessToken(accessToken: string): Promise<ITokenVerifiedResponse> {
        if (!accessToken) {
            throw new RpcException(new BadRequestException('Access token missing.'));
        }

        const dataVerified = (await this.verifyToken(
            accessToken,
            this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
        )) as ITokenVerifiedResponse;

        if (await this.checkIsRequiredRefresh(dataVerified._id)) {
            throw new RpcException(new ForbiddenException('Access token is expired.'));
        }

        return dataVerified;
    }

    async verifyRefreshToken(refreshToken: string): Promise<ITokenVerifiedResponse> {
        if (!refreshToken) {
            throw new RpcException(new BadRequestException('Refresh token missing.'));
        }

        return (await this.verifyToken(
            refreshToken,
            this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
        )) as ITokenVerifiedResponse;
    }

    async googleLogin({ user }: { user: IUserGoogleResponse }) {
        if (!user) {
            throw new RpcException(new BadRequestException('Login with Google failed'));
        }

        let userFound: User | undefined = undefined;
        let newUser: User | undefined = undefined;
        try {
            // will throw exception if not found
            userFound = await this.usersService.getUser({ email: user.email });
        } catch (error) {
            // if not found, create new user
            newUser = await this.usersService.createUser({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                password: `${user.openid}${generateRandomString(
                    MAX_PASSWORD_LENGTH - user.openid.length,
                )}`,
            });
        }

        if (!userFound && !newUser) {
            throw new RpcException(new BadRequestException('Login with Google failed'));
        }

        if (userFound) {
            return this.buildUserTokenResponse(userFound);
        }

        if (newUser) {
            return this.buildUserTokenResponse(newUser);
        }
    }

    async facebookLogin({ user }: { user: IUserFacebookResponse }) {
        if (!user) {
            throw new RpcException(new BadRequestException('Login with Facebook failed'));
        }

        let userFound: User | undefined = undefined;
        let newUser: User | undefined = undefined;
        try {
            // will throw exception if not found
            userFound = await this.usersService.getUser({ email: user.email });
        } catch (error) {
            // if not found, create new user
            newUser = await this.usersService.createUser({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                password: `${user.email}${generateRandomString(
                    MAX_PASSWORD_LENGTH - user.email.length,
                )}`,
            });
        }

        if (!userFound && !newUser) {
            throw new RpcException(new BadRequestException('Login with Facebook failed'));
        }

        if (userFound) {
            return this.buildUserTokenResponse(userFound);
        }

        if (newUser) {
            return this.buildUserTokenResponse(newUser);
        }
    }
}
