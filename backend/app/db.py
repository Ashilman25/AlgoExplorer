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
_table_to_model = {}


for mapper in Base.registry.mappers:
    table = mapper.local_table
    model_class = mapper.class_
    
    _table_to_model[table] = model_class


def init_db():
    Base.metadata.create_all(bind = engine)

def get_db():
    return SessionLocal()

def insert_one(obj):
    db = get_db()
    db.add(obj)
    db.commit()
    db.close()

def insert_many(objs):
    db = get_db()
    db.add_all(objs)
    db.commit()
    db.close()

def reset_all_tables():
    db = get_db()
    for table in reversed(Base.metadata.sorted_tables):
        model = _table_to_model.get(table)
        if model:
            db.query(model).delete()
            
    db.commit()
    db.close()
    
def replace_all(delete_models: list, insert_objs: list):
    db = get_db()
    for model in delete_models:
        db.query(model).delete()
        
    db.add_all(insert_objs)
    db.commit()
    db.close()