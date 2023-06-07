import { Controller, Get, Inject } from '@nestjs/common';
import { SampleService } from './sample.service';
import { RabbitMQService } from '@app/common';
import { Ctx, Payload, RmqContext, MessagePattern } from '@nestjs/microservices';

@Controller()
export class SampleController {
    constructor(
        private readonly sampleService: SampleService,
        @Inject(RabbitMQService) private readonly rabbitMqService: RabbitMQService,
    ) {}

    @Get()
    getHello(): string {
        return this.sampleService.getHello();
    }

    @MessagePattern('get_sample')
    async getSample(@Ctx() context: RmqContext) {
        this.rabbitMqService.acknowledgeMessage(context);
        return { message: 'hello from sample' };
    }
}