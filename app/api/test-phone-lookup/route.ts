import { NextRequest, NextResponse } from 'next/server'
import { phoneLookupService } from '@/lib/phone-lookup'

// GET - 测试页面
export async function GET(request: NextRequest) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>电话号码查询服务测试</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 5px; }
        .result { background: #f5f5f5; padding: 10px; margin-top: 10px; white-space: pre-wrap; }
        input, button { padding: 8px; margin: 5px; }
        button { background: #007cba; color: white; border: none; cursor: pointer; border-radius: 3px; }
        button:hover { background: #005a87; }
        .provider { padding: 5px; margin: 2px; border-radius: 3px; }
        .provider.available { background: #d4edda; color: #155724; }
        .provider.unavailable { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>电话号码查询服务测试</h1>
        
        <div class="test-section">
            <h3>服务状态</h3>
            <button onclick="checkStatus()">检查服务状态</button>
            <div id="status-result" class="result"></div>
        </div>
        
        <div class="test-section">
            <h3>单个查询测试</h3>
            <input type="text" id="single-phone" placeholder="输入手机号码" value="13800138000">
            <button onclick="testSingle()">查询</button>
            <div id="single-result" class="result"></div>
        </div>
        
        <div class="test-section">
            <h3>批量查询测试</h3>
            <textarea id="batch-phones" placeholder="每行一个手机号码" rows="5" style="width: 300px;">13800138000
17613231911
18900000000
13312345678
15512345678</textarea>
            <button onclick="testBatch()">批量查询</button>
            <div id="batch-result" class="result"></div>
        </div>
        
        <div class="test-section">
            <h3>缓存管理</h3>
            <button onclick="clearCache()">清空缓存</button>
            <div id="cache-result" class="result"></div>
        </div>
    </div>

    <script>
        async function checkStatus() {
            try {
                const response = await fetch('/api/phone-numbers/lookup/status');
                const data = await response.json();
                
                let html = 'Provider状态:\\n';
                data.data.providers.forEach(p => {
                    const status = p.available ? 'available' : 'unavailable';
                    const text = p.available ? '可用' : '不可用';
                    html += '\\n' + p.name + ': ' + text + ' (优先级:' + p.priority + ', 批量:' + (p.canBatch ? '支持' : '不支持') + ')';
                });
                
                html += '\\n\\n缓存状态: 大小=' + data.data.cache.size + ', 启用=' + (data.data.cache.enabled ? '是' : '否');
                
                document.getElementById('status-result').textContent = html;
            } catch (error) {
                document.getElementById('status-result').textContent = '错误: ' + error.message;
            }
        }
        
        async function testSingle() {
            const phone = document.getElementById('single-phone').value;
            try {
                const start = Date.now();
                const response = await fetch('/api/phone-numbers/lookup', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({phoneNumber: phone})
                });
                const data = await response.json();
                const duration = Date.now() - start;
                
                let result = '查询时间: ' + duration + 'ms\\n\\n';
                if (data.success) {
                    result += '查询成功\\n';
                    result += 'Provider: ' + data.data.provider + '\\n';
                    result += '运营商: ' + data.data.carrier + '\\n';
                    result += '省份: ' + data.data.province + '\\n';
                    result += '城市: ' + data.data.city + '\\n';
                    result += '备注: ' + data.data.note;
                } else {
                    result += '查询失败: ' + data.error;
                }
                
                document.getElementById('single-result').textContent = result;
            } catch (error) {
                document.getElementById('single-result').textContent = '错误: ' + error.message;
            }
        }
        
        async function testBatch() {
            const phones = document.getElementById('batch-phones').value.split('\\n').filter(p => p.trim());
            try {
                const start = Date.now();
                const response = await fetch('/api/phone-numbers/lookup/batch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({phoneNumbers: phones})
                });
                const data = await response.json();
                const duration = Date.now() - start;
                
                let result = '查询时间: ' + duration + 'ms\\n';
                result += '总数: ' + data.data.totalCount + ', 成功: ' + data.data.successCount + ', 失败: ' + data.data.failureCount + '\\n\\n';
                
                data.data.results.forEach(r => {
                    result += r.phoneNumber + ': ';
                    if (r.success) {
                        result += r.data.carrier + ' (' + r.provider + ')\\n';
                    } else {
                        result += '失败 - ' + r.error + '\\n';
                    }
                });
                
                document.getElementById('batch-result').textContent = result;
            } catch (error) {
                document.getElementById('batch-result').textContent = '错误: ' + error.message;
            }
        }
        
        async function clearCache() {
            try {
                const response = await fetch('/api/phone-numbers/lookup/status', {
                    method: 'DELETE'
                });
                const data = await response.json();
                document.getElementById('cache-result').textContent = data.success ? '缓存清空成功' : '清空失败: ' + data.error;
            } catch (error) {
                document.getElementById('cache-result').textContent = '错误: ' + error.message;
            }
        }
        
        // 页面加载时自动检查状态
        window.onload = () => checkStatus();
    </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}