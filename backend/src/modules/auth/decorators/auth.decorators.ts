import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to inject current user from JWT token
 * Usage: @CurrentUser() user: any
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Decorator to require specific roles
 * Usage: @Roles('PHYSICIAN', 'CLINICAL_ADMIN')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * Decorator to require specific permissions
 * Usage: @Permissions('PATIENT_READ', 'CONSULTATION_CREATE')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/**
 * Decorator to specify multiple required permissions (all must be present)
 * Usage: @RequireAllPermissions('PATIENT_READ', 'CONSULTATION_CREATE')
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  SetMetadata('requireAllPermissions', permissions);

/**
 * Decorator to skip authentication for public endpoints
 * Usage: @Public()
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * Combined decorator for common use cases
 * Usage: @PhysicianOnly()
 */
export const PhysicianOnly = () => Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN');

/**
 * Combined decorator for admin operations
 * Usage: @AdminOnly()
 */
export const AdminOnly = () => Roles('SUPER_ADMIN', 'CLINICAL_ADMIN');

/**
 * Combined decorator for audit trail
 * Usage: @AuditedAction('PATIENT_CREATED')
 */
export const AuditedAction = (action: string) =>
  SetMetadata('auditAction', action);
