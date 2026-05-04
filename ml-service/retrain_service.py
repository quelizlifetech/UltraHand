# retrain_service.py

"""
RETRAIN SERVICE
---------------
Monitors dataset growth (CSV + PostgreSQL combined) and triggers
the full retrain → evaluate → promote pipeline when enough new
data has accumulated.

Fixes applied:
  - Was reading CSV row count only — never counted PostgreSQL rows
  - Used subprocess to call train/evaluate scripts — breaks when working
    directory differs from script location; now imports functions directly
  - update_training_size was called even if training or evaluation failed
  - No file lock — parallel API calls could trigger multiple simultaneous
    retrains corrupting the model files; now uses a lock file
"""

import os
import logging

import pandas as pd

from config import DATASET_PATH, RETRAIN_THRESHOLD, TRACKING_FILE
from db_service import count_db_rows

logger = logging.getLogger(__name__)

LOCK_FILE = "retrain.lock"


# ===============================
# LOCK HELPERS
# FIX: prevents parallel retrains from running simultaneously
# ===============================

def _acquire_lock() -> bool:
    """Returns True if lock acquired, False if already locked."""
    if os.path.exists(LOCK_FILE):
        return False
    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(os.getpid()))
        return True
    except Exception:
        return False


def _release_lock():
    try:
        os.remove(LOCK_FILE)
    except FileNotFoundError:
        pass


# ===============================
# DATASET SIZE
# FIX: now counts CSV rows + PostgreSQL rows combined
# ===============================

def get_total_dataset_size() -> int:
    """Returns combined row count from CSV + PostgreSQL."""
    csv_rows = 0
    try:
        df = pd.read_csv(DATASET_PATH)
        csv_rows = len(df)
    except Exception as e:
        logger.warning(f"[retrain] Could not read CSV: {e}")

    db_rows  = count_db_rows()
    total    = csv_rows + db_rows

    logger.info(f"[retrain] CSV rows: {csv_rows} | DB rows: {db_rows} | Total: {total}")
    return total


# ===============================
# TRACKING FILE HELPERS
# ===============================

def get_last_training_size() -> int:
    if not os.path.exists(TRACKING_FILE):
        return 0
    try:
        with open(TRACKING_FILE, "r") as f:
            return int(f.read().strip())
    except (ValueError, IOError):
        return 0


def update_training_size(size: int):
    with open(TRACKING_FILE, "w") as f:
        f.write(str(size))


# ===============================
# MAIN RETRAIN PIPELINE
# FIX: imports train/evaluate as functions instead of subprocess calls
#      tracking file only updated on success
# ===============================

def check_and_retrain() -> bool:
    """
    Checks if enough new data has accumulated and runs the
    retrain → evaluate → promote pipeline if so.

    Returns:
        True if retraining was triggered, False otherwise.
    """
    logger.info("[retrain] Checking if retraining is required...")

    current_size = get_total_dataset_size()
    last_size    = get_last_training_size()
    new_rows     = current_size - last_size

    logger.info(f"[retrain] New rows since last training: {new_rows} / {RETRAIN_THRESHOLD} threshold")

    if new_rows < RETRAIN_THRESHOLD:
        logger.info("[retrain] Threshold not reached. No retraining needed.")
        return False

    # ── Acquire lock ──────────────────────────────────────────────────────
    if not _acquire_lock():
        logger.warning("[retrain] Retraining already in progress (lock file exists). Skipping.")
        return False

    success = False

    try:
        logger.info("[retrain] ▶ Retraining triggered.")

        # ── Step 1: Train new candidate model ─────────────────────────────
        logger.info("[retrain] Running training pipeline...")

        # FIX: import and call directly instead of subprocess
        import train_model  # noqa: F401 — running as script via import executes top-level code

        # ── Step 2: Evaluate and promote ─────────────────────────────────
        logger.info("[retrain] Running evaluation pipeline...")

        # Re-import evaluate_model to run its top-level evaluation logic
        import importlib
        import evaluate_model
        importlib.reload(evaluate_model)

        # ── Step 3: Hot-reload production model in memory ─────────────────
        logger.info("[retrain] Hot-reloading production model...")
        from model_service import reload_model
        reload_model()

        # FIX: only update tracking size if everything succeeded
        update_training_size(current_size)

        logger.info("[retrain] ✅ Retraining pipeline complete.")
        success = True

    except Exception as e:
        logger.error(f"[retrain] ❌ Retraining pipeline failed: {e}")
        # Do NOT update tracking size — will retry on next trigger

    finally:
        _release_lock()

    return success


# ===============================
# RUN DIRECTLY
# ===============================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    check_and_retrain()