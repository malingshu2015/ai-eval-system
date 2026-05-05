"""评估证据与置信度工具。"""
from __future__ import annotations

import json
from typing import Any

from model.evaluation import CheckResult, CheckResultStatus


def build_poc_evidence(
    *,
    check_result: CheckResult,
    exit_code: int,
    stdout: str,
    stderr: str,
    diagnosis_code: str = "SUCCESS",
    diagnosis_message: str = "PoC 执行完成",
) -> str:
    """生成结构化 PoC 证据 JSON。"""
    success = exit_code == 0
    confidence_score = calculate_confidence_score(
        status=CheckResultStatus.PASS if success else CheckResultStatus.FAIL,
        has_raw_output=bool(stdout or stderr),
        has_poc_output=True,
        source="poc",
    )
    payload = {
        "source": "poc",
        "confidenceScore": confidence_score,
        "confidenceLevel": confidence_level(confidence_score),
        "summary": "PoC 执行通过，检查项未发现异常。" if success else "PoC 执行失败或发现异常，建议人工复核。",
        "diagnosisCode": diagnosis_code,
        "diagnosisMessage": diagnosis_message,
        "exitCode": exit_code,
        "stdoutLength": len(stdout),
        "stderrLength": len(stderr),
        "checkItemId": str(check_result.check_item_id),
        "sessionId": str(check_result.session_id),
    }
    return json.dumps(payload, ensure_ascii=False)


def parse_evidence(value: str | None) -> dict[str, Any]:
    """解析结构化证据；兼容历史纯文本证据。"""
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {"raw": value}
    except json.JSONDecodeError:
        return {"raw": value}


def calculate_confidence_score(
    *,
    status: CheckResultStatus,
    has_raw_output: bool,
    has_poc_output: bool,
    source: str | None = None,
) -> int:
    """基于结果来源和证据完整度计算 0-100 置信度。"""
    if status == CheckResultStatus.PENDING:
        return 0

    score = 35
    if source == "poc":
        score += 35
    if has_raw_output:
        score += 15
    if has_poc_output:
        score += 15
    if status == CheckResultStatus.PARTIAL:
        score -= 15

    return max(0, min(100, score))


def confidence_level(score: int) -> str:
    """将数字置信度转换为报告展示等级。"""
    if score >= 80:
        return "high"
    if score >= 50:
        return "medium"
    if score > 0:
        return "low"
    return "unknown"


def get_result_confidence(result: CheckResult) -> tuple[int, str]:
    """从检查结果提取或推导置信度。"""
    evidence = parse_evidence(result.evidence)
    score = evidence.get("confidenceScore")
    if isinstance(score, int):
        return score, confidence_level(score)

    source = evidence.get("source")
    derived = calculate_confidence_score(
        status=result.status,
        has_raw_output=bool(result.raw_output),
        has_poc_output=bool(result.last_poc_output),
        source=source if isinstance(source, str) else None,
    )
    return derived, confidence_level(derived)
