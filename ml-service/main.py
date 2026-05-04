from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from model_service import predict_progression
import math

app = FastAPI(
    title="UltraHand ML API",
    version="2.0.0",
    description="AI Rehabilitation Planning API"
)


# ---------------------------------------------------
# INPUT MODEL
# ---------------------------------------------------
class PatientInput(BaseModel):
    data: dict


# ---------------------------------------------------
# HOME
# ---------------------------------------------------
@app.get("/")
def home():
    return {
        "success": True,
        "message": "UltraHand ML API Running"
    }


# ---------------------------------------------------
# BASIC PREDICTION
# ---------------------------------------------------
@app.post("/predict")
def predict(payload: PatientInput):
    try:
        score = predict_progression(payload.data)

        return {
            "success": True,
            "predicted_progress_score": round(float(score), 2)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ---------------------------------------------------
# FULL AI PLAN GENERATOR
# ---------------------------------------------------
@app.post("/generate-plan")
def generate_plan(payload: PatientInput):
    try:
        data = payload.data

        # -----------------------------------------
        # Predict Score
        # -----------------------------------------
        score = float(
            predict_progression(data)
        )

        # Safe range
        score = max(1, min(100, score))

        # -----------------------------------------
        # Extract ROM Values
        # -----------------------------------------
        rom_keys = [
            "index_mcp",
            "index_pip",
            "index_dip",
            "middle_mcp",
            "middle_pip",
            "middle_dip",
            "ring_mcp",
            "ring_pip",
            "ring_dip",
            "little_mcp",
            "little_pip",
            "little_dip",
            "thumb_mcp",
            "thumb_ip",
            "wrist_flexion",
            "wrist_extension",
            "wrist_radial_deviation",
            "wrist_ulnar_deviation"
        ]

        rom_values = []

        for key in rom_keys:
            val = float(data.get(key, 0))
            rom_values.append(val)

        current_avg_rom = round(
            sum(rom_values) / len(rom_values), 2
        )

        target_avg_rom = 80

        # -----------------------------------------
        # Recovery Logic
        # -----------------------------------------
        gain_per_session = round(
            max(0.8, score / 40), 2
        )

        deficit = max(
            1,
            target_avg_rom - current_avg_rom
        )

        recovery_days = math.ceil(
            deficit / gain_per_session
        )

        recovery_pct = round(
            (current_avg_rom / target_avg_rom) * 100,
            1
        )

        # -----------------------------------------
        # Mode Distribution
        # -----------------------------------------
        assistive_days = max(
            3,
            int(recovery_days * 0.55)
        )

        active_days = max(
            2,
            int(recovery_days * 0.25)
        )

        passive_days = recovery_days - (
            assistive_days + active_days
        )

        if passive_days < 0:
            passive_days = 0

        # -----------------------------------------
        # Chart Data
        # -----------------------------------------
        recovery_curve = []
        rom_now = current_avg_rom

        for day in range(1, recovery_days + 1):
            rom_now = min(
                target_avg_rom,
                rom_now + gain_per_session
            )

            recovery_curve.append({
                "day": day,
                "rom": round(rom_now, 2),
                "recoveryPercent": round(
                    (rom_now / target_avg_rom) * 100,
                    1
                )
            })

        # -----------------------------------------
        # Joint Analysis
        # -----------------------------------------
        joints = []

        for key in rom_keys:
            current = float(data.get(key, 0))
            normal = 80

            if "mcp" in key:
                normal = 90
            elif "pip" in key:
                normal = 100
            elif "dip" in key:
                normal = 80
            elif "thumb" in key:
                normal = 70
            elif "wrist_extension" in key:
                normal = 70
            elif "wrist_flexion" in key:
                normal = 80
            elif "radial" in key:
                normal = 20
            elif "ulnar" in key:
                normal = 35

            deficit_val = max(
                0,
                normal - current
            )

            progress = round(
                (current / normal) * 100,
                1
            )

            joints.append({
                "joint": key,
                "current": current,
                "normal": normal,
                "deficit": deficit_val,
                "progress": progress
            })

        # -----------------------------------------
        # Session Plan
        # -----------------------------------------
        session_plan = []

        for day in range(1, recovery_days + 1):

            if day <= passive_days:
                mode = "Passive"
                intensity = "Low"
                reps = 10
                mins = 15

            elif day <= passive_days + assistive_days:
                mode = "Assistive"
                intensity = "Moderate"
                reps = 15
                mins = 20

            else:
                mode = "Active"
                intensity = "High"
                reps = 20
                mins = 25

            session_plan.append({
                "day": day,
                "mode": mode,
                "intensity": intensity,
                "minutes": mins,
                "repetitions": reps
            })

        # -----------------------------------------
        # Warnings
        # -----------------------------------------
        warnings = []

        if recovery_days > 25:
            warnings.append(
                "Long recovery duration expected."
            )

        if current_avg_rom < 45:
            warnings.append(
                "Severe ROM restriction detected."
            )

        if score < 30:
            warnings.append(
                "Low predicted progression score."
            )

        # -----------------------------------------
        # Final Response
        # -----------------------------------------
        return {
            "success": True,

            "summary": {
                "predictedScore": round(score, 2),
                "gainPerSession": gain_per_session,
                "currentAvgROM": current_avg_rom,
                "targetAvgROM": target_avg_rom,
                "recoveryDays": recovery_days,
                "recoveryPercent": recovery_pct
            },

            "modeDistribution": {
                "passive": passive_days,
                "assistive": assistive_days,
                "active": active_days
            },

            "recoveryCurve": recovery_curve,

            "jointAnalysis": joints,

            "sessionPlan": session_plan,

            "warnings": warnings
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )