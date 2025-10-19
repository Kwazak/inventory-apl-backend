require('dotenv').config();

console.log('=== LOADING DATABASE CONFIG ===');

// Helper function to parse DATABASE_URL (Railway/Heroku format)
const parseDatabaseUrl = (url) => {
  if (!url) return null;
  
  try {
    // Format: postgresql://username:password@host:port/database
    // Also supports mysql://username:password@host:port/database
    const match = url.match(/^(\w+):\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/(.+?)(\?.*)?$/);
    
    if (match) {
      const [, protocol, username, password, host, port, database] = match;
      
      // Determine dialect from protocol
      let dialect = protocol;
      if (protocol === 'postgresql' || protocol === 'postgres') {
        dialect = 'postgres';
      } else if (protocol === 'mysql') {
        dialect = 'mysql';
      }
      
      console.log('✅ DATABASE_URL parsed successfully');
      console.log(`   Dialect: ${dialect}, Host: ${host}, Database: ${database}`);
      
      return {
        dialect,
        username,
        password,
        database,
        host,
        port: parseInt(port || (dialect === 'mysql' ? '3306' : '5432'), 10)
      };
    }
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error.message);
  }
  
  return null;
};

// Try to get config from DATABASE_URL first (Railway style)
const urlConfig = parseDatabaseUrl(process.env.DATABASE_URL);

// Create configuration for each environment
const createConfig = (env) => {
  // Priority 1: Use DATABASE_URL if available
  if (urlConfig) {
    console.log(`✅ Using DATABASE_URL for ${env} environment`);
    
    return {
      username: urlConfig.username,
      password: urlConfig.password,
      database: urlConfig.database,
      host: urlConfig.host,
      port: urlConfig.port,
      dialect: urlConfig.dialect,
      timezone: '+07:00',
      logging: env === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: urlConfig.dialect === 'postgres' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {},
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: false,
      }
    };
  }
  
  // Priority 2: Use individual environment variables
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const dialect = process.env.DB_DIALECT || 'postgres';
  
  // Check if we have minimal config
  if (username && database && host) {
    console.log(`✅ Using individual DB_* variables for ${env} environment`);
    console.log(`   Host: ${host}, Database: ${database}`);
    
    return {
      username,
      password,
      database,
      host,
      port,
      dialect,
      timezone: '+07:00',
      logging: env === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: process.env.DB_SSL === 'true' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {},
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: false,
      }
    };
  }
  
  // Priority 3: Fallback to safe defaults (SQLite in-memory)
  console.warn('⚠️  WARNING: No database configuration found!');
  console.warn('⚠️  Falling back to SQLite in-memory (data will NOT persist)');
  console.warn('⚠️  Please set DATABASE_URL or DB_* environment variables in Railway');
  
  return {
    username: 'user',
    password: 'password',
    database: 'database',
    host: 'localhost',
    port: 3306,
    dialect: 'sqlite',
    storage: ':memory:', // SQLite in-memory
    timezone: '+07:00',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {},
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: false,
    }
  };
};

// Export configurations for all environments
const config = {
  development: createConfig('development'),
  test: createConfig('test'),
  production: createConfig('production'),
};

// Log final config (without sensitive data)
const env = process.env.NODE_ENV || 'development';
console.log(`Final config for ${env}:`, {
  host: config[env].host,
  port: config[env].port,
  database: config[env].database,
  dialect: config[env].dialect,
  username: config[env].username ? '***' : 'NOT SET',
});

module.exports = config;
