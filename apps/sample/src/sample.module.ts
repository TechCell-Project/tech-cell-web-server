import { Module } from '@nestjs/common';
import { SampleController } from './sample.controller';
import { SampleService } from './sample.service';
import { RabbitMQModule, RabbitMQService, DiscordModule } from '@app/common';
import { RedisCacheModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        RabbitMQModule,
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: './.env',
        }),
        RedisCacheModule,
        DiscordModule,
    ],
    controllers: [SampleController],
    providers: [RabbitMQService, SampleService],
})
export class SampleModule {}
