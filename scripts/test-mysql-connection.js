// 测试MySQL数据库连接的Node.js脚本
// 运行方式: node scripts/test-mysql-connection.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('开始测试MySQL数据库连接...\n');
  
  const config = {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: 'utf8mb4'
  };
  
  console.log('数据库配置:');
  console.log(`主机: ${config.host}`);
  console.log(`端口: ${config.port}`);
  console.log(`用户: ${config.user}`);
  console.log(`数据库: ${config.database}\n`);
  
  let connection;
  
  try {
    // 创建连接
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功!\n');
    
    // 测试基本查询
    console.log('测试基本查询...');
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log(`✅ MySQL版本: ${rows[0].version}\n`);
    
    // 检查seller_company表
    console.log('检查seller_company表...');
    try {
      const [companyRows] = await connection.execute('SELECT COUNT(*) as count FROM seller_company');
      console.log(`✅ seller_company表存在，记录数: ${companyRows[0].count}`);
    } catch (error) {
      console.log('❌ seller_company表不存在或无权限访问');
      console.log('   请运行scripts/setup-mysql-tables.sql创建表结构');
    }
    
    // 检查seller_company_lang表
    console.log('检查seller_company_lang表...');
    try {
      const [langRows] = await connection.execute('SELECT COUNT(*) as count FROM seller_company_lang');
      console.log(`✅ seller_company_lang表存在，记录数: ${langRows[0].count}`);
    } catch (error) {
      console.log('❌ seller_company_lang表不存在或无权限访问');
      console.log('   请运行scripts/setup-mysql-tables.sql创建表结构');
    }
    
    // 测试插入权限
    console.log('\n测试插入权限...');
    try {
      await connection.execute('SELECT 1 FROM seller_company LIMIT 1');
      console.log('✅ 具有SELECT权限');
      
      // 测试事务
      await connection.beginTransaction();
      await connection.rollback();
      console.log('✅ 具有事务权限');
      
    } catch (error) {
      console.log('❌ 权限测试失败:', error.message);
    }
    
    console.log('\n🎉 数据库连接测试完成!');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误信息:', error.message);
    console.error('错误代码:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('建议: 检查主机地址是否正确');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('建议: 检查用户名和密码是否正确');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('建议: 检查数据库名称是否存在');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行测试
testConnection().catch(console.error);
