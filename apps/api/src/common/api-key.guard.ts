import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

// SPEC §5: header X-Api-Key en TODA ruta mutante; los GET quedan libres (red interna).
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKey: string) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    if (req.header('x-api-key') === this.apiKey) return true;
    throw new UnauthorizedException('X-Api-Key inválida o ausente');
  }
}
