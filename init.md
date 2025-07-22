我现在正在测试短信发送的问题。因为我们的平台使用的是阿里云的短信发送服务，但是我们发送的短信内容是偏营销类型的，导致有概率会被运营商拦截，我就要频繁的查看阿里云的后台记录，看一下有没有发送成功。并且我目前没有在我们的网页端产品进行业务上触发短信的发送功能，而是通过管理后台的管理界面，填写一个表单，进行测试发送短信，但是我觉得每次都要填写这样一个表单也挺麻烦的。所以我希望能实现一个我在前端页面上能够选择电话号码，并且选择短信模板（不需要每次填写表单），然后一键发送测试短信，同时可以看到阿里云的短信反馈。相关的接口我提供给你。这两个平台的接口调用都需要token，所以你还需要提供给我让我手动填写token的配置的地方。

Please create a web-based SMS testing tool with the following specific requirements:

**Project Setup:**
- Create a frontend project running on port 3030
- Use modern web technologies (HTML, CSS, JavaScript)
- Focus on user-friendly and convenient operation

**Core Features:**
1. **Token Configuration Panel:**
   - Provide input fields for manually entering two tokens:
     - Admin backend token (for SMS template and sending APIs)
     - Aliyun console token (for SMS status checking)
   - Store tokens locally for session persistence

2. **SMS Template Management:**
   - Fetch and display SMS templates from the admin backend API
   - Show template name, content, and required parameters
   - Allow users to select templates from a dropdown/list

3. **Phone Number Input:**
   - Provide an input field or dropdown for selecting/entering phone numbers
   - Support common test phone numbers for quick selection

4. **Parameter Filling:**
   - Dynamically generate input fields based on selected template's parameters
   - Pre-fill with default test values when possible

5. **One-Click SMS Sending:**
   - Send SMS using the admin backend API with selected template and phone number
   - Display sending status and capture the returned SMS ID (OutId)

6. **Real-time Status Monitoring:**
   - Query Aliyun SMS delivery status using the SMS ID
   - Auto-refresh every 3 seconds
   - Provide manual refresh button
   - Display delivery status, error codes, and timestamps in a clear format

**API Integration:**
Use the provided APIs for:
- Fetching SMS templates: `/admin-api/system/sms-template/page`
- Getting template details: `/admin-api/system/sms-template/get`
- Sending SMS: `/admin-api/system/sms-template/send-sms`
- Checking Aliyun status: Aliyun console API for SMS delivery details

**UI/UX Requirements:**
- Clean, intuitive interface
- Clear status indicators (pending, delivered, failed)
- Error handling and user feedback
- Responsive design for desktop use

The goal is to replace the current manual form-filling process with a streamlined testing interface that provides immediate feedback on SMS delivery status.

Note: All text content on the website is in Chinese.

1. 管理后台获取短信模板列表的接口：

```bash
fetch("https://wxapp.agrochainhub.com/admin-api/system/sms-template/page?pageNo=1&pageSize=10&code=&content=&apiTemplateId=&channelId=8", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "authorization": "Bearer ade3ae2a424e4bcda1b475fdbab915a2",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://admin.agrochainhub.com/"
  },
  "body": null,
  "method": "GET"
});
```

```json
{
    "code": 0,
    "data": {
        "list": [
            {
                "id": 27,
                "type": 3,
                "status": 0,
                "code": "SMS_491165409",
                "name": "萌总报价",
                "content": "国外农药客户请您报价，请微信搜索小程序～农化采购助手～快快报价吧。",
                "params": [],
                "remark": "",
                "apiTemplateId": "SMS_491165409",
                "channelId": 8,
                "channelCode": "ALIYUN",
                "createTime": 1753091578000
            },
            {
                "id": 21,
                "type": 2,
                "status": 0,
                "code": "seller-case-intention",
                "name": "农药登记需求",
                "content": "尊敬的${supplyName}，这是一条农药登记需求通知，${purchaserName}给您发来了${productName}产品的登记需求，快去微信小程序农化采购助手，或者农化采购助手微信服务号进行报价回复吧。",
                "params": [
                    "supplyName",
                    "purchaserName",
                    "productName"
                ],
                "remark": "",
                "apiTemplateId": "SMS_490610360",
                "channelId": 8,
                "channelCode": "ALIYUN",
                "createTime": 1750155105000
            },
            {
                "id": 20,
                "type": 2,
                "status": 0,
                "code": "seller-case-samplereq",
                "name": "农药样品需求",
                "content": "尊敬的${supplyName}，这是一条农药样品需求通知，${purchaserName}给您发来了${productName}产品的样品需求，快去微信小程序农化采购专家，或者农化采购专家微信服务号进行报价回复吧。",
                "params": [
                    "supplyName",
                    "purchaserName",
                    "productName"
                ],
                "remark": "",
                "apiTemplateId": "SMS_490795363",
                "channelId": 8,
                "channelCode": "ALIYUN",
                "createTime": 1750155073000
            },
            {
                "id": 19,
                "type": 2,
                "status": 0,
                "code": "seller-case-enquiry",
                "name": "农药询价",
                "content": "尊敬的${supplyName}，这是一条农药询价通知，${purchaserName}给您发来了${productName}产品的询价，快去微信小程序农化采购专家，或者农化采购专家微信服务号进行报价吧。",
                "params": [
                    "supplyName",
                    "purchaserName",
                    "productName"
                ],
                "remark": "",
                "apiTemplateId": "SMS_490715352",
                "channelId": 8,
                "channelCode": "ALIYUN",
                "createTime": 1750146720000
            }
        ],
        "total": 4
    },
    "msg": ""
}
```

2. 管理后台过去模板详情的接口：
```bash
fetch("https://wxapp.agrochainhub.com/admin-api/system/sms-template/get?id=21", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "authorization": "Bearer ade3ae2a424e4bcda1b475fdbab915a2",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://admin.agrochainhub.com/"
  },
  "body": null,
  "method": "GET"
});
```

```json
{
    "code": 0,
    "data": {
        "id": 21,
        "type": 2,
        "status": 0,
        "code": "seller-case-intention",
        "name": "农药登记需求",
        "content": "尊敬的${supplyName}，这是一条农药登记需求通知，${purchaserName}给您发来了${productName}产品的登记需求，快去微信小程序农化采购助手，或者农化采购助手微信服务号进行报价回复吧。",
        "params": [
            "supplyName",
            "purchaserName",
            "productName"
        ],
        "remark": "",
        "apiTemplateId": "SMS_490610360",
        "channelId": 8,
        "channelCode": "ALIYUN",
        "createTime": 1750155105000
    },
    "msg": ""
}
```

3. 管理后台发送短信的接口：
```bash
fetch("https://wxapp.agrochainhub.com/admin-api/system/sms-template/send-sms", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "authorization": "Bearer ade3ae2a424e4bcda1b475fdbab915a2",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://admin.agrochainhub.com/"
  },
  "body": "{\"content\":\"尊敬的${supplyName}，这是一条农药登记需求通知，${purchaserName}给您发来了${productName}产品的登记需求，快去微信小程序农化采购助手，或者农化采购助手微信服务号进行报价回复吧。\",\"params\":[\"supplyName\",\"purchaserName\",\"productName\"],\"mobile\":\"17613231911\",\"templateCode\":\"seller-case-intention\",\"templateParams\":{\"supplyName\":\"供应商\",\"purchaserName\":\"采购商\",\"productName\":\"测试\"}}",
  "method": "POST"
});
```

```json
{"code":0,"data":1422,"msg":""}
```

4. 阿里云管理后台的接口：
```bash
fetch("https://dysms.console.aliyun.com/data/api.json?action=QuerySendDetailsByPhoneNumNew&t=1753154943716", {
  "headers": {
    "accept": "application/json",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "bx-v": "2.5.31",
    "content-type": "application/x-www-form-urlencoded",
    "eagleeye-pappname": "eb362az63s@0b3b1f5d42665b1",
    "eagleeye-sessionid": "5ymwnd1jdt2x99iL6c8acbL3dUbn",
    "eagleeye-traceid": "b5d736e017531549437301035665b1",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "cookie": "cna=j46RHpky0i8CAbRvZUFxoWvn; account_info_switch=close; yunpk=1414936817760793; dbs_origin=https://dbs.console.aliyun.com; dbs_region=cn-hangzhou; _uab_collina=175014457149495586575598; _umdata=G4688C10F5E4A959EB03EC0EE3400CBF7C95C43; c_csrf_token=7497ff9a-c90b-07a4-2c5f-e5d4ad720c41; login_current_pk=1414936817760793; cnaui=1414936817760793; aui=1414936817760793; login_aliyunid_pk=1414936817760793; login_aliyunid_ticket=_g0pof_BNTwUhTOoNC1ZBeeMfKJzxdnb95hYssNIZor6q7SCxRtgmGCbifG2Cd4ZWazmBdHI6sgXZqg4XFWQfyKpeu*0vCmV8s*MT5tJl3_1$$w1mxAFwgbiddeTLULk1h6eNQUhqhoThI72NzbTeRJ20; hssid=CN-SPLIT-ARCEByIOc2Vzc2lvbl90aWNrZXQyAQE4lve61IIzQAFKEKS7Wq5bs-9BA17rw0kIfHT98pKk9gi3LwzYzwqp7qNoN82nng; hsite=6; aliyun_country=CN; partitioned_cookie_flag=doubleRemove; aliyun_site=CN; aliyun_lang=zh; login_aliyunid_csrf=_csrf_tk_1206453060654299; login_aliyunid=agro****inhub; aliyun_cert_type_common=2; activeRegionId=cn-hangzhou; sca=811da3d4; atpsida=e1388fa2bd067b302ae22926_1753152743_1; tfstk=glviQysL3waWxUud9p6s1iWMJJGpfO6frEeAktQqTw7QWPe90tmDWhVOMnu6oKbec1n1MZecgwLlMFd9D-q6KU2YBVG60-XA343-eYK_ft6qyd08_3_1cH7qv1rRdj7G343-pYK6ft62kjUJevxFRijVu-82YDjO8RS4QizExw_FbPyaQwyF0GyN0EWqxH7C0t72usoHYfF0_ap2apucSwGQXMSJKGfGzhc73-v3e1bybw2qzpjG3a-N--yV5iii5n8qo-ByNevcaEM0dOKkT9SMtmPF7_AwWMTmER7wKhJNWduLBNJ6YQpv8myVoBRPZNRIRx1wNFdPtp3gdaRexnCHOmNOkQs2l_9xPR_w039WwTD0mMAkY9jPbWPrRbefYmp3GS1NAMb-2saxBmXFMbonx7Kf_Ms5yDm3GmU73RttxDV791SCqv1..; currentRegionId=cn-hangzhou; isg=BAoKznj1Vjq1kNTjZDza8D7aW_as-45Vi9oT0JRN2d3VR4EBfYrTZ1dxV7Obtwbt",
    "Referer": "https://dysms.console.aliyun.com/record"
  },
  "body": "action=QuerySendDetailsByPhoneNumNew&product=dysms20170620&params=%7B%22PageNo%22%3A1%2C%22PageSize%22%3A10%2C%22PhoneNum%22%3A%22%22%2C%22SendDate%22%3A%222025-07-22%22%2C%22SendStatus%22%3A%22%22%2C%22SignName%22%3A%22%22%2C%22ErrorCode%22%3A%22%22%2C%22BizId%22%3A%22%22%2C%22TemplateCode%22%3A%22%22%7D&umid=Yb47d925189abd3f95a194bd66162a5a2&collina=140%23RBzDnckezzPEizo2LZ%2FzApSdILihRa30jVLyDcGDTKEYlHuNxNZVUAcTKkxgz2No7iMPEyoBvnLs3t8GE9Jif3aheFrgh6hqzzc%2Bu2hsRwFzzXEpIamulFzx2DD3Vtgq3EEhbO5TlIOxIPc9bxmFXZHEPiMuBygJ%2FgnalvP9OWv5%2FVM2TM1%2FRgPeUWsNAM4OqtHcU54b9daKqhQc6yAsdgH1U1pDKc4TqaPeTrw2JrEXX1YshlfX%2FqEu6qdQdWkslbr6vdZAuh71zPrSV1h%2FtFzz2PdpQDrbz%2Fuxcz%2FjOSvZrI7ZbVf9xEn28H3KEtVF2BJMJmxjA1XsKeGM6k5pX7kPumh52z0BdXgJZoSTftcnDJE1jjXD9oTtXnm7n3LYf%2BMrHpKG6%2FPEeRt9NT8WETDm2spY8wU4qlsQ3mWn35oWtPzFoeLxqyLqjZ%2FOVo92%2BekDPWbioE1bqt4oCKlfSkLeLQyRK5ybV21YXOIc%2FTKSj5okzch5nrl%2BThHQabs784rD%2Fjqv%2BTz0WofkyFQlO56xw1OWtp24KzwLaa6Q7JQmPi8SgBkTksCMhaT1lpjtlIsQg9nAoZzSDd5RuBeJ6oeoS2qPRQL2pljemM1zLgq7BkyWJDQZFTaCGO1mHijR3SUmHw8f%2BYu01%2B8hGe6vved5WPOwIYCL54bvexGNZYhZ6BjW7mXog%2FGDxT2NT5EeumJ5VTLFr32sPFf4RLN93iLQ17h%2BBWAXlerrRJli5DFnJCGc8IbLfqJ4AkZHRLX5WjWdr8yiWaruzA%2B%2F%2BYVbmZDxARbFrpRi4d7nHBz%2Fo0jCF%2BRK3jqDaobysrUXK3GHmSZByf4dzmQC%2BF4wfADkRbDf90LNORLkPdPHwbHh8xxjij1xun0v7deASFQ3Awp8Qas%2F1pTp7j5YUB2QkOtGHS3Penc%2BPwkEk1Rq8dPC76sHvpzMCykiESMDiWFxZk%2BVkQf%2FJ8kGDtOnQhgbB%2BzwlJF%2FTqYcgo1Uc8dBDoM0xYqKYqjTbJCIJ6%2FI7Zs8vcs2N8YhTvwxCFFOZMcA4sdrv3Tj9JFHJM9voN5TPJWnU77IQ7wy&sec_token=hlwNUitqNN2ZzyYDW1H2D6",
  "method": "POST"
});
```

```json
{
	"code":"200",
	"data":{
		"PageSize":10,
		"RequestId":"825EE634-7DA8-5C62-9B08-E68D1D53558B",
		"Total":11,
		"PageNo":1,
		"List":{
			"SmsSendDetailResponse":[
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 11:28:22",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 11:28:24",
					"BizType":0,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚数字科技",
					"SmsSignResponse":{
						"QualificationName":"南京长颈羚数字科技",
						"Id":"22953614534",
						"SignCode":"SIGN_100000183124198_1753076826490_UrtY8",
						"QualificationId":2244143,
						"QualificationWorkOrderId":20072308107,
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":84,
					"TemplateCode":"SMS_490610360",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"17613231911",
					"Content":"【南京长颈羚数字科技】尊敬的供应商，这是一条农药登记需求通知，采购商给您发来了测试产品的登记需求，快去微信小程序农化采购助手，或者农化采购助手微信服务号进行报价回复吧。",
					"BillCount":2,
					"OutId":"1422",
					"BizId":"629714353154901848^0",
					"SignState":2
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 11:15:41",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 11:15:44",
					"BizType":2,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚科技有限公司",
					"SmsSignResponse":{
						"ApplySource":"console_dysms",
						"QualificationName":"南京长颈羚科技有限公司",
						"ResultReason":"qua.UNAVAILABLE_TO_REPLACE",
						"Id":"22828810566",
						"SignCode":"SIGN_100000183124198_1750145146471_9PGj0",
						"QualificationId":1318949,
						"QualificationWorkOrderId":20064378054,
						"ExtendMessage":"{\"thirdParty\":\"no\",\"qualificationId\":1318949,\"usageValue\":\"FullNameOfUnit\",\"isTheeeParty\":\"否\",\"remark\":\"发送本公司旗下的产品-农化采购平台-的通知内容。\",\"usageName\":\"企事业单位名（优先推荐）\"}",
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":33,
					"TemplateCode":"SMS_313016571",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"15361287442",
					"Content":"【南京长颈羚科技有限公司】您的验证码为：5739，请勿泄露于他人！",
					"BillCount":1,
					"OutId":"1421",
					"BizId":"110002053154141826^0",
					"SignState":1
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 11:10:55",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 11:12:28",
					"BizType":0,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚数字科技",
					"SmsSignResponse":{
						"QualificationName":"南京长颈羚数字科技",
						"Id":"22953614534",
						"SignCode":"SIGN_100000183124198_1753076826490_UrtY8",
						"QualificationId":2244143,
						"QualificationWorkOrderId":20072308107,
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":84,
					"TemplateCode":"SMS_490795363",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"18060535382",
					"Content":"【南京长颈羚数字科技】尊敬的供应商，这是一条农药样品需求通知，采购商给您发来了测试产品的样品需求，快去微信小程序农化采购助手，或者农化采购助手微信服务号进行报价回复吧。",
					"BillCount":2,
					"OutId":"1420",
					"BizId":"267810353153855032^0",
					"SignState":2
				},
				{
					"InnerErrCode":"",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 11:09:30",
					"SendStatus":1,
					"BizType":1,
					"ReceiveDateStr":"",
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚数字科技",
					"SmsSignResponse":{
						"QualificationName":"南京长颈羚数字科技",
						"Id":"22953614534",
						"SignCode":"SIGN_100000183124198_1753076826490_UrtY8",
						"QualificationId":2244143,
						"QualificationWorkOrderId":20072308107,
						"QualificationState":"PASSED"
					},
					"ErrCode":"",
					"SmsLength":50,
					"TemplateCode":"SMS_491165409",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"17613231911",
					"Content":"【南京长颈羚数字科技】国外农药客户请您报价，请微信搜索小程序～农化采购助手～快快报价吧。拒收请回复R",
					"BillCount":1,
					"OutId":"1418",
					"BizId":"900616953153770260^0",
					"SignState":2
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 10:47:40",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 10:47:47",
					"BizType":2,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚科技有限公司",
					"SmsSignResponse":{
						"ApplySource":"console_dysms",
						"QualificationName":"南京长颈羚科技有限公司",
						"ResultReason":"qua.UNAVAILABLE_TO_REPLACE",
						"Id":"22828810566",
						"SignCode":"SIGN_100000183124198_1750145146471_9PGj0",
						"QualificationId":1318949,
						"QualificationWorkOrderId":20064378054,
						"ExtendMessage":"{\"thirdParty\":\"no\",\"qualificationId\":1318949,\"usageValue\":\"FullNameOfUnit\",\"isTheeeParty\":\"否\",\"remark\":\"发送本公司旗下的产品-农化采购平台-的通知内容。\",\"usageName\":\"企事业单位名（优先推荐）\"}",
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":33,
					"TemplateCode":"SMS_313016571",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"15361287442",
					"Content":"【南京长颈羚科技有限公司】您的验证码为：5313，请勿泄露于他人！",
					"BillCount":1,
					"OutId":"1417",
					"BizId":"395017753152460392^0",
					"SignState":1
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 10:46:09",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 10:46:18",
					"BizType":2,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚科技有限公司",
					"SmsSignResponse":{
						"ApplySource":"console_dysms",
						"QualificationName":"南京长颈羚科技有限公司",
						"ResultReason":"qua.UNAVAILABLE_TO_REPLACE",
						"Id":"22828810566",
						"SignCode":"SIGN_100000183124198_1750145146471_9PGj0",
						"QualificationId":1318949,
						"QualificationWorkOrderId":20064378054,
						"ExtendMessage":"{\"thirdParty\":\"no\",\"qualificationId\":1318949,\"usageValue\":\"FullNameOfUnit\",\"isTheeeParty\":\"否\",\"remark\":\"发送本公司旗下的产品-农化采购平台-的通知内容。\",\"usageName\":\"企事业单位名（优先推荐）\"}",
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":33,
					"TemplateCode":"SMS_313016571",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"15361287442",
					"Content":"【南京长颈羚科技有限公司】您的验证码为：9406，请勿泄露于他人！",
					"BillCount":1,
					"OutId":"1416",
					"BizId":"797120753152369735^0",
					"SignState":1
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 10:42:04",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 10:42:15",
					"BizType":2,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚科技有限公司",
					"SmsSignResponse":{
						"ApplySource":"console_dysms",
						"QualificationName":"南京长颈羚科技有限公司",
						"ResultReason":"qua.UNAVAILABLE_TO_REPLACE",
						"Id":"22828810566",
						"SignCode":"SIGN_100000183124198_1750145146471_9PGj0",
						"QualificationId":1318949,
						"QualificationWorkOrderId":20064378054,
						"ExtendMessage":"{\"thirdParty\":\"no\",\"qualificationId\":1318949,\"usageValue\":\"FullNameOfUnit\",\"isTheeeParty\":\"否\",\"remark\":\"发送本公司旗下的产品-农化采购平台-的通知内容。\",\"usageName\":\"企事业单位名（优先推荐）\"}",
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":33,
					"TemplateCode":"SMS_313016571",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"16605120850",
					"Content":"【南京长颈羚科技有限公司】您的验证码为：4545，请勿泄露于他人！",
					"BillCount":1,
					"OutId":"1415",
					"BizId":"285512253152124746^0",
					"SignState":1
				},
				{
					"InnerErrCode":"",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 10:26:04",
					"SendStatus":1,
					"BizType":1,
					"ReceiveDateStr":"",
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚数字科技",
					"SmsSignResponse":{
						"QualificationName":"南京长颈羚数字科技",
						"Id":"22953614534",
						"SignCode":"SIGN_100000183124198_1753076826490_UrtY8",
						"QualificationId":2244143,
						"QualificationWorkOrderId":20072308107,
						"QualificationState":"PASSED"
					},
					"ErrCode":"",
					"SmsLength":50,
					"TemplateCode":"SMS_491165409",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"17613231911",
					"Content":"【南京长颈羚数字科技】国外农药客户请您报价，请微信搜索小程序～农化采购助手～快快报价吧。拒收请回复R",
					"BillCount":1,
					"OutId":"1413",
					"BizId":"141516653151164360^0",
					"SignState":2
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 10:25:58",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 10:26:14",
					"BizType":0,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚数字科技",
					"SmsSignResponse":{
						"QualificationName":"南京长颈羚数字科技",
						"Id":"22953614534",
						"SignCode":"SIGN_100000183124198_1753076826490_UrtY8",
						"QualificationId":2244143,
						"QualificationWorkOrderId":20072308107,
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":84,
					"TemplateCode":"SMS_490610360",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"17613231911",
					"Content":"【南京长颈羚数字科技】尊敬的供应商，这是一条农药登记需求通知，采购商给您发来了测试产品的登记需求，快去微信小程序农化采购助手，或者农化采购助手微信服务号进行报价回复吧。",
					"BillCount":2,
					"OutId":"1412",
					"BizId":"234917753151158808^0",
					"SignState":2
				},
				{
					"InnerErrCode":"DELIVRD",
					"ApplyDateStr":"",
					"SendDateStr":"2025-07-22 09:56:40",
					"SendStatus":3,
					"ReceiveDateStr":"2025-07-22 09:57:41",
					"BizType":2,
					"ErrCodeDesc":"",
					"SignName":"南京长颈羚科技有限公司",
					"SmsSignResponse":{
						"ApplySource":"console_dysms",
						"QualificationName":"南京长颈羚科技有限公司",
						"ResultReason":"qua.UNAVAILABLE_TO_REPLACE",
						"Id":"22828810566",
						"SignCode":"SIGN_100000183124198_1750145146471_9PGj0",
						"QualificationId":1318949,
						"QualificationWorkOrderId":20064378054,
						"ExtendMessage":"{\"thirdParty\":\"no\",\"qualificationId\":1318949,\"usageValue\":\"FullNameOfUnit\",\"isTheeeParty\":\"否\",\"remark\":\"发送本公司旗下的产品-农化采购平台-的通知内容。\",\"usageName\":\"企事业单位名（优先推荐）\"}",
						"QualificationState":"PASSED"
					},
					"ErrCode":"DELIVERED",
					"SmsLength":33,
					"TemplateCode":"SMS_313016571",
					"StatisticsStatus":1,
					"Suggestion":"",
					"BlackListStatus":0,
					"PhoneNum":"17613231911",
					"Content":"【南京长颈羚科技有限公司】您的验证码为：1231，请勿泄露于他人！",
					"BillCount":1,
					"OutId":"1411",
					"BizId":"154619253149400321^0",
					"SignState":1
				}
			]
		}
	},
	"httpStatusCode":"200",
	"requestId":"825EE634-7DA8-5C62-9B08-E68D1D53558B",
	"successResponse":true
}
```
其中 OutId 就是 `/admin-api/system/sms-template/send-sms` 这个接口的返回值中的 `data` 内容。你可以通过这个字段来匹配，获取短信的状态信息。查询阿里云短信的状态，可以设置为每3秒调用一次，并且提供手动刷新的按钮。

请你帮我创建一个前端项目，要以用户操作友好、便捷，为第一要素。端口号设置为3030，为了不和其他项目冲突。