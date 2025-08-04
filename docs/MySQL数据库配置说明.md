# MySQL数据库配置说明

## 概述

公司数据导入功能已从SQLite迁移到MySQL 8数据库，支持更好的并发性能和数据完整性。

## 配置步骤

### 1. 环境变量配置

在 `.env.local` 文件中配置MySQL连接参数：

```env
# MySQL数据库配置
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=agrochain_seller

# 数据库连接池配置
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0
```

### 2. 安装依赖

确保安装了MySQL驱动：

```bash
npm install mysql2
```

### 3. 数据库表结构

运行以下SQL脚本创建必要的表结构：

```sql
-- 创建seller_company表
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建seller_company_lang表
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
    FOREIGN KEY (company_id) REFERENCES seller_company(company_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 功能特性

### 1. 连接池管理
- 自动管理数据库连接池
- 支持连接重用和自动重连
- 配置连接数限制防止资源耗尽

### 2. 事务处理
- 使用MySQL事务确保数据一致性
- 支持批量操作的原子性
- 失败时自动回滚

### 3. 数据更新策略
- 使用 `ON DUPLICATE KEY UPDATE` 语法
- 支持插入新记录或更新现有记录
- 自动处理中英文数据分离

### 4. 连接测试
- 提供数据库连接测试API
- 实时显示连接状态和表记录数
- 便于排查连接问题

## API接口

### 1. 数据导入接口
```
POST /api/supplier-import
```

### 2. 连接测试接口
```
GET /api/test-mysql
```

## 使用方法

### 1. 测试数据库连接
1. 访问公司数据导入页面
2. 点击"测试数据库连接"按钮
3. 查看连接状态和表记录数

### 2. 导入数据
1. 确保数据库连接正常
2. 下载Excel模板
3. 填写公司数据
4. 上传文件并确认导入

## 技术优势

### 相比SQLite的优势
1. **并发性能**：支持多用户同时操作
2. **数据完整性**：外键约束和事务支持
3. **扩展性**：支持大数据量和复杂查询
4. **备份恢复**：企业级备份和恢复方案
5. **监控管理**：丰富的监控和管理工具

### MySQL 8特性
1. **JSON支持**：原生JSON数据类型
2. **窗口函数**：高级分析查询
3. **CTE支持**：公共表表达式
4. **性能优化**：查询优化器改进
5. **安全增强**：默认加密和认证

## 故障排除

### 常见问题

1. **连接超时**
   - 检查网络连接
   - 验证主机地址和端口
   - 确认防火墙设置

2. **认证失败**
   - 验证用户名和密码
   - 检查用户权限
   - 确认数据库存在

3. **表不存在**
   - 运行建表SQL脚本
   - 检查数据库名称
   - 验证表权限

4. **字符编码问题**
   - 确保使用utf8mb4字符集
   - 检查连接字符集配置
   - 验证数据编码

### 调试方法

1. **查看连接状态**
   ```
   GET /api/test-mysql
   ```

2. **检查服务器日志**
   - 查看Next.js控制台输出
   - 检查MySQL错误日志

3. **验证环境变量**
   - 确认.env.local文件配置
   - 检查变量名称拼写

## 性能优化

### 1. 索引优化
- company_id主键索引
- 常用查询字段索引
- 复合索引优化

### 2. 连接池配置
- 根据并发需求调整连接数
- 设置合适的超时时间
- 监控连接使用情况

### 3. 查询优化
- 使用批量操作
- 避免N+1查询问题
- 合理使用事务

这个MySQL配置为公司数据导入功能提供了企业级的数据库支持，确保了数据的安全性、一致性和高性能。
