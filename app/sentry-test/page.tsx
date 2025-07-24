"use client"

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function SentryTestPage() {
  const [testResult, setTestResult] = useState<string>("");
  const [sentryStatus, setSentryStatus] = useState<string>("");

  useEffect(() => {
    // 检查 Sentry 状态
    const checkSentryStatus = () => {
      console.log('🔍 检查 Sentry 状态...');
      
      try {
        // 在 @sentry/nextjs 中使用正确的 API
        console.log('📊 检查 Sentry 对象:', Sentry);
        console.log('🔍 可用的 Sentry 方法:', Object.keys(Sentry));
        
        // 尝试获取客户端
        const client = Sentry.getClient();
        console.log('📊 Sentry 客户端:', client);
        
        if (client) {
          setSentryStatus("✅ Sentry 客户端已初始化");
          console.log('✅ Sentry 客户端状态正常');
          
          const options = client.getOptions();
          console.log('⚙️ Sentry 配置:', options);
          console.log('🔗 DSN:', options?.dsn);
          console.log('🏷️ 环境:', options?.environment);
          console.log('🐛 Debug 模式:', options?.debug);
        } else {
          setSentryStatus("❌ Sentry 客户端未初始化");
          console.error('❌ Sentry 客户端未找到');
        }
      } catch (error) {
        setSentryStatus("❌ 检查 Sentry 状态时出错: " + (error as Error).message);
        console.error('❌ 检查 Sentry 状态失败:', error);
      }
    };

    checkSentryStatus();
  }, []);

  const testBasicError = () => {
    try {
      setTestResult("发送基础错误测试...");
      console.log('🧪 开始基础错误测试');
      
      const error = new Error("这是一个基础测试错误");
      console.log('📤 正在捕获错误:', error);
      
      const eventId = Sentry.captureException(error);
      console.log('✅ 错误已发送到 captureException，事件ID:', eventId);
      
      setTestResult(`✅ 基础错误已发送到 Sentry，事件ID: ${eventId}`);
    } catch (error) {
      console.error('❌ 测试基础错误失败:', error);
      setTestResult("❌ 测试失败: " + (error as Error).message);
    }
  };

  const testManualMessage = () => {
    try {
      console.log('🧪 开始手动消息测试');
      
      console.log('📤 发送手动消息到 Sentry');
      const eventId = Sentry.captureMessage("这是一个手动测试消息", "info");
      console.log('✅ 消息已发送到 captureMessage，事件ID:', eventId);
      
      setTestResult(`✅ 手动消息已发送到 Sentry，事件ID: ${eventId}`);
    } catch (error) {
      console.error('❌ 测试手动消息失败:', error);
      setTestResult("❌ 测试失败: " + (error as Error).message);
    }
  };

  const testWithContext = () => {
    try {
      console.log('🧪 开始上下文错误测试');
      
      console.log('📤 发送带上下文的错误到 Sentry');
      
      const eventId = Sentry.withScope((scope) => {
        scope.setTag("test", "context-test");
        scope.setUser({ id: "test-user" });
        scope.setContext("test-data", {
          testType: "context-test",
          timestamp: new Date().toISOString()
        });
        console.log('🎯 作用域设置完成，发送错误');
        return Sentry.captureException(new Error("这是一个带上下文的测试错误"));
      });
      
      console.log('✅ 带上下文的错误已发送，事件ID:', eventId);
      setTestResult(`✅ 带上下文的错误已发送到 Sentry，事件ID: ${eventId}`);
    } catch (error) {
      console.error('❌ 测试上下文错误失败:', error);
      setTestResult("❌ 测试失败: " + (error as Error).message);
    }
  };

  const testUnhandledError = () => {
    setTestResult("发送未处理错误测试...");
    console.log('🧪 开始未处理错误测试');
    
    // 这将触发未处理的错误
    setTimeout(() => {
      console.log('💥 触发未处理错误');
      throw new Error("这是一个未处理的异步错误");
    }, 100);
    setTestResult("✅ 未处理错误已触发");
  };

  const testSentryHealth = () => {
    try {
      console.log('🏥 开始 Sentry 健康检查');
      
      // 检查 Sentry 基本功能
      console.log('🔍 Sentry 对象:', Sentry);
      console.log('🔍 可用方法:', Object.keys(Sentry));
      
      // 检查客户端
      const client = Sentry.getClient();
      console.log('🔍 Client:', client);
      
      if (client) {
        const options = client.getOptions();
        console.log('⚙️ 客户端配置:', {
          dsn: options.dsn,
          environment: options.environment,
          debug: options.debug,
          enabled: options.enabled
        });
        
        // 尝试发送一个简单的消息
        console.log('📤 发送健康检查消息');
        const eventId = Sentry.captureMessage("Sentry 健康检查", "info");
        console.log('📨 事件ID:', eventId);
        
        setTestResult(`✅ Sentry 健康检查完成，事件ID: ${eventId}`);
      } else {
        console.log('❌ 无法获取 Sentry 客户端');
        
        // 即使没有客户端，也尝试发送消息
        console.log('📤 尝试直接发送消息');
        const eventId = Sentry.captureMessage("直接发送的健康检查消息", "info");
        console.log('📨 直接发送的事件ID:', eventId);
        
        setTestResult(`⚠️ 客户端未检测到，但尝试发送消息，事件ID: ${eventId}`);
      }
    } catch (error) {
      console.error('❌ Sentry 健康检查失败:', error);
      setTestResult("❌ 健康检查失败: " + (error as Error).message);
    }
  };

  const checkIfSentryLoaded = () => {
    console.log('🔍 检查 Sentry 是否已加载...');
    console.log('- window.Sentry:', (window as any).Sentry);
    console.log('- Sentry 模块:', Sentry);
    
    // 尝试简单的 API 调用
    try {
      const eventId = Sentry.captureMessage("加载检查消息", "debug");
      console.log('✅ 基本 API 调用成功，事件ID:', eventId);
      setTestResult(`✅ Sentry API 调用成功，事件ID: ${eventId}`);
    } catch (error) {
      console.error('❌ Sentry API 调用失败:', error);
      setTestResult("❌ Sentry API 调用失败: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Sentry 测试页面</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Sentry 状态</h2>
          <div className="p-3 bg-gray-100 rounded">
            {sentryStatus || "检查中..."}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">测试状态</h2>
          <div className="p-3 bg-gray-100 rounded">
            {testResult || "准备测试..."}
          </div>
        </div>
        
        <div className="space-y-4">
          <Button
            onClick={checkIfSentryLoaded}
            variant="default"
            className="w-full"
          >
            0. 检查 Sentry 是否加载
          </Button>
          
          <Button
            onClick={testSentryHealth}
            variant="default"
            className="w-full"
          >
            1. Sentry 健康检查
          </Button>
          
          <Button
            onClick={testBasicError}
            variant="destructive"
            className="w-full"
          >
            2. 测试基础错误捕获
          </Button>
          
          <Button
            onClick={testManualMessage}
            variant="outline"
            className="w-full"
          >
            3. 测试手动消息发送
          </Button>
          
          <Button
            onClick={testWithContext}
            variant="secondary"
            className="w-full"
          >
            4. 测试带上下文的错误
          </Button>
          
          <Button
            onClick={testUnhandledError}
            variant="destructive"
            className="w-full"
          >
            5. 测试未处理错误
          </Button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">调试信息</h2>
          <div className="space-y-2 text-sm">
            <p><strong>DSN:</strong> https://bbfef629619156e66eb300d8908d9886@o4509721309216768.ingest.us.sentry.io/4509721382944768</p>
            <p><strong>项目:</strong> sms_testing_tool</p>
            <p><strong>组织:</strong> bma-ct</p>
            <p><strong>Debug 模式:</strong> 已启用</p>
          </div>
          
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">
              <strong>问题诊断:</strong><br/>
              检测到 getCurrentHub API 错误，已修复为使用正确的 Sentry Next.js API
            </p>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>检查步骤:</strong><br/>
              1. 打开浏览器开发者工具的控制台<br/>
              2. 先点击 "检查 Sentry 是否加载" 按钮<br/>
              3. 查看控制台中的详细调试信息<br/>
              4. 再点击其他测试按钮<br/>
              5. 检查网络面板是否有发送到 Sentry 的请求<br/>
              6. 检查 Sentry 控制台是否收到事件
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}