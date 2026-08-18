import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role, UserRole, UserStatus } from '@entities/index';
import { UpdateUserDto } from '@dto/index';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  /**
   * Get all users with pagination
   */
  async getAllUsers(
    skip: number = 0,
    take: number = 20,
    status?: UserStatus,
  ): Promise<{
    data: User[];
    total: number;
    skip: number;
    take: number;
  }> {
    const query = this.userRepository.createQueryBuilder('user');

    if (status) {
      query.where('user.status = :status', { status });
    }

    const [data, total] = await query
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .skip(skip)
      .take(take)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, skip, take };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['userRoles', 'userRoles.role', 'userRoles.role.permissions'],
    });
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(userId);

    // Update only provided fields
    if (updateUserDto.firstName) {
      user.firstName = updateUserDto.firstName;
    }
    if (updateUserDto.lastName) {
      user.lastName = updateUserDto.lastName;
    }
    if (updateUserDto.specialization) {
      user.specialization = updateUserDto.specialization;
    }
    if (updateUserDto.department) {
      user.department = updateUserDto.department;
    }
    if (updateUserDto.status) {
      user.status = updateUserDto.status;
    }

    await this.userRepository.save(user);

    this.logger.log(`User updated: ${user.email}`);

    return user;
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<User> {
    const user = await this.getUserById(userId);
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role not found: ${roleId}`);
    }

    // Check if user already has this role
    const existingUserRole = await this.userRoleRepository.findOne({
      where: {
        userId,
        roleId,
      },
    });

    if (existingUserRole) {
      throw new BadRequestException(
        `User already has role: ${role.name}`,
      );
    }

    // Create user-role relationship
    const userRole = this.userRoleRepository.create({
      user,
      role,
    });

    await this.userRoleRepository.save(userRole);

    this.logger.log(`Role assigned to user ${user.email}: ${role.name}`);

    return this.getUserById(userId);
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<User> {
    const user = await this.getUserById(userId);

    const userRole = await this.userRoleRepository.findOne({
      where: {
        userId,
        roleId,
      },
      relations: ['role'],
    });

    if (!userRole) {
      throw new NotFoundException(
        `User does not have this role`,
      );
    }

    await this.userRoleRepository.remove(userRole);

    this.logger.log(
      `Role removed from user ${user.email}: ${userRole.role.name}`,
    );

    return this.getUserById(userId);
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.getUserById(userId);

    return user.userRoles?.map((ur) => ur.role) || [];
  }

  /**
   * Disable user account
   */
  async disableUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);

    this.logger.log(`User disabled: ${user.email}`);

    return user;
  }

  /**
   * Enable user account
   */
  async enableUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);

    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    this.logger.log(`User enabled: ${user.email}`);

    return user;
  }

  /**
   * Search users
   */
  async searchUsers(
    searchTerm: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: User[];
    total: number;
  }> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where(
        'user.email ILIKE :searchTerm OR user.firstName ILIKE :searchTerm OR user.lastName ILIKE :searchTerm',
        { searchTerm: `%${searchTerm}%` },
      )
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .skip(skip)
      .take(take)
      .orderBy('user.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);

    await this.userRepository.softRemove(user);

    this.logger.log(`User deleted: ${user.email}`);
  }

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: string): Promise<User[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { roleId },
      relations: ['user'],
    });

    return userRoles.map((ur) => ur.user);
  }
}
