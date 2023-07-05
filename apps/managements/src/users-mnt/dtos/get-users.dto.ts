import { UserRole } from '@app/resource/users/enums';
import { IsEmail, IsOptional } from 'class-validator';

class BlockSchema {
    @IsOptional()
    isBlocked?: boolean;
}

export class GetUsersDTO {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsOptional()
    limit?: number;

    @IsOptional()
    offset?: number;

    @IsOptional()
    sort?: string;

    @IsOptional()
    order?: string;

    @IsOptional()
    search?: string;

    @IsOptional()
    status?: string;

    @IsOptional()
    role?: string | UserRole;

    @IsOptional()
    isDeleted?: boolean;

    @IsOptional()
    block?: BlockSchema;

    @IsOptional()
    isVerified?: boolean;

    @IsOptional()
    emailVerified?: boolean;
}
