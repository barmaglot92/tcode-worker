import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('pong')
  getPong() {
    console.log('pong');
  }

  @MessagePattern('run')
  runProcess({ videoUrl }: { videoUrl: string }) {
    console.log('run', videoUrl);
  }
}
