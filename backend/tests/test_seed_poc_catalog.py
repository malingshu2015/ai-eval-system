"""内置检查项 PoC 目录验收。"""
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from scripts.seed_data import SEED_DATA_FULL
from service.poc_executor import validate_poc_code


def _llm_items_by_code() -> dict[str, dict]:
    return _items_by_code("llm")


def _items_by_code(target_type: str) -> dict[str, dict]:
    template = next(item for item in SEED_DATA_FULL if item["target_type"].value == target_type)
    return {
        check_item["code"]: check_item
        for category in template["categories"]
        for check_item in category["items"]
    }


def _assert_safe_poc(item: dict) -> str:
    poc_code = item.get("poc_code")
    assert poc_code, f"{item['code']} 应配置自动化 PoC"
    is_valid, reason = validate_poc_code(poc_code)
    assert is_valid, reason
    assert "TARGET_URL" in poc_code
    return poc_code


def test_core_llm_policy_checks_have_safe_poc_scripts() -> None:
    items = _llm_items_by_code()

    for code in ["A-01", "A-02", "A-06", "B-01"]:
        poc_code = _assert_safe_poc(items[code])
        assert "MODEL_NAME" in poc_code
        assert "/api/generate" in poc_code


def test_core_llm_policy_poc_coverage_count() -> None:
    items = _llm_items_by_code()
    poc_enabled_items = [
        item
        for item in items.values()
        if item.get("poc_code")
    ]

    assert len(poc_enabled_items) >= 4
    assert {item["code"] for item in poc_enabled_items}.issuperset({"A-01", "A-02", "A-06", "B-01"})


def test_agent_policy_checks_have_safe_poc_scripts() -> None:
    items = _items_by_code("agent")

    for code in ["F-01", "G-08"]:
        poc_code = _assert_safe_poc(items[code])
        assert "MODEL_NAME" in poc_code
        assert "/api/generate" in poc_code


def test_web_readonly_checks_have_safe_poc_scripts() -> None:
    items = _items_by_code("webapp")

    for code in ["H-02", "H-08", "I-01", "I-04", "I-05", "I-07", "J-02", "J-04", "J-08"]:
        poc_code = _assert_safe_poc(items[code])
        assert "/api/generate" not in poc_code


def test_web_readonly_poc_coverage_count() -> None:
    items = _items_by_code("webapp")
    poc_enabled_items = [
        item
        for item in items.values()
        if item.get("poc_code")
    ]

    assert len(poc_enabled_items) >= 9
    assert {item["code"] for item in poc_enabled_items}.issuperset({
        "H-02",
        "H-08",
        "I-01",
        "I-04",
        "I-05",
        "I-07",
        "J-02",
        "J-04",
        "J-08",
    })
