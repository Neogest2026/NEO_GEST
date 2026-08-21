import os
from pathlib import Path


def load_env_file():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        clean_line = line.strip()
        if not clean_line or clean_line.startswith("#") or "=" not in clean_line:
            continue
        key, value = clean_line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()


DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:1234@localhost/neogest")
SECRET_KEY = os.getenv("SECRET_KEY", "neogest-dev-secret-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

COMPANY_NAME = os.getenv("COMPANY_NAME", "NEOGEST MODERNA")
COMPANY_NIT = os.getenv("COMPANY_NIT", "NIT-900000000-0")
COMPANY_ADDRESS = os.getenv("COMPANY_ADDRESS", "Bogota, Colombia")
COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", "facturacion@neogest.local")
COMPANY_PHONE = os.getenv("COMPANY_PHONE", "+57 300 123 4567")
INVOICE_PREFIX = os.getenv("INVOICE_PREFIX", "NG-FE")
INVOICE_RESOLUTION = os.getenv("INVOICE_RESOLUTION", "Resolucion demo sin validez fiscal externa")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", COMPANY_EMAIL)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
