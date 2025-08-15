import { createMigrationConnection } from '../lib/platform-mysql'
import { config } from 'dotenv'
import path from 'path'

// 加载环境变量
config({ path: path.join(process.cwd(), '.env.local') })

// 创建MySQL数据库和表结构
async function createMySQLSchema() {
  console.log('开始创建 MySQL 数据库和表结构...')
  
  const connection = await createMigrationConnection()
  
  try {
    // 1. 创建数据库
    console.log('创建数据库 gerenuk_platform...')
    await connection.query('CREATE DATABASE IF NOT EXISTS gerenuk_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    await connection.query('USE gerenuk_platform')
    
    // 2. 创建表结构（按依赖顺序）
    
    // 平台表
    console.log('创建 platforms 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS platforms (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(20) DEFAULT '#3b82f6',
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 项目表
    console.log('创建 projects 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        platform_id INT,
        status ENUM('active', 'completed', 'paused') DEFAULT 'active',
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 项目阶段表
    console.log('创建 project_phases 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        phase_order INT NOT NULL,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 功能模块表
    console.log('创建 feature_modules 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feature_modules (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        phase_id INT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        module_order INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (phase_id) REFERENCES project_phases (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 功能点表
    console.log('创建 feature_items 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feature_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        module_id INT NOT NULL,
        name VARCHAR(300) NOT NULL,
        description TEXT,
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        status ENUM('pending', 'in_progress', 'completed', 'testing', 'deployed', 'paused') DEFAULT 'pending',
        progress_percentage INT DEFAULT 0,
        estimated_hours DECIMAL(8,2),
        actual_hours DECIMAL(8,2),
        assignee VARCHAR(100),
        start_date DATE,
        estimated_completion_date DATE,
        actual_completion_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES feature_modules (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 进度记录表
    console.log('创建 progress_records 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS progress_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        feature_item_id INT NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        old_progress INT,
        new_progress INT,
        notes TEXT,
        updated_by VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feature_item_id) REFERENCES feature_items (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 导入记录表
    console.log('创建 import_records 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS import_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_processed INT NOT NULL DEFAULT 0,
        success_count INT NOT NULL DEFAULT 0,
        error_count INT NOT NULL DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        duration_seconds INT DEFAULT 0,
        status ENUM('processing', 'completed', 'failed') DEFAULT 'completed',
        notes TEXT,
        mysql_update_time DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 失败公司表
    console.log('创建 failed_companies 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS failed_companies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        import_record_id INT,
        company_id INT,
        company_no VARCHAR(100),
        name VARCHAR(300),
        name_en VARCHAR(300),
        country VARCHAR(100),
        province VARCHAR(100),
        province_en VARCHAR(100),
        city VARCHAR(100),
        city_en VARCHAR(100),
        county VARCHAR(100),
        county_en VARCHAR(100),
        address TEXT,
        address_en TEXT,
        business_scope TEXT,
        business_scope_en TEXT,
        contact_person VARCHAR(100),
        contact_person_en VARCHAR(100),
        contact_person_title VARCHAR(100),
        contact_person_title_en VARCHAR(100),
        mobile VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(200),
        intro TEXT,
        intro_en TEXT,
        whats_app VARCHAR(50),
        fax VARCHAR(50),
        postal_code VARCHAR(20),
        company_birth VARCHAR(50),
        is_verified TINYINT(1) DEFAULT 0,
        homepage VARCHAR(500),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        retry_count INT DEFAULT 0,
        FOREIGN KEY (import_record_id) REFERENCES import_records (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 手机号码表
    console.log('创建 phone_numbers 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS phone_numbers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        number VARCHAR(20) NOT NULL UNIQUE,
        carrier VARCHAR(50) NOT NULL,
        province VARCHAR(50),
        city VARCHAR(100),
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // SMS记录表
    console.log('创建 sms_records 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sms_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        out_id VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        carrier VARCHAR(50),
        phone_note TEXT,
        template_code VARCHAR(50),
        template_name VARCHAR(200),
        template_params TEXT,
        content TEXT,
        send_date VARCHAR(50),
        receive_date VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT '发送中',
        error_code VARCHAR(100),
        retry_count INT DEFAULT 0,
        last_retry_at DATETIME,
        auto_refresh_enabled TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 试卷表
    console.log('创建 question_sets 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS question_sets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        total_questions INT DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 题目表
    console.log('创建 questions 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        set_id INT NOT NULL,
        question_number INT NOT NULL,
        section VARCHAR(100),
        question_text TEXT NOT NULL,
        option_a VARCHAR(500) NOT NULL,
        option_b VARCHAR(500) NOT NULL,
        option_c VARCHAR(500) NOT NULL,
        option_d VARCHAR(500) NOT NULL,
        correct_answer CHAR(1) NOT NULL,
        explanation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES question_sets (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 培训记录表
    console.log('创建 training_records 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS training_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_name VARCHAR(100) NOT NULL,
        set_id INT NOT NULL,
        answers JSON NOT NULL,
        score INT NOT NULL,
        total_questions INT NOT NULL,
        started_at DATETIME NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        session_duration INT,
        FOREIGN KEY (set_id) REFERENCES question_sets (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 系统配置表
    console.log('创建 system_config 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 自动测试计划表
    console.log('创建 auto_test_plans 表...')
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auto_test_plans (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        template_id VARCHAR(100) NOT NULL,
        template_name VARCHAR(200),
        phone_numbers JSON NOT NULL,
        schedule JSON NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'inactive',
        progress JSON NOT NULL DEFAULT ('{"total":0,"completed":0,"success":0,"failed":0}'),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_run DATETIME,
        next_run DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    // 3. 创建索引
    console.log('创建索引...')
    
    const indexes = [
      'CREATE INDEX idx_out_id ON sms_records (out_id)',
      'CREATE INDEX idx_phone_number ON sms_records (phone_number)',
      'CREATE INDEX idx_status ON sms_records (status)',
      'CREATE INDEX idx_created_at ON sms_records (created_at)',
      'CREATE INDEX idx_phone_numbers_number ON phone_numbers (number)',
      'CREATE INDEX idx_phone_numbers_carrier ON phone_numbers (carrier)',
      'CREATE INDEX idx_import_records_date ON import_records (import_date)',
      'CREATE INDEX idx_failed_companies_import_id ON failed_companies (import_record_id)',
      'CREATE INDEX idx_failed_companies_company_id ON failed_companies (company_id)',
      'CREATE INDEX idx_platforms_name ON platforms (name)',
      'CREATE INDEX idx_platforms_status ON platforms (status)',
      'CREATE INDEX idx_projects_platform_id ON projects (platform_id)',
      'CREATE INDEX idx_project_phases_project_id ON project_phases (project_id)',
      'CREATE INDEX idx_feature_modules_project_id ON feature_modules (project_id)',
      'CREATE INDEX idx_feature_modules_phase_id ON feature_modules (phase_id)',
      'CREATE INDEX idx_feature_items_module_id ON feature_items (module_id)',
      'CREATE INDEX idx_feature_items_status ON feature_items (status)',
      'CREATE INDEX idx_progress_records_feature_item_id ON progress_records (feature_item_id)',
      'CREATE INDEX idx_questions_set_id ON questions (set_id)',
      'CREATE INDEX idx_questions_question_number ON questions (question_number)',
      'CREATE INDEX idx_training_records_employee_name ON training_records (employee_name)',
      'CREATE INDEX idx_training_records_set_id ON training_records (set_id)',
      'CREATE INDEX idx_training_records_completed_at ON training_records (completed_at)'
    ]
    
    for (const indexSql of indexes) {
      try {
        await connection.query(indexSql)
      } catch (error) {
        // 忽略已存在的索引错误
        if (!error.message.includes('Duplicate key name')) {
          console.warn(`创建索引时警告: ${error.message}`)
        }
      }
    }
    
    console.log('\\n=== MySQL 数据库和表结构创建完成 ===')
    console.log('数据库: gerenuk_platform')
    console.log('表数量: 15 个')
    console.log('索引数量: 23 个')
    
  } catch (error) {
    console.error('创建 MySQL 数据库和表结构失败:', error)
    throw error
  } finally {
    await connection.end()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createMySQLSchema()
    .then(() => {
      console.log('\\n✅ MySQL 数据库和表结构创建成功')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ MySQL 数据库和表结构创建失败:', error)
      process.exit(1)
    })
}

export { createMySQLSchema }