"""
API v1 路由注册
"""
from fastapi import APIRouter

from api.v1.endpoints import auth, checklist, dashboard, evaluation, governance, health, model_provider, report, runner

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["健康检查"])
router.include_router(auth.router, prefix="/auth", tags=["认证"])
router.include_router(checklist.router, prefix="/checklists", tags=["Checklist 模板"])
router.include_router(evaluation.router, prefix="/evaluations", tags=["评估会话"])
router.include_router(runner.router, prefix="/runner", tags=["工具执行"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["仪表盘"])
router.include_router(report.router, prefix="/report", tags=["报告生成"])
router.include_router(governance.router, tags=["治理闭环"])
router.include_router(model_provider.router, prefix="/model-providers", tags=["模型供应商"])
