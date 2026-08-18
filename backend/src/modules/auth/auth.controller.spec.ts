import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      getUserById: jest.fn(),
      changePassword: jest.fn(),
      generateToken: jest.fn().mockReturnValue('refreshed-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should strip the password hash from the response', async () => {
      mockAuthService.register.mockResolvedValue({
        id: 'user-001',
        email: 'new@example.com',
        passwordHash: 'secret-hash',
      });

      const result = await controller.register({
        email: 'new@example.com',
        password: 'SecurePassword123',
      } as any);

      expect(result.statusCode).toBe(201);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.email).toBe('new@example.com');
    });

    it('should propagate errors from the service', async () => {
      mockAuthService.register.mockRejectedValue(new BadRequestException('taken'));

      await expect(
        controller.register({ email: 'x@x.com', password: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return an access token and user without the password hash', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        expiresIn: 86400,
        user: { id: 'user-001', email: 'user@example.com', passwordHash: 'secret-hash' },
      });

      const result = await controller.login({
        email: 'user@example.com',
        password: 'correct',
      });

      expect(result.statusCode).toBe(200);
      expect(result.accessToken).toBe('jwt-token');
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should propagate UnauthorizedException from the service', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('bad creds'));

      await expect(
        controller.login({ email: 'x@x.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user without the password hash', async () => {
      mockAuthService.getUserById.mockResolvedValue({
        id: 'user-001',
        email: 'user@example.com',
        passwordHash: 'secret-hash',
      });

      const result = await controller.getCurrentUser({ id: 'user-001' });

      expect(result.statusCode).toBe(200);
      expect((result.user as any).passwordHash).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    it('should call the service with the current user id', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        { id: 'user-001', email: 'user@example.com' },
        { currentPassword: 'OldPassword123', newPassword: 'NewPassword123' },
      );

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-001',
        'OldPassword123',
        'NewPassword123',
      );
      expect(result.statusCode).toBe(200);
    });

    it('should throw BadRequestException if either password is missing', async () => {
      await expect(
        controller.changePassword(
          { id: 'user-001', email: 'user@example.com' },
          { currentPassword: '', newPassword: '' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should return a success message without calling the service', async () => {
      const result = await controller.logout({ id: 'user-001', email: 'user@example.com' });

      expect(result.statusCode).toBe(200);
    });
  });

  describe('refreshToken', () => {
    it('should issue a new token for the current user', async () => {
      mockAuthService.getUserById.mockResolvedValue({ id: 'user-001' });

      const result = await controller.refreshToken({
        id: 'user-001',
        email: 'user@example.com',
      });

      expect(result.statusCode).toBe(200);
      expect(result.accessToken).toBe('refreshed-token');
    });
  });
});
