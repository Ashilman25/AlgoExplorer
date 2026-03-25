from typing import Optional, Dict, List, Any
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, JSON

class Base(DeclarativeBase):
    pass


def default_user_settings() -> Dict[str, Any]:
    user_settings = {
        "theme" : "dark",
        "default_playback_speed" : 1.0,
        "explanation_verbosity" : "standard",
        "animation_detail" : "standard"
    }
    
    return user_settings


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key = True, autoincrement = True)
    email: Mapped[str] = mapped_column(String(255), nullable = False, unique = True, index = True)
    username: Mapped[str] = mapped_column(String(50), nullable = False, unique = True, index = True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable = False)
    
    settings: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable = False, default = default_user_settings)
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.utcnow, nullable = False)

    sessions: Mapped[List["AuthSession"]] = relationship(back_populates = "user", cascade = "all, delete-orphan")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key = True, autoincrement = True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.id"), nullable = False, index = True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable = False, unique = True, index = True)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable = False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.utcnow, nullable = False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable = True)

    user: Mapped["UserAccount"] = relationship(back_populates = "sessions")



class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key = True, autoincrement = True)
    scenario_id: Mapped[Optional[int]] = mapped_column(Integer, nullable = True)
    
    module_type: Mapped[str] = mapped_column(String(50), nullable = False)
    algorithm_key: Mapped[str] = mapped_column(String(50), nullable = False)
    
    config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable = False)
    summary: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable = False)
    timeline: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable = False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.utcnow, nullable = False)



class BenchmarkJob(Base):
    __tablename__ = "benchmark_jobs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key = True, autoincrement = True)
    module_type: Mapped[str] = mapped_column(String(50), nullable = False)

    config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable = False)
    
    status: Mapped[str] = mapped_column(String, nullable = False)
    progress: Mapped[float] = mapped_column(Float, nullable = False)
    
    summary: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable = False)
    results: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable = False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.utcnow, nullable = False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable = True)


