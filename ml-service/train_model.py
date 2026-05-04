# train_model.py

"""
ULTRAHAND — MODEL TRAINING SCRIPT
===================================
Trains a RandomForest regression model to predict
session_progress_score using all features including
per-joint angle measurements (MCP, PIP, DIP, Wrist).

═══════════════════════════════════════════════════════════════
 POSTGRESQL INTEGRATION NOTE (for backend developer)
═══════════════════════════════════════════════════════════════
 Once db_service.py is connected to PostgreSQL, this script
 automatically merges CSV + live patient records before
 training. No changes needed here.
═══════════════════════════════════════════════════════════════

Run:
    python train_model.py
"""

import os
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score

from config import (
    DATASET_PATH,
    MODEL_STAGING_PATH,
    ENCODER_PATH,
    FEATURE_LIST_PATH,
    TARGET_COLUMN,
    CATEGORICAL_COLUMNS,
    DROP_COLUMNS,
)
from db_service import fetch_all_sessions


# ── Load CSV ──────────────────────────────────────────────────────────────────

print("\n[train] Loading CSV dataset...")
df_csv = pd.read_csv(DATASET_PATH)
print(f"[train] CSV rows    : {len(df_csv)}")
print(f"[train] CSV columns : {list(df_csv.columns)}")


# ── Load DB records (stub returns empty DataFrame until PostgreSQL connected) ──

print("[train] Fetching records from database...")
df_db = fetch_all_sessions()
print(f"[train] DB rows     : {len(df_db)}")


# ── Merge ─────────────────────────────────────────────────────────────────────

if len(df_db) > 0:
    df = pd.concat([df_csv, df_db], ignore_index=True)
    print(f"[train] Combined    : {len(df)} rows")
else:
    df = df_csv
    print("[train] Training on CSV only.")


# ── Keep PID for stratified split ─────────────────────────────────────────────

pid_series = df["PID"].fillna("unknown") if "PID" in df.columns else pd.Series(["unknown"] * len(df))

df = df.drop(columns=DROP_COLUMNS, errors="ignore")
df = df.dropna(subset=[TARGET_COLUMN])
df = df.reset_index(drop=True)
pid_series = pid_series.iloc[:len(df)].reset_index(drop=True)

print(f"[train] Rows after cleaning: {len(df)}")


# ── Encode ALL string/object columns ──────────────────────────────────────────
# Encodes columns from CATEGORICAL_COLUMNS config list PLUS any other
# string columns auto-detected in the CSV (safety net for unexpected text cols)

print("[train] Encoding categorical features...")
encoders = {}

all_string_cols = df.select_dtypes(include='object').columns.tolist()
if TARGET_COLUMN in all_string_cols:
    all_string_cols.remove(TARGET_COLUMN)

cols_to_encode = list(dict.fromkeys(CATEGORICAL_COLUMNS + all_string_cols))

for col in cols_to_encode:
    if col in df.columns and col != TARGET_COLUMN:
        enc = LabelEncoder()
        df[col] = enc.fit_transform(df[col].astype(str))
        encoders[col] = enc
        print(f"  Encoded: {col}  ({len(enc.classes_)} classes)")

# Drop any remaining object columns that could not be encoded
remaining_obj = [c for c in df.select_dtypes(include='object').columns if c != TARGET_COLUMN]
if remaining_obj:
    print(f"[train] Dropping un-encodable columns: {remaining_obj}")
    df = df.drop(columns=remaining_obj)


# ── Prepare features ──────────────────────────────────────────────────────────

X = df.drop(columns=[TARGET_COLUMN])
y = df[TARGET_COLUMN]
X = X.fillna(0)

feature_list = list(X.columns)
print(f"[train] Total features: {len(feature_list)}")
print(f"[train] Features: {feature_list}")


# ── Patient-stratified train/test split ───────────────────────────────────────

print("[train] Splitting dataset (patient-stratified)...")
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=pid_series))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
print(f"  Train: {len(X_train)} rows  |  Test: {len(X_test)} rows")


# ── Train ─────────────────────────────────────────────────────────────────────

print("[train] Training RandomForest model...")
model = RandomForestRegressor(
    n_estimators=400,
    max_depth=14,
    min_samples_leaf=4,
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

preds = model.predict(X_test)
mae   = mean_absolute_error(y_test, preds)
r2    = r2_score(y_test, preds)
print(f"[train] Candidate model — MAE: {mae:.4f}  |  R²: {r2:.4f}")


# ── Save ──────────────────────────────────────────────────────────────────────

os.makedirs(os.path.dirname(MODEL_STAGING_PATH), exist_ok=True)
os.makedirs(os.path.dirname(ENCODER_PATH),        exist_ok=True)

joblib.dump(model,        MODEL_STAGING_PATH)
joblib.dump(encoders,     ENCODER_PATH)
joblib.dump(feature_list, FEATURE_LIST_PATH)

print(f"\n[train] Candidate model → {MODEL_STAGING_PATH}")
print(f"[train] Encoders        → {ENCODER_PATH}")
print(f"[train] Feature list    → {FEATURE_LIST_PATH}")
print("[train] Done.\n")