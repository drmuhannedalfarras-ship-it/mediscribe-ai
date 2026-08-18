import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('No user found');
    }

    if (!user.roles || user.roles.length === 0) {
      this.logger.warn(`User ${user.email} has no roles`);
      throw new ForbiddenException('User has no assigned roles');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `User ${user.email} attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `User role insufficient. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
