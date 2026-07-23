import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

// Errores estilo RFC-7807 { status, title, detail } (SPEC §5).
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let title = 'Error interno';
    let detail = 'Ocurrió un error inesperado';
    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      title = exception.name;
      detail = typeof r === 'string' ? r : ((r as { message?: unknown }).message as string) ?? title;
      if (Array.isArray(detail)) detail = detail.join('; ');
    }
    res.status(status).json({ status, title, detail });
  }
}
