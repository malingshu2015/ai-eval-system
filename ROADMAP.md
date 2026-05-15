# AI-Safe-Shield 产品蓝图 & 进度追踪

## 📈 当前进度概览
- **当前阶段**: Sprint 7.4 (启动中)
- **核心版本**: v0.1 (已发布) -> v0.2 (迭代中)

---

## 🗺️ 详细路线图

### 阶段 7: 安全与权限加固 (Security & RBAC)
- [x] **Sprint 7.1**: 前端角色菜单过滤与基础路由保护。
- [x] **Sprint 7.2**: JWT Token 增强，角色 claim 注入。
- [x] **Sprint 7.3**: **后端接口级 RBAC 拦截 (Enforcement)**
    - 实现 `RequireWriter`, `RequireAdmin` 等声明式依赖.
    - 覆盖 `Evaluation`, `Checklist`, `Auth`, `Dashboard`, `Report`, `ModelProvider` 所有端点.
    - 实现基于角色的写操作拦截（403 Forbidden）.
- [x] **Sprint 7.4**: **基于所有权的细粒度数据隔离 (Data Ownership)**
    - 确保评估工程师只能查看/修改自己创建的任务（除非是 Admin）.
    - 建立“资源-所有者”关联.

### 阶段 8: 实战自动化 (Automation & PoC)
- [x] **Sprint 8.1**: **引入基于 Python 的 PoC 验证脚本沙箱**
    - 实现 `poc_executor` 子进程安全执行引擎。
    - 在模型中增加 `poc_code` 与 `last_poc_output` 字段。
    - 增加 `/run-poc` 接口并集成归属权校验。
- [x] **Sprint 8.2**: **任务流异步化 (Celery + Redis)**
    - 引入 Celery 架构并配置 Redis Broker。
    - 实现 `run_poc_task` 后台任务及异步环境兼容。
    - API 重构为非阻塞模式，返回 `task_id`。
- [ ] **Sprint 8.3**: 结果自动回填与置信度计算

---

## 🛠️ 最近更新记录
- **2026-05-04**: 完成后端接口级 RBAC 强制校验。
- **2026-05-02**: 发布 v0.1 稳定版，完善 README。
- **2026-05-01**: 修复评估任务白屏问题，完善 CRUD。
