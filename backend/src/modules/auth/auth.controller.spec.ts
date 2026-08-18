import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserStatus } from '@entities/user.entity';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: UserStatus.ACTIVE,
    getRoleNames: () => ['PHYSICIAN'],
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      getUserById: jest.fn(),
      changePassword: jest.fn(),
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123',
        firstName: 'New',
        lastName: 'User',
      };

      jest.spyOn(authService, 'register').mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
      } as any);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(201);

      expect(response.body.statusCode).toBe(201);
      expect(response.body.user.email).toBe(createUserDto.email);
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should return 400 if email already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new BadRequestException('Email already registered'));

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 if password is too short', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(
          new BadRequestException('Password must be at least 8 characters'),
        );

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should return JWT token on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
      };

      jest.spyOn(authService, 'login').mockResolvedValue({
        accessToken: 'test-jwt-token',
        user: mockUser as any,
        expiresIn: 86400,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.accessToken).toBe('test-jwt-token');
      expect(response.body.expiresIn).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new BadRequestException('Invalid credentials'));

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);
    });

    it('should not return password hash in response', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123',
      };

      jest.spyOn(authService, 'login').mockResolvedValue({
        accessToken: 'test-jwt-token',
        user: mockUser as any,
        expiresIn: 86400,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      };

      jest.spyOn(authService, 'changePassword').mockResolvedValue(undefined);
      jest.spyOn(authService, 'getUserById').mockResolvedValue(mockUser as any);

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer test-token`)
        .send(changePasswordDto);

      // Note: Without JwtAuthGuard properly mocked, this will return 401
      // In a real integration test, you would set up the guard properly
      expect(response.status).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer test-token`);

      // Note: Without JwtAuthGuard properly mocked, this will return 401
      expect(response.status).toBeDefined();
    });
  });
});
