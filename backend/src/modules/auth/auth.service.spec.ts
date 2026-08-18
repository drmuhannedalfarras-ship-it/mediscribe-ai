import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserStatus } from '@entities/user.entity';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUserRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'New.User@Example.com',
      password: 'SecurePassword123',
      firstName: 'New',
      lastName: 'User',
    } as any;

    it('should hash the password and store a lowercased email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUserRepository.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.register(dto);

      expect(result.email).toBe('new.user@example.com');
      expect(result.passwordHash).toBe('hashed-password');
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw BadRequestException if email or password is missing', async () => {
      await expect(service.register({ email: 'x@x.com' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if the password is too short', async () => {
      await expect(
        service.register({ ...dto, password: 'short' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the email is already registered', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const activeUser = {
      id: 'user-001',
      email: 'user@example.com',
      passwordHash: 'hashed',
      status: UserStatus.ACTIVE,
      getRoleNames: () => ['PHYSICIAN'],
      userRoles: [],
    };

    it('should return an access token for valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.login({
        email: 'USER@example.com',
        password: 'correct',
      });

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user).toBe(activeUser);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-001', roles: ['PHYSICIAN'] }),
      );
    });

    it('should throw UnauthorizedException if email or password is missing', async () => {
      await expect(service.login({ email: '', password: '' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if the user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if the user is not active', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...activeUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if the password is wrong', async () => {
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const user = { id: 'user-001', passwordHash: 'old-hash' };

    it('should hash and store the new password', async () => {
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockUserRepository.save.mockImplementation((u: any) => Promise.resolve(u));

      await service.changePassword('user-001', 'OldPassword123', 'NewPassword123');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'new-hash' }),
      );
    });

    it('should throw BadRequestException if either password is missing', async () => {
      await expect(
        service.changePassword('user-001', '', 'NewPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the new password is too short', async () => {
      await expect(
        service.changePassword('user-001', 'OldPassword123', 'short'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the new password matches the current one', async () => {
      await expect(
        service.changePassword('user-001', 'SamePassword123', 'SamePassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if the user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', 'OldPassword123', 'NewPassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if the current password is wrong', async () => {
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-001', 'WrongPassword123', 'NewPassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should return the decoded payload for a valid token', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-001' });

      const result = service.validateToken('valid-token');

      expect(result).toEqual({ sub: 'user-001' });
    });

    it('should throw UnauthorizedException for an invalid token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('bad token');
      });

      expect(() => service.validateToken('invalid-token')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getUserById', () => {
    it('should return the user when found', async () => {
      const user = { id: 'user-001' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.getUserById('user-001');

      expect(result).toBe(user);
    });

    it('should throw UnauthorizedException when not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return the user if active', async () => {
      const user = { id: 'user-001', status: UserStatus.ACTIVE };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser('user-001');

      expect(result).toBe(user);
    });

    it('should throw UnauthorizedException if the user is not active', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-001',
        status: UserStatus.SUSPENDED,
      });

      await expect(service.validateUser('user-001')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
