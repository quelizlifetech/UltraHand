# db_service.py
# ULTRAHAND — Database Service (Stub Mode)
# No PostgreSQL required. Returns safe empty values.
# When ready to connect PostgreSQL, uncomment the LIVE VERSION
# blocks inside each function and uncomment DB_CONFIG in config.py.

import pandas as pd
import logging

logger = logging.getLogger(__name__)


def ensure_table_exists():
    # STUB — no database connected
    # LIVE VERSION: uncomment below after enabling DB_CONFIG in config.py
    # from config import DB_CONFIG, DB_TABLE
    # import psycopg2
    # sql = f"""CREATE TABLE IF NOT EXISTS {DB_TABLE} (
    #     id SERIAL PRIMARY KEY,
    #     pid VARCHAR(50), day INTEGER,
    #     diagnosis VARCHAR(100), category VARCHAR(100),
    #     hand_side VARCHAR(20), sessions_per_day INTEGER,
    #     therapy_mode VARCHAR(50), total_sessions_done INTEGER,
    #     session_duration_min FLOAT, affected_joints VARCHAR(100),
    #     severity_level VARCHAR(20), session_progress_score FLOAT,
    #     index_mcp FLOAT, index_pip FLOAT, index_dip FLOAT,
    #     middle_mcp FLOAT, middle_pip FLOAT, middle_dip FLOAT,
    #     ring_mcp FLOAT, ring_pip FLOAT, ring_dip FLOAT,
    #     little_mcp FLOAT, little_pip FLOAT, little_dip FLOAT,
    #     thumb_mcp FLOAT, thumb_ip FLOAT,
    #     wrist_flexion FLOAT, wrist_extension FLOAT,
    #     wrist_radial_dev FLOAT, wrist_ulnar_dev FLOAT,
    #     inserted_at TIMESTAMP DEFAULT NOW()
    # );"""
    # conn = psycopg2.connect(**DB_CONFIG)
    # with conn:
    #     with conn.cursor() as cur:
    #         cur.execute(sql)
    # conn.close()
    logger.info("[db_service] Stub mode — no database connected.")


def insert_patient_session(data: dict):
    # STUB — does nothing
    # LIVE VERSION: uncomment below after enabling DB_CONFIG in config.py
    # from config import DB_CONFIG, DB_TABLE
    # import psycopg2
    # normalized = {k.lower(): v for k, v in data.items()}
    # normalized.setdefault("session_progress_score", None)
    # conn = psycopg2.connect(**DB_CONFIG)
    # with conn:
    #     with conn.cursor() as cur:
    #         cur.execute("INSERT INTO " + DB_TABLE + " (...) VALUES (...)", normalized)
    # conn.close()
    logger.info("[db_service] Stub mode — session not saved to DB.")
    return None


def fetch_all_sessions() -> pd.DataFrame:
    # STUB — returns empty DataFrame, training uses CSV only
    # LIVE VERSION: uncomment below after enabling DB_CONFIG in config.py
    # from config import DB_CONFIG, DB_TABLE
    # import psycopg2
    # conn = psycopg2.connect(**DB_CONFIG)
    # df = pd.read_sql(
    #     f"SELECT * FROM {DB_TABLE} WHERE session_progress_score IS NOT NULL",
    #     conn
    # )
    # conn.close()
    # return df
    logger.info("[db_service] Stub mode — returning empty DataFrame.")
    return pd.DataFrame()


def count_db_rows() -> int:
    # STUB — returns 0
    # LIVE VERSION: uncomment below after enabling DB_CONFIG in config.py
    # from config import DB_CONFIG, DB_TABLE
    # import psycopg2
    # conn = psycopg2.connect(**DB_CONFIG)
    # with conn.cursor() as cur:
    #     cur.execute(
    #         f"SELECT COUNT(*) FROM {DB_TABLE} WHERE session_progress_score IS NOT NULL"
    #     )
    #     count = cur.fetchone()[0]
    # conn.close()
    # return int(count)
    return 0