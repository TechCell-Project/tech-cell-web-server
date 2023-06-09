import { UsersService } from '@app/resource';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
    isAdmin,
    isMod,
    isSuperAdmin,
    isUser,
    timeStringToMs,
    delStartWith,
} from '@app/common/utils';
import { RpcException } from '@nestjs/microservices';
import { User } from '@app/resource/users/schemas';
import {
    REDIS_CACHE,
    REQUIRE_USER_REFRESH,
    USERS_CACHE_PREFIX,
    USERS_ALL,
    USERS_OFFSET,
    USERS_LIMIT,
} from '~/constants';
import { Store } from 'cache-manager';
import { UserRole } from '@app/resource/users/enums';

@Injectable()
export class UsersMntUtilService {
    constructor(
        protected readonly usersService: UsersService,
        @Inject(REDIS_CACHE) protected cacheManager: Store,
    ) {}

    protected buildCacheKeyUsers({
        limit,
        offset,
        all,
    }: {
        limit?: number;
        offset?: number;
        all?: boolean;
    }) {
        const arrCacheKey = [];

        if (all) {
            return USERS_ALL;
        }

        if (limit) {
            arrCacheKey.push(`${USERS_LIMIT}_${limit}`);
        }

        if (offset) {
            arrCacheKey.push(`${USERS_OFFSET}_${offset}`);
        }

        return arrCacheKey.join('_');
    }

    /**
     *
     * @returns remove all users cache
     */
    protected async delCacheUsers() {
        return await delStartWith(USERS_CACHE_PREFIX, this.cacheManager);
    }

    /**
     * After update user, set user to cache to require user refresh their token
     * @param param0 - { user } - user to be set to cache
     * @returns return true if set successfully, otherwise throw an error
     * @example
     * REQUIRE_USER_REFRESH_{userId}
     *
     */
    protected async setUserRequiredRefresh({ user }: { user: User }) {
        await this.cacheManager.set(
            `${REQUIRE_USER_REFRESH}_${user._id}`,
            true,
            timeStringToMs(process.env.JWT_ACCESS_TOKEN_EXPIRE_TIME_STRING),
        );
        return true;
    }

    /**
     * Check if actorUser can block or unblock victimUser
     * @param param0 - { victimUser, actorUser } - victimUser is the user to be blocked, actorUser is the user who block victimUser
     * @returns return true if actorUser can block victimUser, otherwise throw an error
     */
    protected canBlockAndUnblockUser({
        victimUser,
        actorUser,
    }: {
        victimUser: User;
        actorUser: User;
    }) {
        if (victimUser._id.toString() === actorUser._id.toString()) {
            throw new RpcException(new BadRequestException('You cannot block/unblock yourself'));
        }

        if (!this.requiredHigherRole({ victimUser, actorUser })) {
            throw new RpcException(new BadRequestException('You cannot block/unblock this user'));
        }

        return true;
    }

    /**
     * Check if actorUser can change victimUser role
     * @param param0 - { victimUser, actorUser } - victimUser is the user to be changed role, actorUser is the user who change victimUser role
     * @returns return true if actorUser can change victimUser role, otherwise throw an error
     */
    protected canChangeRole({
        victimUser,
        actorUser,
        roleToChange,
    }: {
        victimUser: User;
        actorUser: User;
        roleToChange: string;
    }) {
        if (!isSuperAdmin(actorUser) && !isAdmin(actorUser)) {
            throw new RpcException(
                new ForbiddenException('You do not have permission to change roles'),
            );
        }

        if (victimUser._id.toString() === actorUser._id.toString()) {
            throw new RpcException(new BadRequestException('You cannot change your own role'));
        }

        if (isSuperAdmin(victimUser) && !isSuperAdmin(actorUser)) {
            throw new RpcException(
                new ForbiddenException('You do not have permission to change SuperAdmin role'),
            );
        }

        if (roleToChange === UserRole.SuperAdmin) {
            throw new RpcException(
                new BadRequestException('You cannot grant SuperAdmin role to anyone'),
            );
        }

        if (actorUser.role === UserRole.Admin && roleToChange === UserRole.Admin) {
            throw new RpcException(
                new ForbiddenException('You do not have permission to grant Admin role'),
            );
        }

        return true;
    }

    /**
     * Check if actorUser is higher role than victimUser
     * @param param0 - { victimUser, actorUser } - victimUser is the user to be blocked, actorUser is the user who block victimUser
     * @returns return true if actorUser is higher role than victimUser, otherwise return false
     */
    private requiredHigherRole({ victimUser, actorUser }: { victimUser: User; actorUser: User }) {
        if (isUser(actorUser)) {
            return false;
        }

        if (isSuperAdmin(victimUser)) {
            return false;
        }

        if (isAdmin(victimUser) && !isSuperAdmin(actorUser)) {
            return false;
        }

        if (isMod(victimUser) && !isSuperAdmin(actorUser) && !isAdmin(actorUser)) {
            return false;
        }

        if (
            isUser(victimUser) &&
            !isSuperAdmin(actorUser) &&
            !isAdmin(actorUser) &&
            !isMod(actorUser)
        ) {
            return false;
        }

        return true;
    }

    /**
     * Check if actorUser is Admin or Super Admin
     * @param param0 actorUser
     * @returns return true if actorUser is Admin or Super Admin, otherwise return false
     */
    private requiredAdminOrHigherRole({ actorUser }: { actorUser: User }) {
        if (!isAdmin(actorUser) && !isSuperAdmin(actorUser)) {
            return false;
        }

        return true;
    }

    /**
     * Check if actorUser is Super Admin
     * @param param0 actorUser
     * @returns return true if actorUser is Super Admin, otherwise return false
     */
    private requiredSuperAdminRole({ actorUser }: { actorUser: User }) {
        if (!isSuperAdmin(actorUser)) {
            return false;
        }

        return true;
    }
}
