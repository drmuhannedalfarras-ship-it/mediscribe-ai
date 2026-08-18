import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserRolesTimestamps1692474000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('user_roles', [
      new TableColumn({ name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }),
      new TableColumn({ name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('user_roles', ['createdAt', 'updatedAt']);
  }
}
