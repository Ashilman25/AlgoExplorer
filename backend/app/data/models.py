from typing import Optional, Dict, List, Any
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, JSON

class Base(DeclarativeBase):
    pass



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



