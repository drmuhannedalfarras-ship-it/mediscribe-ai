import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserStatus } from '@entities/user.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '',
    status: UserStatus.ACTIVE,
    userRoles: [],
    fullName: 'Test User',
    getRoleNames: () => ['PHYSICIAN'],
  };

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(() => 'test-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...mockUser,
        email: createUserDto.email,
      });
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
      });

      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed-password');

      const result = await service.register(createUserDto);

      expect(result.email).toBe(createUserDto.email);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if password is too short', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.register(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if email is missing', async () => {
      const createUserDto = {
        email: '',
        password: 'SecurePassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      await expect(service.register(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).toBeDefined();
      expect(result.expiresIn).toBeDefined();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'SecurePassword123',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
      };

      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if email is missing', async () => {
      const loginDto = {
        email: '',
        password: 'SecurePassword123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should update lastLoginAt timestamp', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
      };

      const userCopy = { ...mockUser };
      mockUserRepository.findOne.mockResolvedValue(userCopy);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      await service.login(loginDto);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const userId = '1';
      const currentPassword = 'OldPassword123';
      const newPassword = 'NewPassword123';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(async () => true);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => 'new-hashed-password');

      await service.changePassword(userId, currentPassword, newPassword);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'new-hashed-password',
        }),
      );
    });

    it('should throw BadRequestException if passwords are the same', async () => {
      const userId = '1';
      const password = 'SamePassword123';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(userId, password, password),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      const userId = '1';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(async () => false);

      await expect(
        service.changePassword(userId, 'WrongPassword', 'NewPassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', () => {
      const token = 'valid-token';
      const payload = { sub: '1', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(payload);

      const result = service.validateToken(token);

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid token', () => {
      const token = 'invalid-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.validateToken(token)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById('1');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('999')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if active', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('1');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.validateUser('1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
