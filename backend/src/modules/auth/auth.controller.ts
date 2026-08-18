import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, Public } from './decorators/auth.decorators';
import { LoginDto, CreateUserDto, ChangePasswordDto } from '@dto/index';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * User registration
   * Public endpoint - anyone can register
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.authService.register(createUserDto);

      // Don't return password hash
      const { passwordHash, ...userWithoutPassword } = user;

      this.logger.log(`New user registered: ${user.email}`);

      return {
        statusCode: 201,
        message: 'User successfully registered',
        user: userWithoutPassword,
      };
    } catch (error: any) {
      this.logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  /**
   * User login with email and password
   * Returns JWT token
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const { accessToken, user, expiresIn } = await this.authService.login(
        loginDto,
      );

      // Don't return password hash
      const { passwordHash, ...userWithoutPassword } = user;

      this.logger.log(`User logged in: ${user.email}`);

      return {
        statusCode: 200,
        message: 'Successfully logged in',
        accessToken,
        user: userWithoutPassword,
        expiresIn,
      };
    } catch (error: any) {
      this.logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current user profile
   * Requires authentication
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: any) {
    try {
      const fullUser = await this.authService.getUserById(user.id);

      // Don't return password hash
      const { passwordHash, ...userWithoutPassword } = fullUser;

      return {
        statusCode: 200,
        message: 'User profile retrieved',
        user: userWithoutPassword,
      };
    } catch (error: any) {
      this.logger.error(`Get user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change password
   * Requires authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Password successfully changed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      if (!changePasswordDto.currentPassword || !changePasswordDto.newPassword) {
        throw new BadRequestException(
          'Current password and new password are required',
        );
      }

      await this.authService.changePassword(
        user.id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );

      this.logger.log(`User changed password: ${user.email}`);

      return {
        statusCode: 200,
        message: 'Password successfully changed',
      };
    } catch (error: any) {
      this.logger.error(`Change password error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout user
   * This is a client-side operation (delete token)
   * Server just returns success
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (client deletes token)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@CurrentUser() user: any) {
    this.logger.log(`User logged out: ${user.email}`);

    return {
      statusCode: 200,
      message: 'Successfully logged out. Please delete the token from your client.',
    };
  }

  /**
   * Refresh JWT token
   * Requires authentication
   */
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshToken(@CurrentUser() user: any) {
    try {
      const fullUser = await this.authService.getUserById(user.id);

      // Generate new token
      const accessToken = (this.authService as any).generateToken(fullUser);
      const expiresIn = parseInt(process.env.JWT_EXPIRATION || '86400', 10);

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return {
        statusCode: 200,
        message: 'Token refreshed',
        accessToken,
        expiresIn,
      };
    } catch (error: any) {
      this.logger.error(`Token refresh error: ${error.message}`);
      throw error;
    }
  }
}
