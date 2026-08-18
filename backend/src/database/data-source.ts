import { DataSource, DataSourceOptions } from 'typeorm';
import { getDatabaseConfig } from '@config/database.config';

export default new DataSource(getDatabaseConfig() as DataSourceOptions);
