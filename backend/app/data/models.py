from typing import Optional, Dict, List
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey

class Base(DeclarativeBase):
    pass