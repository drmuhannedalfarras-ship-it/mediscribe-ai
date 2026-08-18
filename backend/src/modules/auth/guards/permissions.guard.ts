import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    // If no permissions are specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('No user found');
    }

    if (!user.permissions || user.permissions.length === 0) {
      this.logger.warn(`User ${user.email} has no permissions`);
      throw new ForbiddenException('User has no assigned permissions');
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        `User ${user.email} attempted to access endpoint requiring permissions: ${requiredPermissions.join(', ')}`,
      );
      throw new ForbiddenException(
        `User permission insufficient. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
