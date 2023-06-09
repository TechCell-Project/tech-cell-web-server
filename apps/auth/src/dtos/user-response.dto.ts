import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@app/resource/users/enums';
import { AddressSchemaDTO } from '@app/resource/users/dtos';

export class UserDataResponseDTO {
    @ApiProperty({
        example: '6487d9e0949d97a9ba8bffff',
    })
    @Type(() => String)
    @IsNotEmpty()
    _id: string | Types.ObjectId;

    @ApiProperty({ type: String, format: 'email' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ type: [AddressSchemaDTO] })
    @IsArray()
    @IsOptional()
    address?: AddressSchemaDTO[];

    @ApiProperty({ enum: UserRole, example: UserRole.User })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role?: UserRole | string;

    @ApiProperty({ type: String, example: 'the-access-token' })
    @IsString()
    accessToken: string;

    @ApiProperty({ type: String, example: 'the-refresh-token' })
    @IsString()
    refreshToken: string;

    constructor(partial: Partial<UserDataResponseDTO>) {
        Object.assign(this, partial);
    }
}
