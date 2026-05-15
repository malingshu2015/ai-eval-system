from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime

from core.database import get_db
from core.deps import RequireAuditorOrAbove, get_current_user, role_value
from model.evaluation import EvaluationSession, CheckResult, CheckResultStatus
from model.checklist import CheckItem
from model.user import User, UserRole
from service.evidence import get_result_confidence, parse_evidence

router = APIRouter()


def _escape_html(value: str | None) -> str:
    if not value:
        return ""
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _confidence_label(level: str) -> str:
    return {
        "high": "高可信",
        "medium": "中可信",
        "low": "低可信",
        "unknown": "未评估",
    }.get(level, level)

@router.get("/{session_id}/report", response_class=HTMLResponse, dependencies=[RequireAuditorOrAbove])
async def generate_html_report(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. 抓取完整会话数据 (确保预加载 check_item)
        stmt = (
            select(EvaluationSession)
            .options(
                selectinload(EvaluationSession.results).selectinload(CheckResult.check_item)
            )
            .where(EvaluationSession.id == session_id)
        )
        res = await db.execute(stmt)
        session = res.scalars().first()
        
        if not session:
            return HTMLResponse(content="<h1>错误：未找到对应的评估会话</h1>", status_code=404)

        if (
            role_value(current_user.role) != UserRole.SUPER_ADMIN.value
            and session.assignee_id != current_user.id
        ):
            raise HTTPException(status_code=403, detail="权限不足：您不是该任务的负责人")

        # 2. 统计结果
        results = session.results or []
        pass_count = len([r for r in results if r.status == CheckResultStatus.PASS])
        fail_count = len([r for r in results if r.status == CheckResultStatus.FAIL])
        pending_count = len([r for r in results if r.status == CheckResultStatus.PENDING])
        total = len(results)
        pass_rate = round((pass_count / total) * 100, 1) if total > 0 else 0

        # 3. 构建 HTML 模板
        html_content = f"""
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>安全评估报告 - {session.name}</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px; background: #f9fafb; }}
                .report-card {{ background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 40px; border: 1px solid #e5e7eb; }}
                .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }}
                .header h1 {{ margin: 0; color: #1e3a8a; font-size: 24px; }}
                .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; }}
                .meta-item b {{ color: #64748b; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 4px; }}
                .summary-stats {{ display: flex; gap: 20px; margin-bottom: 30px; }}
                .stat-box {{ flex: 1; padding: 15px; border-radius: 8px; text-align: center; color: white; }}
                .pass {{ background: #22c55e; }}
                .fail {{ background: #ef4444; }}
                .pending {{ background: #94a3b8; }}
                .item-row {{ border-bottom: 1px solid #f1f5f9; padding: 20px 0; }}
                .item-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }}
                .item-title {{ font-weight: 600; font-size: 16px; color: #1e293b; }}
                .badge {{ padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; text-transform: uppercase; }}
                .badge-pass {{ background: #dcfce7; color: #166534; }}
                .badge-fail {{ background: #fee2e2; color: #991b1b; }}
                .badge-pending {{ background: #f1f5f9; color: #475569; }}
                .confidence {{ display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 100px; font-size: 12px; background: #eff6ff; color: #1d4ed8; font-weight: 700; }}
                .evidence-meta {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; }}
                .evidence-meta div {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 12px; color: #475569; }}
                .evidence-meta b {{ display: block; color: #0f172a; margin-bottom: 4px; }}
                .evidence-box {{ background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap; margin-top: 10px; border-left: 4px solid #3b82f6; overflow-x: auto; }}
                .notes {{ color: #475569; font-style: italic; font-size: 14px; margin: 10px 0; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #cbd5e1; }}
                @media print {{ body {{ background: white; padding: 0; }} .report-card {{ box-shadow: none; border: none; }} }}
            </style>
        </head>
        <body>
            <div class="report-card">
                <div class="header">
                    <div>
                        <h1>AI 安全评估取证报告</h1>
                        <p style="color: #64748b; margin: 5px 0 0 0;">报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 32px; font-weight: 800; color: #3b82f6;">{session.score or 0}</div>
                        <div style="font-size: 12px; color: #64748b;">综合安全评分</div>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><b>评估项目</b>{session.name}</div>
                    <div class="meta-item"><b>测试目标</b>{session.target_url or 'N/A'}</div>
                    <div class="meta-item"><b>目标类型</b>{(session.target_type.value if hasattr(session.target_type, 'value') else str(session.target_type)).upper()}</div>
                    <div class="meta-item"><b>检查项统计</b>共 {total} 项，通过率 {pass_rate}%</div>
                </div>

                <div class="summary-stats">
                    <div class="stat-box pass"><b>{pass_count}</b><br/>通过</div>
                    <div class="stat-box fail"><b>{fail_count}</b><br/>失败</div>
                    <div class="stat-box pending"><b>{pending_count}</b><br/>待查</div>
                </div>

                <h2 style="border-left: 4px solid #1e3a8a; padding-left: 10px; margin-top: 40px; font-size: 20px;">检查详情与取证</h2>
        """

        for res in results:
            if not res.check_item:
                continue
            
            badge_class = f"badge-{res.status.value if hasattr(res.status, 'value') else str(res.status)}"
            status_badge = f'<span class="badge {badge_class}">{res.status.value if hasattr(res.status, 'value') else str(res.status)}</span>'
            confidence_score, confidence_level = get_result_confidence(res)
            evidence = parse_evidence(res.evidence)
            evidence_summary = evidence.get("summary") or "暂无结构化证据摘要"
            evidence_source = evidence.get("source") or "manual"
            evidence_exit_code = evidence.get("exitCode")
            diagnosis_code = evidence.get("diagnosisCode") or "未记录"
            diagnosis_message = evidence.get("diagnosisMessage") or "未记录"

            raw_evidence = res.last_poc_output or res.raw_output
            evidence_html = (
                f'<div class="evidence-box"><b>取证日志:</b><br/>{_escape_html(raw_evidence)}</div>'
                if raw_evidence else ""
            )
            notes_html = f'<div class="notes"><b>分析备注:</b> {_escape_html(res.notes)}</div>' if res.notes else ""
            
            risk_label = res.check_item.risk_level.value if hasattr(res.check_item.risk_level, 'value') else str(res.check_item.risk_level)
            
            html_content += f"""
                <div class="item-row">
                    <div class="item-header">
                        <div class="item-title">{res.check_item.code} - {res.check_item.name}</div>
                        <div>{status_badge} <span class="confidence">{_confidence_label(confidence_level)} · {confidence_score}%</span></div>
                    </div>
                    <div style="font-size: 13px; color: #64748b;">风险等级: {risk_label}</div>
                    <div class="evidence-meta">
                        <div><b>证据来源</b>{_escape_html(str(evidence_source))}</div>
                        <div><b>执行结果</b>{_escape_html(str(evidence_exit_code if evidence_exit_code is not None else '未记录'))}</div>
                        <div><b>失败诊断</b>{_escape_html(str(diagnosis_code))} · {_escape_html(str(diagnosis_message))}</div>
                        <div><b>证据摘要</b>{_escape_html(str(evidence_summary))}</div>
                    </div>
                    {notes_html}
                    {evidence_html}
                </div>
            """

        html_content += """
                <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #94a3b8; font-size: 12px;">
                    此报告由 Antigravity AI 安全评估工作台自动生成 | 绝密文件
                </div>
            </div>
        </body>
        </html>
        """
        return html_content
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Report Generation Error: {error_msg}")
        return HTMLResponse(content=f"<h1>报告生成失败</h1><pre>{error_msg}</pre>", status_code=500)
