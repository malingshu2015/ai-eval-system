"""
评分系统逻辑：基于风险等级权重的百分制评分算法
"""
from typing import List
from model.evaluation import EvaluationSession, CheckResult, CheckResultStatus
from model.checklist import RiskLevel

# 风险等级对应的权重分值
RISK_WEIGHTS = {
    RiskLevel.CRITICAL: 10.0,
    RiskLevel.HIGH: 5.0,
    RiskLevel.MEDIUM: 2.0,
    RiskLevel.LOW: 1.0,
    RiskLevel.INFO: 0.0
}

def calculate_session_score(results: List[CheckResult]) -> float:
    """
    计算评估会话的总得分。
    算法：
    1. 统计所有已检查（PASS/FAIL/PARTIAL）项的权重总和作为分母。
    2. 统计所有通过（PASS）项的权重总和，加上部分通过（PARTIAL）项权重的一半作为分子。
    3. 分子 / 分母 * 100。
    4. 如果没有已检查项，返回 None 或 100.0（取决于业务定义，此处建议返回 None 表示未评分）。
    """
    total_weight = 0.0
    earned_weight = 0.0
    
    checked_count = 0
    
    for res in results:
        # 跳过待检查和不适用的项
        if res.status in [CheckResultStatus.PENDING, CheckResultStatus.N_A]:
            continue
            
        # 获取该项对应的风险权重（优先使用实际发现的严重等级，若无则使用预设等级）
        severity = res.actual_severity if res.actual_severity else None
        
        # 如果 res 关联了 check_item，可以从 item 获取默认等级，
        # 但在 calculate 逻辑中，通常需要先在 session.results 中 loadinload 关联的 check_item。
        # 简单起见，如果 res 本身没存 severity，我们需要从关联的 item 获取。
        
        # 假设 severity 已经通过某处传入或已存储在 res 中。
        # 如果 res.actual_severity 为空，我们可能需要回退到 check_item.risk_level。
        # 这里为了演示逻辑，假设我们能获取到等级。
        
        # TODO: 优化：确保调用方传入的 CheckResult 已经加载了其对应的 CheckItem
        weight = 0.0
        if hasattr(res, 'check_item') and res.check_item:
            weight = RISK_WEIGHTS.get(res.check_item.risk_level, 0.0)
        elif res.actual_severity:
            weight = RISK_WEIGHTS.get(res.actual_severity, 0.0)
        else:
            # 默认权重
            weight = 2.0 
            
        total_weight += weight
        checked_count += 1
        
        if res.status == CheckResultStatus.PASS:
            earned_weight += weight
        elif res.status == CheckResultStatus.PARTIAL:
            earned_weight += (weight * 0.5)
            
    if total_weight == 0:
        return 100.0 if checked_count > 0 else 0.0
        
    return round((earned_weight / total_weight) * 100, 1)

def get_risk_distribution(results: List[CheckResult]) -> dict:
    """统计各种风险等级的漏洞分布情况"""
    dist = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "info": 0
    }
    for res in results:
        if res.status == CheckResultStatus.FAIL:
            severity = res.actual_severity.value if res.actual_severity else (
                res.check_item.risk_level.value if hasattr(res, 'check_item') and res.check_item else "medium"
            )
            if severity in dist:
                dist[severity] += 1
    return dist
