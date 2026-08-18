import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminOnly } from '../auth/decorators/auth.decorators';
import { UpdateUserDto } from '@dto/index';
import { UserStatus } from '@entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users (admin only)
   */
  @Get()
  @UseGuards(RolesGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllUsers(
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
    @Query('status') status?: UserStatus,
  ) {
    try {
      if (take > 100) {
        take = 100; // Limit maximum records
      }

      const result = await this.usersService.getAllUsers(skip, take, status);

      return {
        statusCode: 200,
        message: 'Users retrieved',
        data: result.data.map((user) => this.sanitizeUser(user)),
        pagination: {
          skip: result.skip,
          take: result.take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get users error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search users
   */
  @Get('search/:term')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Search users by email or name' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchUsers(
    @Param('term') searchTerm: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        throw new BadRequestException('Search term must be at least 2 characters');
      }

      if (take > 100) {
        take = 100;
      }

      const result = await this.usersService.searchUsers(searchTerm, skip, take);

      return {
        statusCode: 200,
        message: 'Search results',
        data: result.data.map((user) => this.sanitizeUser(user)),
        pagination: {
          skip,
          take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Search users error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') userId: string) {
    try {
      const user = await this.usersService.getUserById(userId);

      return {
        statusCode: 200,
        message: 'User retrieved',
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      this.logger.error(`Get user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user information
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'CLINICAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user information (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    try {
      const user = await this.usersService.updateUser(userId, updateUserDto);

      this.logger.log(`User updated: ${userId}`);

      return {
        statusCode: 200,
        message: 'User updated',
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      this.logger.error(`Update user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  @Put(':id/roles/:roleId')
  @UseGuards(RolesGuard)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user (admin only)' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async assignRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
  ) {
    try {
      const user = await this.usersService.assignRoleToUser(userId, roleId);

      this.logger.log(`Role assigned to user: ${userId}`);

      return {
        statusCode: 200,
        message: 'Role assigned',
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      this.logger.error(`Assign role error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  @Delete(':id/roles/:roleId')
  @UseGuards(RolesGuard)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove role from user (admin only)' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async removeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
  ) {
    try {
      const user = await this.usersService.removeRoleFromUser(userId, roleId);

      this.logger.log(`Role removed from user: ${userId}`);

      return {
        statusCode: 200,
        message: 'Role removed',
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      this.logger.error(`Remove role error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disable user account
   */
  @Put(':id/disable')
  @UseGuards(RolesGuard)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable user account (admin only)' })
  @ApiResponse({ status: 200, description: 'User disabled' })
  async disableUser(@Param('id') userId: string) {
    try {
      const user = await this.usersService.disableUser(userId);

      this.logger.log(`User disabled: ${userId}`);

      return {
        statusCode: 200,
        message: 'User account disabled',
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      this.logger.error(`Disable user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable user account
   */
  @Put(':id/enable')
  @UseGuards(RolesGuard)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable user account (admin only)' })
  @ApiResponse({ status: 200, description: 'User enabled' })
  async enableUser(@Param('id') userId: string) {
    try {
      const user = await this.usersService.enableUser(userId);

      this.logger.log(`User enabled: ${userId}`);

      return {
        statusCode: 200,
        message: 'User account enabled',
        user: this.sanitizeUser(user),
      };
    } catch (error: any) {
      this.logger.error(`Enable user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(@Param('id') userId: string) {
    try {
      await this.usersService.deleteUser(userId);

      this.logger.log(`User deleted: ${userId}`);

      return {
        statusCode: 200,
        message: 'User deleted',
      };
    } catch (error: any) {
      this.logger.error(`Delete user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper method to remove sensitive fields from user response
   */
  private sanitizeUser(user: any): any {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
