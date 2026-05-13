from fastapi import FastAPI, HTTPException
from typing import Dict, Any

from simulator_service import generate_full_plan
from model_service import predict_progression

app = FastAPI(
    title="UltraHand ML API",
    version="4.0.0",
    description="Clinical-grade AI Rehabilitation Planning System"
)


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
# BASIC MODEL TEST (optional)
# ---------------------------------------------------
@app.post("/predict")
def predict(payload: Dict[str, Any]):
    try:
        score = predict_progression(payload)

        return {
            "success": True,
            "predicted_progress_score": round(float(score), 3)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ---------------------------------------------------
# FULL AI PLAN (REAL ENGINE)
# ---------------------------------------------------
@app.post("/generate-plan")
def generate_plan(payload: Dict[str, Any]):
    try:
        # 🔥 Use full simulator (THIS IS THE REAL FIX)
        plan = generate_full_plan(payload)

        sessions = plan.get("sessions", [])

        # -----------------------------------------
        # Recovery Curve (for charts)
        # -----------------------------------------
        recovery_curve = [
            {
                "day": s["day"],
                "avgROM": s["avg_rom_after"],
                "recoveryPercent": s["recovery_pct"]
            }
            for s in sessions
        ]

        # -----------------------------------------
        # Day-wise Table
        # -----------------------------------------
        daywise = [
            {
                "day": s["day"],
                "phase": s["therapy_mode"],
                "intensity": s["intensity"],
                "repetitions": s["repetitions"],
                "avgROM": s["avg_rom_after"]
            }
            for s in sessions
        ]

        # -----------------------------------------
        # Summary
        # -----------------------------------------
        total_days = plan.get("total_days_to_recovery", 0)
        starting_rom = plan.get("initial_avg_rom", 0)
        target_rom = plan.get("standard_normal_avg_rom", 80)

        recovery_pct = (
            (starting_rom / target_rom) * 100
            if target_rom > 0 else 0
        )

        # -----------------------------------------
        # FINAL RESPONSE
        # -----------------------------------------
        return {
            "success": True,

            "summary": {
                "totalDays": total_days,
                "currentAvgROM": starting_rom,
                "targetAvgROM": target_rom,
                "recoveryPercent": round(recovery_pct, 1),
                "riskLevel": "Low" if total_days < 20 else "Moderate" if total_days < 40 else "High"
            },

            "journey": plan.get("journey", []),

            "modeDistribution": {
                "Mechanical Stimulation": sum(1 for s in sessions if s["therapy_mode"] == "Mechanical Stimulation"),
                "Passive": sum(1 for s in sessions if s["therapy_mode"] == "Passive"),
                "Assistive": sum(1 for s in sessions if s["therapy_mode"] == "Assistive"),
                "Active": sum(1 for s in sessions if s["therapy_mode"] == "Active"),
            },

            "recoveryCurve": recovery_curve,
            "daywisePlan": daywise,

            "planGroups": plan.get("plan_groups", []),
            "jointSummary": plan.get("joint_summary", {}),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )