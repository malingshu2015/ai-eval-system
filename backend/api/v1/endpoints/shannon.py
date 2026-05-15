"""
Shannon 白盒验证计划端点

当前阶段只创建执行计划，不自动运行 Shannon。Shannon 会主动执行利用验证，
必须在授权、隔离和凭证策略明确后再接入真实 Runner。
"""
from datetime import datetime, timezone
import shlex

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import RequireWriter, get_current_user
from model.governance import AuditEvent, AuditResult
from model.user import User
from schema.governance import ShannonPlanCreate, ShannonPlanResponse

router = APIRouter()


def _quote(value: str) -> str:
    return shlex.quote(value.strip())


def _build_command(payload: ShannonPlanCreate) -> str:
    command = [
        "npx @keygraph/shannon start",
        "-u",
        _quote(payload.target_url),
        "-r",
        _quote(payload.source_path),
    ]
    if payload.output_dir.strip():
        command.extend(["-o", _quote(payload.output_dir)])
    return " ".join(command)


@router.post("/plans", response_model=ShannonPlanResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def create_shannon_plan(
    payload: ShannonPlanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建 Shannon 白盒验证计划，不执行真实扫描。"""
    target_url = payload.target_url.strip()
    source_path = payload.source_path.strip()
    authorization_note = payload.authorization_note.strip()

    if not target_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="被测应用地址必须以 http:// 或 https:// 开头")
    if not source_path:
        raise HTTPException(status_code=422, detail="请填写源码路径")
    if len(authorization_note) < 8:
        raise HTTPException(status_code=422, detail="请填写明确的授权说明")

    now = datetime.now(timezone.utc)
    plan_id = f"shannon-{int(now.timestamp() * 1000)}"
    command = _build_command(payload)

    event = AuditEvent(
        id=f"audit-{plan_id}",
        actor_id=str(current_user.id),
        actor_name=current_user.username,
        action="创建 Shannon 白盒验证计划",
        target_type="shannon",
        target_id=plan_id,
        target_name=target_url,
        result=AuditResult.WARNING,
        summary="已创建 Shannon 白盒验证计划。当前仅生成计划和命令，未自动执行真实利用验证。",
    )
    db.add(event)
    await db.commit()

    return ShannonPlanResponse(
        id=plan_id,
        target_url=target_url,
        source_path=source_path,
        output_dir=payload.output_dir or "./shannon-reports",
        status="planned",
        command=command,
        prerequisites=[
            "已取得被测系统授权",
            "目标应用正在运行且可访问",
            "源码路径与运行应用版本一致",
            "本机或后端 Runner 已具备 Docker、Node.js 和模型凭证",
        ],
        execution_steps=[
            "后端 Runner 校验授权范围和运行环境",
            "以隔离容器挂载源码并启动 Shannon",
            "Shannon 生成白盒动态验证报告",
            "平台解析报告并转换为 Finding/Evidence/ReviewResult",
            "确认漏洞进入报告中心和整改中心",
        ],
        next_action="下一步接入 Shannon Runner，由后端隔离执行该计划。",
        created_at=now.isoformat(),
    )
