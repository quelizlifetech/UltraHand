# config.py
# ULTRAHAND — Central Configuration

# ---------------------------------------------------------------
# DATASET
# ---------------------------------------------------------------
DATASET_PATH = "ultrahand_dataset.csv"

# ---------------------------------------------------------------
# MODEL PATHS
# ---------------------------------------------------------------
MODEL_PRODUCTION_PATH = "models/production/progression_model.pkl"
MODEL_STAGING_PATH    = "models/staging/candidate_model.pkl"
ENCODER_PATH          = "models/encoders.pkl"
FEATURE_LIST_PATH     = "models/feature_list.pkl"

# ---------------------------------------------------------------
# TRAINING SETTINGS
# ---------------------------------------------------------------
TARGET_COLUMN = "session_progress_score"

CATEGORICAL_COLUMNS = [
    "Diagnosis", "Category", "Hand_Side",
    "Therapy_Mode", "affected_joints", "severity_level",
]

DROP_COLUMNS = ["PID", "Day"]

# ---------------------------------------------------------------
# JOINT ANGLE COLUMNS  (degrees)
# ---------------------------------------------------------------
JOINT_ANGLE_COLUMNS = [
    "index_mcp",  "index_pip",  "index_dip",
    "middle_mcp", "middle_pip", "middle_dip",
    "ring_mcp",   "ring_pip",   "ring_dip",
    "little_mcp", "little_pip", "little_dip",
    "thumb_mcp",  "thumb_ip",
    "wrist_flexion", "wrist_extension",
    "wrist_radial_dev", "wrist_ulnar_dev",
]

# Standard healthy ROM per joint (degrees) — recovery target
JOINT_NORMAL_ROM = {
    "index_mcp": 90,   "index_pip": 100,  "index_dip": 80,
    "middle_mcp": 90,  "middle_pip": 100, "middle_dip": 80,
    "ring_mcp": 90,    "ring_pip": 100,   "ring_dip": 80,
    "little_mcp": 90,  "little_pip": 100, "little_dip": 80,
    "thumb_mcp": 60,   "thumb_ip": 80,
    "wrist_flexion": 80,    "wrist_extension": 70,
    "wrist_radial_dev": 20, "wrist_ulnar_dev": 35,
}

RECOVERY_TARGET_PCT = 1.0   # Patient recovers to 100% of normal ROM

# ---------------------------------------------------------------
# RETRAINING
# ---------------------------------------------------------------
RETRAIN_THRESHOLD = 500
TRACKING_FILE     = "last_training_size.txt"

# ---------------------------------------------------------------
# THERAPY MODE ORDER
# ---------------------------------------------------------------
THERAPY_MODE_PROGRESSION = [
    "Mechanical Stimulation",
    "Passive",
    "Assistive",
    "Active",
]

# ---------------------------------------------------------------
# SESSION PLAN — MODE BANDS
# Each mode is used during a specific % band of total recovery.
# Active appears only in the final 15% — the discharge/independence stage.
# ---------------------------------------------------------------
MODE_THRESHOLDS = {
    "Mechanical Stimulation": (0.00, 0.25),
    "Passive":                (0.25, 0.55),
    "Assistive":              (0.55, 0.85),
    "Active":                 (0.85, 1.00),
}

# ---------------------------------------------------------------
# DETAILED INTENSITY PROGRESSION
#
# Within each mode, intensity/speed increases as the patient
# progresses through that mode's recovery % band.
#
# Each sub-phase is:
#   (recovery_pct_start, recovery_pct_end,
#    speed, intensity, duration_bonus_min, reps_bonus)
#
# duration_bonus and reps_bonus are ADDED to the base values.
# ---------------------------------------------------------------
MODE_INTENSITY_STEPS = {
    "Mechanical Stimulation": [
        # pct_from  pct_to   speed      intensity   +min  +reps
        (0.00,      0.08,   "Low",     "Minimal",    0,    0),
        (0.08,      0.17,   "Low",     "Low",        5,    5),
        (0.17,      0.25,   "Medium",  "Low",       10,   10),
    ],
    "Passive": [
        (0.25,      0.35,   "Low",     "Low",        0,    0),
        (0.35,      0.45,   "Low",     "Moderate",   5,    5),
        (0.45,      0.55,   "Medium",  "Moderate",  10,   10),
    ],
    "Assistive": [
        (0.55,      0.65,   "Low",     "Moderate",   0,    0),
        (0.65,      0.75,   "Medium",  "Moderate",   5,    5),
        (0.75,      0.85,   "Medium",  "High",      10,   10),
    ],
    "Active": [
        (0.85,      0.92,   "Medium",  "High",       0,    0),
        (0.92,      1.01,   "High",    "High",       5,    5),
    ],
}

# Fallback: settings review every N sessions (adjusts duration/reps for fatigue only)
SETTINGS_REVIEW_INTERVAL = 7

# Safety cap on simulated sessions
MAX_PLAN_SESSIONS = 200

# ---------------------------------------------------------------
# POSTGRESQL — uncomment when integrating with web app
# ---------------------------------------------------------------
# import os
# DB_CONFIG = {
#     "host":     os.getenv("DB_HOST",     "localhost"),
#     "port":     int(os.getenv("DB_PORT", "5432")),
#     "dbname":   os.getenv("DB_NAME",     "ultrahand"),
#     "user":     os.getenv("DB_USER",     "postgres"),
#     "password": os.getenv("DB_PASSWORD", ""),
# }
# DB_TABLE = "patient_sessions"