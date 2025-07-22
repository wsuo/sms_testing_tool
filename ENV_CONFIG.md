# 环境变量配置

## 阿里云AccessKey配置

为了使用阿里云SMS SDK查询短信状态，需要配置以下环境变量：

1. 复制 `.env.example` 文件为 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```

2. 在 `.env.local` 文件中填入你的阿里云AccessKey：
   ```
   ALIYUN_ACCESS_KEY_ID=你的AccessKey_ID
   ALIYUN_ACCESS_KEY_SECRET=你的AccessKey_Secret
   ```

## 获取阿里云AccessKey

1. 登录阿里云控制台
2. 访问 **访问控制** > **AccessKey管理**
3. 创建或获取已有的AccessKey ID和Secret
4. 确保该AccessKey具有短信服务的相关权限

## 权限要求

AccessKey需要以下权限：
- `dysms:QuerySendDetails` - 查询短信发送详情

## 安全注意事项

- 不要将AccessKey提交到代码仓库
- `.env.local` 文件已在 `.gitignore` 中被忽略
- 定期轮换AccessKey以提高安全性