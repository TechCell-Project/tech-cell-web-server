import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

import { MongodbModule } from '@app/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersRepository } from './users.repository';

@Module({
    imports: [MongodbModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
    controllers: [],
    providers: [UsersService, UsersRepository],
    exports: [UsersService],
})
export class UsersModule {}
