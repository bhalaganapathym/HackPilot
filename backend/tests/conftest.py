import os
import tempfile
from pathlib import Path

import pytest
from sqlmodel import SQLModel

test_db_path = Path(tempfile.gettempdir()) / f"hackpilot-test-{os.getpid()}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path.as_posix()}"

from app.db import engine, init_db

@pytest.fixture(autouse=True, scope="session")
def setup_database():
    SQLModel.metadata.drop_all(engine)
    init_db()
    yield
    SQLModel.metadata.drop_all(engine)
    engine.dispose()
    if test_db_path.exists():
        test_db_path.unlink()
