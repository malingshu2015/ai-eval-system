from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base
import datetime
import uuid

class EvaluationSession(Base):
    __tablename__ = "evaluation_sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    target_url = Column(String)
    target_type = Column(String)  # iot, llm, agent
    template_id = Column(String)
    status = Column(String, default="running")  # running, completed, archived
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 一个会话包含多个检查结果
    results = relationship("CheckResult", back_populates="session", cascade="all, delete-orphan")

class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("evaluation_sessions.id"), index=True)
    check_item_id = Column(String, index=True) # 对应模板中的 item.id
    status = Column(String, default="pending")  # pass, fail, partial, pending
    notes = Column(Text)
    raw_output = Column(Text)  # 保存工具执行的原始终端日志
    attachments = Column(JSON)  # 保存附件路径列表
    
    session = relationship("EvaluationSession", back_populates="results")
