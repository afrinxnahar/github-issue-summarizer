import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(process.env.PORT || 3001, () => {
    console.log(
      `Server is running on http://localhost:${process.env.PORT || 3001}`,
    );
  });
}
bootstrap();
