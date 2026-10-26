# 续衡 · 设备维保助手

面向小型设备维保团队的多角色全栈 MVP。React 前端连接 Express REST API，业务数据由服务器持久化。核心流程是：客户报修 → 调度派工 → 服务人员处理 → 客户签字 → 服务报告 → 保养提醒。

## 启动

```powershell
cd C:\learn\维保助手
pnpm install
pnpm dev
```

开发环境会同时启动：

- 前端：`http://localhost:5173/`
- 后端 API：`http://localhost:8787/api`
- 健康检查：`http://localhost:8787/api/health`

生产构建：

```powershell
pnpm build
pnpm start
```

生产模式由 Express 在 `http://localhost:8787/` 同时提供前端静态资源与 API。

## 已实现

- 角色入口：管理员、调度客服、服务人员和客户使用独立权限与数据范围
- 客户门户：查看名下设备、发起报修、跟踪进度、验收签字和查看报告
- 服务人员工作端：只显示本人及未指派任务，支持现场记录
- 工作台：待处理工单、保养窗口、设备状态和完成率
- 设备档案：客户/地点/设备信息、服务历史与设备二维码
- 工单闭环：状态、故障判断、处理结果、工时、配件和照片
- 客户确认：触控/鼠标签字并自动完成工单
- 保养提醒：逾期、7 天内、30 天内分层，并可直接生成工单
- 服务报告：浏览器打印或另存为 PDF
- 数据管理：服务器自动保存、JSON 导出与恢复
- 响应式界面：桌面和手机可用

## 后端接口

- `POST /api/auth/login`、`GET /api/auth/me`、`POST /api/auth/logout`：签名 Cookie 会话
- `GET /api/health`：服务与存储状态
- `GET/PUT /api/data`：按角色读取、管理员备份恢复
- `POST /api/clients`：新建客户
- `POST/PATCH /api/equipment`：设备建档与更新
- `POST/PATCH/DELETE /api/work-orders`：工单完整 CRUD
- `POST /api/reset`：恢复演示数据

服务器数据保存在 `server/data/database.json`。写入使用临时文件与原子重命名，避免中途中断留下半份 JSON。当前实现适合单团队验证与小规模部署；多团队正式商用时应升级为 PostgreSQL、对象存储、账号权限、审计日志和定时备份。

登录页提供四个一键演示身份。演示账号和默认会话密钥仅用于本地验证，部署到公网前必须移除演示账号并设置环境变量 `SESSION_SECRET`。

## 当前不做

支付、维修撮合、完整 ERP、配件商城和 AI 故障诊断不属于当前 MVP。
