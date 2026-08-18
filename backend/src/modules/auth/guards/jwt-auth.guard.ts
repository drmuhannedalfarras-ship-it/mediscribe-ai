import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Handle JWT errors
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.path;

    if (err || !user) {
      if (info?.message === 'jwt expired') {
        this.logger.warn(`JWT expired for path: ${path}`);
        throw new UnauthorizedException('Token has expired');
      }
      if (info?.message === 'invalid token') {
        this.logger.warn(`Invalid token for path: ${path}`);
        throw new UnauthorizedException('Invalid token');
      }
      if (info?.message === 'No auth token') {
        this.logger.warn(`No auth token for path: ${path}`);
        throw new UnauthorizedException('No authentication token provided');
      }

      this.logger.warn(`Authentication failed for path: ${path}`, info?.message);
      throw err || new UnauthorizedException('Authentication failed');
    }

    return user;
  }
}
