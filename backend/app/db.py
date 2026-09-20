from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Import models so SQLModel registers table schemas before create_all
import app.models # noqa

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    import app.models # ensure all models are registered
    SQLModel.metadata.create_all(engine)

# Auto-initialize DB on import
init_db()

def get_session():
    with Session(engine) as session:
        yield session
