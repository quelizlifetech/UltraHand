# model_service.py

"""
ULTRAHAND — MODEL SERVICE
==========================
Loads production model and runs predictions.
Handles all joint angle fields (MCP, PIP, DIP, Wrist).

═══════════════════════════════════════════════════════════════
 FLASK / FASTAPI INTEGRATION NOTE (for backend developer)
═══════════════════════════════════════════════════════════════
 Call predict_progression(patient_data) from your API route.
 patient_data = incoming JSON body as a Python dict.

 Example Flask:
 ─────────────────────────────────────────────────────────────
 from model_service import predict_progression

 @app.route("/predict", methods=["POST"])
 def predict():
     data  = request.get_json()
     score = predict_progression(data)
     # insert_patient_session(data)  ← uncomment when DB connected
     # check_and_retrain()           ← uncomment when DB connected
     return jsonify({"predicted_progress_score": score})
 ─────────────────────────────────────────────────────────────
"""

import joblib
import pandas as pd
import logging

from config import MODEL_PRODUCTION_PATH, ENCODER_PATH, FEATURE_LIST_PATH

logger = logging.getLogger(__name__)


# ── Load artifacts ────────────────────────────────────────────────────────────

def _load_artifacts():
    try:
        model        = joblib.load(MODEL_PRODUCTION_PATH)
        encoders     = joblib.load(ENCODER_PATH)
        feature_list = joblib.load(FEATURE_LIST_PATH)
        logger.info("[model_service] Production model loaded.")
        return model, encoders, feature_list
    except FileNotFoundError as e:
        raise RuntimeError(
            f"[model_service] Model file not found: {e}\n"
            "Run: python train_model.py  then  python evaluate_model.py"
        ) from e


_model, _encoders, _feature_list = _load_artifacts()


def reload_model():
    """
    Hot-reloads model from disk after retraining promotes a new version.
    Called automatically by retrain_service — no changes needed here.
    """
    global _model, _encoders, _feature_list
    _model, _encoders, _feature_list = _load_artifacts()
    logger.info("[model_service] Model hot-reloaded.")


# ── Preprocess ────────────────────────────────────────────────────────────────

def preprocess_input(data: dict) -> pd.DataFrame:
    """
    Converts patient data dict into ML feature DataFrame.
    Handles joint angles, categorical encoding, and feature alignment.
    """
    df = pd.DataFrame([data])
    df.columns = [c.strip() for c in df.columns]

    # Encode categorical columns
    for col, encoder in _encoders.items():
        if col in df.columns:
            raw = str(df[col].iloc[0])
            if raw not in encoder.classes_:
                logger.warning(f"[model_service] Unknown label '{raw}' for '{col}' — using fallback.")
                raw = encoder.classes_[0]
            df[col] = encoder.transform([raw])[0]

    df = df.fillna(0)

    # Align to exact training feature set
    df = df.reindex(columns=_feature_list, fill_value=0)

    return df


# ── Predict ───────────────────────────────────────────────────────────────────

def predict_progression(data: dict) -> float:
    """
    Predicts expected ROM progress score for one therapy session.

    Args:
        data: dict containing patient features including joint angles

    Returns:
        float — predicted session_progress_score
    """
    try:
        df    = preprocess_input(data)
        score = _model.predict(df)[0]
        return float(score)
    except Exception as e:
        logger.error(f"[model_service] Prediction failed: {e}")
        raise