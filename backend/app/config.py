from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app/app.db"
    redis_url: str = "redis://localhost:6379"
    env: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    log_level: str = "INFO"
    auth_session_hours: int = 168
    auth_password_iterations: int = 600000

    model_config = SettingsConfigDict(
        env_file = ENV_FILE,
        env_file_encoding = "utf-8",
        case_sensitive = False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()