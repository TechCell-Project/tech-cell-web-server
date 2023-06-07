import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const port = process.env.API_PORT || 8000;
    const app = await NestFactory.create(AppModule);
    await app.listen(port);
    console.log(`Starting api gateway, listening on http://localhost:${port}`);
}
bootstrap();