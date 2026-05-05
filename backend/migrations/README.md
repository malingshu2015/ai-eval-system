# 数据库迁移说明

本目录用于管理后端数据库结构迁移。开发环境仍保留自动建表能力，生产和验收环境必须使用 Alembic 执行迁移。

## 常用命令

在 `backend` 目录执行：

```bash
alembic -c alembic.ini upgrade head
```

生成新迁移：

```bash
alembic -c alembic.ini revision --autogenerate -m "change description"
```

回滚一个版本：

```bash
alembic -c alembic.ini downgrade -1
```

## 约束

- 迁移脚本必须跟随模型变更一起提交。
- 生产环境不得依赖应用启动时的 `create_all`。
- 涉及字段删除、表删除、批量数据更新时，需要先完成备份和回滚方案。

## 初始化数据策略

初始化数据由 `backend/scripts/seed.py` 负责，受以下环境变量控制：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SEED_ON_STARTUP` | `true` | 仅开发环境生效，控制应用启动时是否自动执行初始化。 |
| `SEED_DEFAULT_ADMIN` | `true` | 是否创建默认管理员账号。 |
| `SEED_CHECKLIST_TEMPLATES` | `true` | 是否同步内置检查模板。 |
| `DEFAULT_ADMIN_USERNAME` | `admin` | 默认管理员用户名。 |
| `DEFAULT_ADMIN_EMAIL` | `admin@example.com` | 默认管理员邮箱。 |
| `DEFAULT_ADMIN_PASSWORD` | `admin123` | 默认管理员初始密码，生产环境必须覆盖。 |

生产建议：

- `APP_ENV=production`
- `SEED_ON_STARTUP=false`
- 通过发布流程显式执行 `alembic upgrade head`
- 首次部署时显式执行一次初始化脚本，并立即修改默认管理员密码

## 一致性检查

模型变更后需要执行：

```bash
alembic -c alembic.ini check
```

检查结论：

- 如果检测到新增字段、删除字段、索引变化，需要补充迁移脚本。
- SQLite 本地验证可能出现 UUID 类型比较噪声，需结合 PostgreSQL 验证结果判断。
- 当前初始迁移已包含 PoC 自动化字段：`check_items.poc_code`、`check_results.last_poc_output`。
