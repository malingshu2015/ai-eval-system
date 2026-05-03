# AI-Safe-Shield (AI 评估系统) 🛡️

[![Version](https://img.shields.io/badge/version-v0.1-blue.svg)](https://github.com/malingshu2015/ai-eval-system/releases/tag/v0.1)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tech Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React%20%7C%20Ollama-orange.svg)]()

> **AI-Safe-Shield** 是一款基于 28 个 AI 专家 Agent 协同工作的下一代渗透测试与安全评估系统。它拒绝“AI 幻觉”，通过将真实的安全侦察工具（Nmap, Curl, Dig 等）与大模型分析深度结合，为用户提供可验证、可溯源的实战级安全情报。

---

## ✨ 核心特性 (Key Features)

### 🤖 28 个 AI 专家 Agent 协同 (Swarm Intelligence)
系统内置 28 个针对不同安全领域的专项 Agent（如：Web 漏洞专家、API 审计员、AD 域专家等），通过协同工作模拟真实的红队攻击流程。

### 🔍 实战工具链驱动 (Tool-Grounded Analysis)
- **拒绝盲目推测**：在分析开始前，系统会自动调用 `nmap`、`curl`、`dig` 等工具获取目标真实的 HTTP 指纹、开放端口及 DNS 记录。
- **情报池机制**：真实探测数据作为“情报池”输入给所有 Agent，确保分析结论立足于现实。

### 📋 证据溯源与置信度 (Evidence & Traceability)
- **原始证据展示**：每一项漏洞发现都会展示其对应的工具输出原文。
- **一键验证命令**：AI 自动生成对应的 `curl` 或测试命令，支持用户在终端快速复现验证。
- **置信度分级**：自动标识发现是“工具验证 (Tool-Based)”还是“AI 推断 (AI-Inferred)”。

### 🛠️ 任务全生命周期管理
- 支持评估任务的快速创建、配置修改、状态追踪以及级联删除。
- 结构化日志输出，实时掌握渗透进度。

---

## 🏗️ 技术架构 (Architecture)

- **Frontend**: React 18 + TypeScript + Ant Design 5 (Vite 驱动)
- **Backend**: Python 3.10+ + FastAPI + SQLAlchemy
- **AI Engine**: OpenAI API 兼容接口 (支持 Ollama, GPT-4, Claude 等)
- **Database**: SQLite (默认) / PostgreSQL

---

## 🚀 快速开始 (Quick Start)

### 1. 环境依赖 (Prerequisites)
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** (推荐本地运行 `qwen2.5` 或 `llama3` 模型)
- **系统工具**: 确保服务器已安装 `nmap`, `curl`, `dig`

### 2. 后端安装与运行 (Backend)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows 使用 .venv\Scripts\activate
pip install -r requirements.txt
# 启动服务器
uvicorn main:app --reload --port 8000
```

### 3. 前端安装与运行 (Frontend)
```bash
cd frontend
npm install
# 启动开发服务器
npm run dev
```

---

## 🗺️ 路线图 (Roadmap)

- [x] **v0.1 (当前版本)**: 实现核心协同渗透流程，增加任务管理与证据溯源。
- [ ] **v0.2**: 引入自动化验证脚本 (PoC) 执行引擎。
- [ ] **v0.3**: 增加可视化攻击图 (Attack Graph) 推导逻辑展示。
- [ ] **v0.4**: 支持导出专业级 PDF 渗透测试报告。

---

## 🤝 贡献与反馈
欢迎通过 Issue 或 Pull Request 提交您的想法！

**Disclaimer**: 本工具仅用于合法授权的安全评估，严禁用于任何非法用途。
