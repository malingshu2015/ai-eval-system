"""
Checklist 模板端点
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from model.checklist import CheckCategory, CheckItem, ChecklistTemplate
from schema.checklist import ChecklistTemplateResponse, ChecklistTemplateCreate

router = APIRouter()


@router.get("", response_model=List[ChecklistTemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    """获取所有 Checklist 模板（包含分类和检查项）"""
    stmt = select(ChecklistTemplate).options(
        selectinload(ChecklistTemplate.categories).selectinload(CheckCategory.items)
    ).order_by(ChecklistTemplate.target_type, ChecklistTemplate.name)
    
    result = await db.execute(stmt)
    templates = result.scalars().all()
    return templates


@router.get("/{template_id}", response_model=ChecklistTemplateResponse)
async def get_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """获取指定的 Checklist 模板详情"""
    stmt = select(ChecklistTemplate).options(
        selectinload(ChecklistTemplate.categories).selectinload(CheckCategory.items)
    ).where(ChecklistTemplate.id == template_id)
    
    result = await db.execute(stmt)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    return template
@router.post("", response_model=ChecklistTemplateResponse)
async def create_template(
    template_in: ChecklistTemplateCreate, 
    db: AsyncSession = Depends(get_db)
):
    """创建新的 Checklist 模板"""
    # 1. 创建模板主体
    db_template = ChecklistTemplate(
        name=template_in.name,
        description=template_in.description,
        target_type=template_in.target_type,
        version=template_in.version,
        standard=template_in.standard,
        is_builtin=False,  # 用户创建的默认为非内置
    )
    db.add(db_template)
    await db.flush()  # 获取 template_id
    
    # 2. 如果提供了分类和项，则一并创建
    for cat_in in template_in.categories:
        db_category = CheckCategory(
            template_id=db_template.id,
            code=cat_in.code,
            name=cat_in.name,
            description=cat_in.description,
            sort_order=cat_in.sort_order
        )
        db.add(db_category)
        await db.flush()
        
        for item_in in cat_in.items:
            db_item = CheckItem(
                category_id=db_category.id,
                code=item_in.code,
                name=item_in.name,
                description=item_in.description,
                risk_level=item_in.risk_level,
                check_method=item_in.check_method,
                expected_result=item_in.expected_result,
                remediation=item_in.remediation,
                tool_ids=item_in.tool_ids,
                sort_order=item_in.sort_order
            )
            db.add(db_item)
            
    await db.commit()
    await db.refresh(db_template)
    
    # 重新加载关联关系以返回完整数据
    stmt = select(ChecklistTemplate).options(
        selectinload(ChecklistTemplate.categories).selectinload(CheckCategory.items)
    ).where(ChecklistTemplate.id == db_template.id)
    result = await db.execute(stmt)
    return result.scalars().first()
