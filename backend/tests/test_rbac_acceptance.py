"""RBAC 与评估任务数据隔离验收测试。"""
from collections.abc import AsyncGenerator
import os
from pathlib import Path
import sys
import json

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# 该验收测试使用独立临时库，不依赖开发机 .env 中的数据库配置。
TEST_DB_PATH = Path("/tmp/ai_eval_rbac_acceptance.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"
os.environ["APP_ENV"] = "test"
os.environ["SEED_ON_STARTUP"] = "false"
os.environ["CELERY_BROKER_URL"] = "memory://"
os.environ["CELERY_RESULT_BACKEND"] = "cache+memory://"
os.environ["CELERY_TASK_ALWAYS_EAGER"] = "true"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal, engine, get_db
from core.security import hash_password
from main import app
from model.base import Base
from model.checklist import CheckCategory, CheckItem, ChecklistTemplate, RiskLevel, TargetType
from model.evaluation import EvaluationSession
from model.user import User, UserRole
from service.poc_executor import PocExecutor, classify_poc_failure


PASSWORD = "Test123456!"


@pytest_asyncio.fixture
async def test_client(tmp_path: Path) -> AsyncGenerator[AsyncClient, None]:
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await _seed_acceptance_data(db)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _seed_acceptance_data(db: AsyncSession) -> None:
    users = [
        User(
            username="admin",
            email="admin@example.test",
            full_name="系统管理员",
            role=UserRole.SUPER_ADMIN,
            hashed_password=hash_password(PASSWORD),
            is_active=True,
        ),
        User(
            username="engineer",
            email="engineer@example.test",
            full_name="评估工程师",
            role=UserRole.EVAL_ENGINEER,
            hashed_password=hash_password(PASSWORD),
            is_active=True,
        ),
        User(
            username="auditor",
            email="auditor@example.test",
            full_name="审计员",
            role=UserRole.AUDITOR,
            hashed_password=hash_password(PASSWORD),
            is_active=True,
        ),
        User(
            username="asset",
            email="asset@example.test",
            full_name="资产管理员",
            role=UserRole.ASSET_MANAGER,
            hashed_password=hash_password(PASSWORD),
            is_active=True,
        ),
    ]
    db.add_all(users)
    await db.flush()

    template = ChecklistTemplate(
        name="LLM 权限验收模板",
        description="用于 RBAC 验收的最小模板",
        target_type=TargetType.LLM,
        standard="Acceptance",
        is_builtin=True,
    )
    db.add(template)
    await db.flush()

    category = CheckCategory(
        template_id=template.id,
        code="AC",
        name="访问控制",
        sort_order=1,
    )
    db.add(category)
    await db.flush()

    db.add(
        CheckItem(
            category_id=category.id,
            code="AC-01",
            name="基础权限检查",
            risk_level=RiskLevel.MEDIUM,
            check_method="检查接口权限矩阵",
            expected_result="未授权角色无法写入或访问他人任务",
            poc_code=(
                "import os\n"
                "print('target=' + os.getenv('TARGET_URL', ''))\n"
                "print('model=' + os.getenv('MODEL_NAME', ''))\n"
            ),
            sort_order=1,
        )
    )
    await db.commit()


async def _login(client: AsyncClient, username: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_role_matrix_for_admin_writer_and_reader(test_client: AsyncClient) -> None:
    admin_token = await _login(test_client, "admin")
    engineer_token = await _login(test_client, "engineer")
    auditor_token = await _login(test_client, "auditor")
    asset_token = await _login(test_client, "asset")

    users_response = await test_client.get("/api/v1/auth/users", headers=_auth(admin_token))
    assert users_response.status_code == 200

    forbidden_users_response = await test_client.get(
        "/api/v1/auth/users",
        headers=_auth(engineer_token),
    )
    assert forbidden_users_response.status_code == 403

    for token in [admin_token, engineer_token, auditor_token, asset_token]:
        response = await test_client.get("/api/v1/checklists", headers=_auth(token))
        assert response.status_code == 200

    payload = {
        "name": "工程师新建模板",
        "description": "RBAC 写权限验收",
        "target_type": "llm",
        "version": "1.0.0",
        "standard": "Acceptance",
        "categories": [],
    }
    writer_response = await test_client.post(
        "/api/v1/checklists",
        json=payload,
        headers=_auth(engineer_token),
    )
    assert writer_response.status_code == 200

    reader_response = await test_client.post(
        "/api/v1/checklists",
        json=payload | {"name": "审计员不应可写"},
        headers=_auth(auditor_token),
    )
    assert reader_response.status_code == 403


@pytest.mark.asyncio
async def test_evaluation_ownership_isolation(test_client: AsyncClient) -> None:
    admin_token = await _login(test_client, "admin")
    engineer_token = await _login(test_client, "engineer")
    auditor_token = await _login(test_client, "auditor")
    asset_token = await _login(test_client, "asset")

    templates_response = await test_client.get("/api/v1/checklists", headers=_auth(admin_token))
    template_id = templates_response.json()[0]["id"]

    engineer_session_response = await test_client.post(
        "/api/v1/evaluations",
        json={
            "name": "工程师自己的评估任务",
            "target_type": "llm",
            "target_url": "local://model-a",
            "target_description": "RBAC 验收目标",
            "template_id": template_id,
        },
        headers=_auth(engineer_token),
    )
    assert engineer_session_response.status_code == 200
    engineer_session_id = engineer_session_response.json()["id"]

    admin_session_response = await test_client.post(
        "/api/v1/evaluations",
        json={
            "name": "管理员评估任务",
            "target_type": "llm",
            "target_url": "local://model-admin",
            "target_description": "归属隔离验收目标",
            "template_id": template_id,
        },
        headers=_auth(admin_token),
    )
    assert admin_session_response.status_code == 200
    admin_session_id = admin_session_response.json()["id"]

    own_response = await test_client.get(
        f"/api/v1/evaluations/{engineer_session_id}",
        headers=_auth(engineer_token),
    )
    assert own_response.status_code == 200

    cross_response = await test_client.get(
        f"/api/v1/evaluations/{admin_session_id}",
        headers=_auth(engineer_token),
    )
    assert cross_response.status_code == 403

    admin_response = await test_client.get(
        f"/api/v1/evaluations/{engineer_session_id}",
        headers=_auth(admin_token),
    )
    assert admin_response.status_code == 200

    auditor_create_response = await test_client.post(
        "/api/v1/evaluations",
        json={
            "name": "审计员不应可创建",
            "target_type": "llm",
            "template_id": template_id,
        },
        headers=_auth(auditor_token),
    )
    assert auditor_create_response.status_code == 403

    asset_list_response = await test_client.get("/api/v1/evaluations", headers=_auth(asset_token))
    assert asset_list_response.status_code == 403


@pytest.mark.asyncio
async def test_poc_task_status_and_result_backfill(test_client: AsyncClient) -> None:
    engineer_token = await _login(test_client, "engineer")
    templates_response = await test_client.get("/api/v1/checklists", headers=_auth(engineer_token))
    template_id = templates_response.json()[0]["id"]
    check_item_id = templates_response.json()[0]["categories"][0]["items"][0]["id"]

    session_response = await test_client.post(
        "/api/v1/evaluations",
        json={
            "name": "PoC 回填验收任务",
            "target_type": "llm",
            "target_url": "local://acceptance-model",
            "target_description": "PoC 执行结果回填验收目标 [model:acceptance-llm:latest]",
            "template_id": template_id,
        },
        headers=_auth(engineer_token),
    )
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    run_response = await test_client.post(
        f"/api/v1/evaluations/{session_id}/results/{check_item_id}/run-poc",
        headers=_auth(engineer_token),
    )
    assert run_response.status_code == 200
    task_id = run_response.json()["task_id"]

    task_response = await test_client.get(
        f"/api/v1/evaluations/{session_id}/results/{check_item_id}/poc-task/{task_id}",
        headers=_auth(engineer_token),
    )
    assert task_response.status_code == 200
    task_data = task_response.json()
    assert task_data["task_state"] == "SUCCESS"
    assert task_data["result_status"] == "pass"
    assert task_data["exit_code"] == 0
    assert task_data["confidence_score"] == 100
    assert task_data["confidence_level"] == "high"
    assert task_data["diagnosis_code"] == "SUCCESS"
    assert "local://acceptance-model" in task_data["last_poc_output"]
    assert "acceptance-llm:latest" in task_data["last_poc_output"]

    detail_response = await test_client.get(
        f"/api/v1/evaluations/{session_id}",
        headers=_auth(engineer_token),
    )
    assert detail_response.status_code == 200
    result = detail_response.json()["results"][0]
    assert result["status"] == "pass"
    assert "target=local://acceptance-model" in result["raw_output"]
    assert "model=acceptance-llm:latest" in result["raw_output"]
    assert "model=acceptance-llm:latest" in result["last_poc_output"]
    assert result["confidence_score"] == 100
    assert result["confidence_level"] == "high"

    evidence = json.loads(result["evidence"])
    assert evidence["source"] == "poc"
    assert evidence["confidenceLevel"] == "high"
    assert evidence["diagnosisCode"] == "SUCCESS"

    report_response = await test_client.get(
        f"/api/v1/report/{session_id}/report",
        headers=_auth(engineer_token),
    )
    assert report_response.status_code == 200
    assert "AI 安全评估取证报告" in report_response.text
    assert "PoC 执行通过" in report_response.text
    assert "acceptance-llm:latest" in report_response.text


@pytest.mark.asyncio
async def test_report_export_respects_session_ownership(test_client: AsyncClient) -> None:
    admin_token = await _login(test_client, "admin")
    engineer_token = await _login(test_client, "engineer")

    templates_response = await test_client.get("/api/v1/checklists", headers=_auth(admin_token))
    template_id = templates_response.json()[0]["id"]

    admin_session_response = await test_client.post(
        "/api/v1/evaluations",
        json={
            "name": "管理员报告隔离任务",
            "target_type": "llm",
            "target_url": "local://admin-only",
            "target_description": "报告归属隔离验收",
            "template_id": template_id,
        },
        headers=_auth(admin_token),
    )
    assert admin_session_response.status_code == 200
    admin_session_id = admin_session_response.json()["id"]

    forbidden_report_response = await test_client.get(
        f"/api/v1/report/{admin_session_id}/report",
        headers=_auth(engineer_token),
    )
    assert forbidden_report_response.status_code == 403

    admin_report_response = await test_client.get(
        f"/api/v1/report/{admin_session_id}/report",
        headers=_auth(admin_token),
    )
    assert admin_report_response.status_code == 200
    assert "管理员报告隔离任务" in admin_report_response.text


@pytest.mark.asyncio
async def test_remediation_task_lifecycle_can_be_closed_with_retest_result(test_client: AsyncClient) -> None:
    engineer_token = await _login(test_client, "engineer")

    payload = {
        "id": "remediation-acceptance-1",
        "findingId": "finding-acceptance-1",
        "sourceTaskId": "session-acceptance-1",
        "sourceReportId": "report-acceptance-1",
        "sourceReportName": "LLM 安全评估报告",
        "severity": "high",
        "title": "越狱防护策略缺失",
        "description": "模型对高风险指令缺少稳定拒答策略。",
        "ownerId": "engineer",
        "ownerName": "评估工程师",
        "dueDate": "2026-05-15",
        "status": "open",
        "actionPlan": "补充系统提示词、拒答样本和复测用例。",
    }

    create_response = await test_client.post(
        "/api/v1/remediations",
        json=payload,
        headers=_auth(engineer_token),
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["id"] == payload["id"]
    assert created["status"] == "open"
    assert created["closedAt"] is None

    duplicate_response = await test_client.post(
        "/api/v1/remediations",
        json=payload | {"id": "remediation-acceptance-duplicate"},
        headers=_auth(engineer_token),
    )
    assert duplicate_response.status_code == 200
    assert duplicate_response.json()["id"] == payload["id"]

    in_progress_response = await test_client.patch(
        f"/api/v1/remediations/{payload['id']}",
        json={
            "status": "in_progress",
            "actionPlan": "已完成策略加固，等待复测。",
        },
        headers=_auth(engineer_token),
    )
    assert in_progress_response.status_code == 200
    assert in_progress_response.json()["status"] == "in_progress"

    closed_response = await test_client.patch(
        f"/api/v1/remediations/{payload['id']}",
        json={
            "status": "closed",
            "retestResult": "复测通过：同类越狱提示已稳定拒答。",
        },
        headers=_auth(engineer_token),
    )
    assert closed_response.status_code == 200
    closed = closed_response.json()
    assert closed["status"] == "closed"
    assert closed["retestResult"] == "复测通过：同类越狱提示已稳定拒答。"
    assert closed["closedAt"]

    list_response = await test_client.get(
        "/api/v1/remediations?finding_id=finding-acceptance-1",
        headers=_auth(engineer_token),
    )
    assert list_response.status_code == 200
    tasks = list_response.json()
    assert len(tasks) == 1
    assert tasks[0]["id"] == payload["id"]
    assert tasks[0]["status"] == "closed"


@pytest.mark.asyncio
async def test_poc_executor_diagnostics_for_policy_timeout_and_script_error() -> None:
    executor = PocExecutor(timeout=1)

    blocked = await executor.execute_python_code("import subprocess\nprint('x')", "local://x")
    assert blocked.success is False
    assert blocked.diagnosis_code == "POLICY_BLOCKED"
    assert "subprocess" in blocked.diagnosis_message

    failed = await executor.execute_python_code("raise RuntimeError('boom')", "local://x")
    assert failed.success is False
    assert failed.diagnosis_code == "SCRIPT_ERROR"
    assert failed.exit_code != 0

    timeout = await executor.execute_python_code("import time\ntime.sleep(2)", "local://x")
    assert timeout.success is False
    assert timeout.diagnosis_code == "TIMEOUT"


def test_poc_failure_classifier_provides_actionable_diagnosis() -> None:
    assert classify_poc_failure("", "urlopen error [Errno 61] Connection refused", 1)[0] == "TARGET_UNREACHABLE"
    assert classify_poc_failure("HTTP status: 401", "", 1)[0] == "AUTH_FAILED"
    assert classify_poc_failure("HTTP status: 404", "", 1)[0] == "TARGET_NOT_FOUND"
    assert classify_poc_failure("[FAIL] Missing security headers: content-security-policy", "", 1)[0] == "ASSERTION_FAILED"
