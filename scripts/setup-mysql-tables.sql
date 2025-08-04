-- MySQL 8 数据库表结构
-- 用于公司数据导入功能

-- 创建seller_company表（如果不存在）
CREATE TABLE IF NOT EXISTS seller_company (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT UNIQUE NOT NULL,
    company_no VARCHAR(100),
    name VARCHAR(255),
    country VARCHAR(10),
    province VARCHAR(100),
    city VARCHAR(100),
    county VARCHAR(100),
    address TEXT,
    business_scope TEXT,
    contact_person VARCHAR(100),
    contact_person_title VARCHAR(100),
    mobile VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(100),
    intro TEXT,
    whats_app VARCHAR(50),
    fax VARCHAR(50),
    postal_code VARCHAR(20),
    company_birth VARCHAR(20),
    is_verified TINYINT DEFAULT 0,
    homepage VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_company_id (company_id),
    INDEX idx_name (name),
    INDEX idx_province (province),
    INDEX idx_city (city),
    INDEX idx_is_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建seller_company_lang表（如果不存在）
CREATE TABLE IF NOT EXISTS seller_company_lang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    province VARCHAR(100),
    city VARCHAR(100),
    county VARCHAR(100),
    address TEXT,
    business_scope TEXT,
    contact_person VARCHAR(100),
    contact_person_title VARCHAR(100),
    intro TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_company_lang (company_id, language_code),
    INDEX idx_company_id (company_id),
    INDEX idx_language_code (language_code),
    INDEX idx_name (name),
    
    FOREIGN KEY (company_id) REFERENCES seller_company(company_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入示例数据（可选）
-- INSERT IGNORE INTO seller_company (
--     company_id, name, province, city, contact_person, mobile, email, is_verified
-- ) VALUES (
--     1, '示例公司', '北京市', '北京市', '张三', '13800138000', 'example@company.com', 1
-- );

-- INSERT IGNORE INTO seller_company_lang (
--     company_id, language_code, name, province, city, contact_person
-- ) VALUES (
--     1, 'en-US', 'Example Company', 'Beijing', 'Beijing', 'Zhang San'
-- );
