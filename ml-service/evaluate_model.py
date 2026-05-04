# evaluate_model.py

"""
MODEL EVALUATION + PROMOTION SCRIPT
-------------------------------------
Evaluates the candidate model against production.
Promotes candidate if it performs better.

Fixes applied:
  - Now imports all paths from config.py (was fully hardcoded)
  - Removed "login_date" from DROP_COLUMNS (column doesn't exist)
  - encoder.transform() on unseen labels crashed — now handles gracefully
  - Uses patient-stratified evaluation split to prevent data leakage
  - Added R² alongside MAE for a more complete picture
"""

import os
import pandas as pd
import joblib
import logging

from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupShuffleSplit

from config import (
    DATASET_PATH,
    MODEL_STAGING_PATH,
    MODEL_PRODUCTION_PATH,
    ENCODER_PATH,
    FEATURE_LIST_PATH,
    TARGET_COLUMN,
    DROP_COLUMNS,
)

from db_service import fetch_all_sessions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ===============================
# LOAD DATASET (CSV + DB)
# ===============================

logger.info("[evaluate] Loading CSV dataset...")
df_csv = pd.read_csv(DATASET_PATH)

logger.info("[evaluate] Fetching PostgreSQL records...")
df_db = fetch_all_sessions()

if len(df_db) > 0:
    df = pd.concat([df_csv, df_db], ignore_index=True)
else:
    df = df_csv

logger.info(f"[evaluate] Total rows: {len(df)}")


# ===============================
# CLEAN DATA
# ===============================

# Keep PID for stratified split
pid_series = df["PID"].fillna("unknown") if "PID" in df.columns else pd.Series(["unknown"] * len(df))

# FIX: removed "login_date" — does not exist in dataset
df = df.drop(columns=DROP_COLUMNS, errors="ignore")
df = df.dropna(subset=[TARGET_COLUMN])
df = df.reset_index(drop=True)
pid_series = pid_series.iloc[:len(df)].reset_index(drop=True)


# ===============================
# LOAD ARTIFACTS
# ===============================

logger.info("[evaluate] Loading encoders and feature list...")

encoders     = joblib.load(ENCODER_PATH)
feature_list = joblib.load(FEATURE_LIST_PATH)


# ===============================
# APPLY ENCODERS
# FIX: original called encoder.transform() on raw column values including
#      unseen labels — this raised ValueError and crashed the whole script.
#      Now maps unseen labels to the first known class safely.
# ===============================

X = df.drop(columns=[TARGET_COLUMN])
y = df[TARGET_COLUMN]

for col, encoder in encoders.items():
    if col in X.columns:
        def safe_encode(val, enc):
            s = str(val)
            return s if s in enc.classes_ else enc.classes_[0]

        X[col] = X[col].apply(lambda v: safe_encode(v, encoder))
        X[col] = encoder.transform(X[col].astype(str))

X = X.fillna(0)

# Align features to training feature list
for col in feature_list:
    if col not in X.columns:
        X[col] = 0
X = X.reindex(columns=feature_list, fill_value=0)


# ===============================
# PATIENT-STRATIFIED EVAL SPLIT
# FIX: original evaluated on full dataset — same patients in train+eval
#      caused misleadingly perfect metrics
# ===============================

logger.info("[evaluate] Creating patient-stratified eval split...")

gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=99)
_, test_idx = next(gss.split(X, y, groups=pid_series))

X_eval = X.iloc[test_idx]
y_eval = y.iloc[test_idx]

logger.info(f"[evaluate] Eval set: {len(X_eval)} rows")


# ===============================
# EVALUATE CANDIDATE MODEL
# ===============================

logger.info("[evaluate] Loading candidate model...")
candidate_model = joblib.load(MODEL_STAGING_PATH)

candidate_preds = candidate_model.predict(X_eval)
candidate_mae   = mean_absolute_error(y_eval, candidate_preds)
candidate_r2    = r2_score(y_eval, candidate_preds)

logger.info(f"[evaluate] Candidate  — MAE: {candidate_mae:.4f} | R²: {candidate_r2:.4f}")


# ===============================
# COMPARE WITH PRODUCTION MODEL
# ===============================

if os.path.exists(MODEL_PRODUCTION_PATH):

    logger.info("[evaluate] Loading production model...")
    production_model = joblib.load(MODEL_PRODUCTION_PATH)

    prod_preds = production_model.predict(X_eval)
    prod_mae   = mean_absolute_error(y_eval, prod_preds)
    prod_r2    = r2_score(y_eval, prod_preds)

    logger.info(f"[evaluate] Production — MAE: {prod_mae:.4f} | R²: {prod_r2:.4f}")

    if candidate_mae < prod_mae:
        logger.info("[evaluate] ✅ Candidate is better. Promoting to production.")
        os.makedirs(os.path.dirname(MODEL_PRODUCTION_PATH), exist_ok=True)
        joblib.dump(candidate_model, MODEL_PRODUCTION_PATH)
        promoted = True
    else:
        logger.info("[evaluate] ⏸ Production model is still better. No promotion.")
        promoted = False

else:
    logger.info("[evaluate] No production model found. Promoting candidate automatically.")
    os.makedirs(os.path.dirname(MODEL_PRODUCTION_PATH), exist_ok=True)
    joblib.dump(candidate_model, MODEL_PRODUCTION_PATH)
    promoted = True

# Return result for retrain_service to read
if __name__ == "__main__":
    print("PROMOTED" if promoted else "NOT_PROMOTED")