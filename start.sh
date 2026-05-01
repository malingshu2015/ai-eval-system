#!/bin/bash
# 一键启动脚本：自动安装依赖、初始化数据库、启动前后端服务

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "=============================="
echo " AI 评估工作台 - 一键启动"
echo "=============================="

# 1. 释放 8000 端口上的残留进程
echo "[1/4] 检查并释放 8000 端口..."
PIDS=$(lsof -ti:8000 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "发现占用 8000 端口的进程: $PIDS，正在终止..."
    echo "$PIDS" | xargs kill -9
    sleep 1
fi

# 2. 进入后端目录，激活虚拟环境，安装依赖
echo "[2/4] 安装后端依赖..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q greenlet
pip install -q -r requirements.txt

# 3. 启动后端（后台运行，日志写到 backend.log）
echo "[3/4] 启动后端服务（http://localhost:8000）..."
uvicorn main:app --reload --port 8000 > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

# 等待后端启动完成（最多等 10 秒）
for i in $(seq 1 10); do
    sleep 1
    if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo "✅ 后端已就绪！"
        break
    fi
    echo "  等待后端启动... ($i/10)"
done

# 4. 启动前端（前台运行）
echo "[4/4] 启动前端（http://localhost:5173）..."
cd "$FRONTEND_DIR"
npm install -q
echo ""
echo "=============================="
echo " 🚀 启动完成！请访问："
echo "    http://localhost:5173"
echo "=============================="
echo ""
npm run dev
