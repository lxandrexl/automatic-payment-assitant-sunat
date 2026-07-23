import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get()
  health() {
    return {
      ok: this.conn.readyState === 1,
      db: this.conn.readyState === 1 ? 'up' : 'down',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
