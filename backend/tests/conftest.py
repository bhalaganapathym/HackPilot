import pytest
from sqlmodel import SQLModel
from app.db import engine, init_db

@pytest.fixture(autouse=True, scope="session")
def setup_database():
    # Ensure all models are imported and tables created
    init_db()
    yield
