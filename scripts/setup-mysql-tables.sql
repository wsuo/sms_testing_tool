-- MySQL 8 数据库表结构
-- 用于公司数据导入功能

-- 创建seller_company表（如果不存在）
-- 注意：这个脚本仅供参考，实际表结构请以现有数据库为准
CREATE TABLE IF NOT EXISTS seller_company (
    company_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '公司ID',
    company_no VARCHAR(100) DEFAULT '' COMMENT '公司编号',
    name VARCHAR(100) DEFAULT '' COMMENT '企业名称',
    country VARCHAR(20) DEFAULT '' COMMENT '国家',
    province VARCHAR(20) DEFAULT '' COMMENT '省份',
    city VARCHAR(20) DEFAULT '' COMMENT '城市',
    county VARCHAR(50) DEFAULT '' COMMENT '县',
    address VARCHAR(255) DEFAULT '' COMMENT '地址',
    business_scope VARCHAR(255) DEFAULT '' COMMENT '经营范围',
    contact_person VARCHAR(100) DEFAULT '' COMMENT '联系人',
    contact_person_title VARCHAR(255) DEFAULT '' COMMENT '职务',
    mobile VARCHAR(100) DEFAULT '' COMMENT '手机',
    phone VARCHAR(100) DEFAULT '' COMMENT '电话',
    email VARCHAR(200) DEFAULT '' COMMENT '邮箱',
    intro VARCHAR(1000) DEFAULT '' COMMENT '简介',
    whats_app VARCHAR(255) DEFAULT '' COMMENT 'WhatsApp',
    fax VARCHAR(50) DEFAULT '' COMMENT '传真',
    postal_code VARCHAR(20) DEFAULT '' COMMENT '邮编',
    company_birth INT DEFAULT NULL COMMENT '成立年份',
    is_verified TINYINT DEFAULT 0 COMMENT '是否认证',
    homepage VARCHAR(200) DEFAULT '' COMMENT '网址',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted BIT(1) DEFAULT b'0' COMMENT '删除',

    PRIMARY KEY (company_id),
    UNIQUE KEY name (name),
    INDEX idx_is_verified (is_verified),
    INDEX idx_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='农药生产公司表';

-- 创建seller_company_lang表（如果不存在）
-- 注意：这个脚本仅供参考，实际表结构请以现有数据库为准
CREATE TABLE IF NOT EXISTS seller_company_lang (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
    company_id BIGINT NOT NULL COMMENT '公司ID',
    language_code VARCHAR(10) DEFAULT '' COMMENT '语言代码',
    name VARCHAR(200) DEFAULT '' COMMENT '公司名称',
    intro VARCHAR(500) DEFAULT '' COMMENT '简介',
    address VARCHAR(200) DEFAULT '' COMMENT '地址',
    business_scope VARCHAR(200) DEFAULT '' COMMENT '经营范围',
    contact_person VARCHAR(20) DEFAULT '' COMMENT '联系人',
    contact_person_title VARCHAR(20) DEFAULT '' COMMENT '联系人职位',
    province VARCHAR(20) DEFAULT '' COMMENT '省份',
    city VARCHAR(20) DEFAULT '' COMMENT '城市',
    country VARCHAR(20) DEFAULT '' COMMENT '国家',
    county VARCHAR(50) DEFAULT '' COMMENT '县',
    deleted BIT(1) DEFAULT b'0' COMMENT '删除',

    PRIMARY KEY (id),
    KEY company_id (company_id, language_code),
    KEY deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公司信息的多语言版本表';

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
