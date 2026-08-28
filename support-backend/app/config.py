"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable loading."""

    # App
    app_env: str = "development"
    app_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    # Database (Supabase)
    supabase_url: str = ""
    supabase_key: str = ""

    # AWS General
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # AWS Cognito
    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""

    # AWS S3
    s3_bucket_name: str = "support-system-uploads"

    # Email delivery
    # Which transport actually sends mail: "ses" (AWS SES) or "smtp" (e.g.
    # Gmail SMTP). SMTP has no sandbox, so it can email any recipient
    # immediately without per-address verification.
    email_provider: str = "ses"

    # AWS SES
    ses_from_email: str = ""

    # SMTP (used when email_provider == "smtp")
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    # Sender address for SMTP. Falls back to ses_from_email / smtp_username.
    smtp_from_email: str = ""

    # AWS CloudWatch
    cloudwatch_log_group: str = "/support-system/api"
    cloudwatch_log_stream: str = "development"

    # Jira Integration
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
