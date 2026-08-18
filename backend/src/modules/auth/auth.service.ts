import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '@entities/user.entity';
import { LoginDto, CreateUserDto } from '@dto/index';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly MIN_PASSWORD_LENGTH = 8;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with secure password hashing
   */
  async register(createUserDto: CreateUserDto): Promise<User> {
    // Validate input
    if (!createUserDto.email || !createUserDto.password) {
      throw new BadRequestException('Email and password are required');
    }

    // Check password strength
    if (createUserDto.password.length < this.MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`,
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existingUser) {
      this.logger.warn(`Registration attempt with existing email: ${createUserDto.email}`);
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      this.BCRYPT_ROUNDS,
    );

    // Create user
    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      specialization: createUserDto.specialization,
      licenseNumber: createUserDto.licenseNumber,
      department: createUserDto.department,
      employeeId: createUserDto.employeeId,
      passwordHash,
      status: UserStatus.ACTIVE,
      lastPasswordChangeAt: new Date(),
    });

    await this.userRepository.save(user);

    this.logger.log(`New user registered: ${user.email}`);
    return user;
  }

  /**
   * Authenticate user and return JWT token
   */
  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: User;
    expiresIn: number;
  }> {
    const { email, password } = loginDto;

    // Validate input
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    if (!user) {
      this.logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Login attempt with inactive user: ${email} (status: ${user.status})`,
      );
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const accessToken = this.generateToken(user);
    const expiresIn = parseInt(process.env.JWT_EXPIRATION || '86400', 10);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken,
      user,
      expiresIn,
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException(
        'Current password and new password are required',
      );
    }

    if (newPassword.length < this.MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `New password must be at least ${this.MIN_PASSWORD_LENGTH} characters`,
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      this.BCRYPT_ROUNDS,
    );

    // Update password
    user.passwordHash = newPasswordHash;
    user.lastPasswordChangeAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User changed password: ${user.email}`);
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error: any) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.getRoleNames(),
      permissions: this.extractPermissions(user),
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Extract all permissions from user roles
   */
  private extractPermissions(user: User): string[] {
    const permissions = new Set<string>();

    if (user.userRoles) {
      user.userRoles.forEach((userRole) => {
        if (userRole.role && userRole.role.permissions) {
          userRole.role.permissions.forEach((permission) => {
            permissions.add(permission.name);
          });
        }
      });
    }

    return Array.from(permissions);
  }

  /**
   * Get user by ID with relations
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Validate user exists and is active
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    return user;
  }
}
