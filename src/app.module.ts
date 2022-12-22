import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bull';
import { VideoProcessor } from './processors/video';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, VideoProcessor],
})
export class AppModule {}
