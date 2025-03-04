import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { globalPrefix } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // Enable CORS
  });
  
  app.setGlobalPrefix(globalPrefix);
  app.useWebSocketAdapter(new WsAdapter(app));

  // Use port 3001 instead of 3000 to avoid conflicts
  const port = 3001;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
