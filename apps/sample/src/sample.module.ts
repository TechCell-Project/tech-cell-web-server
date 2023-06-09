import { Module } from '@nestjs/common';
import { SampleController } from './sample.controller';
import { SampleService } from './sample.service';
import { RabbitMQModule, RabbitMQService } from '@app/common';

@Module({
    imports: [RabbitMQModule],
    controllers: [SampleController],
    providers: [RabbitMQService, SampleService],
})
export class SampleModule {}