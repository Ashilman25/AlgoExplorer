from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.data.models import Base
from app.config import settings

engine = create_engine(settings.database_url)

@event.listens_for(engine, "connect")
def enable_sqlite_fk(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
    
SessionLocal = sessionmaker(bind = engine)


def init_db():
    Base.metadata.create_all(bind = engine)

def get_db():
    db = SessionLocal()
    
    try:
        yield db
    finally:
        db.close()

