from fastapi import FastAPI, HTTPException
from typing import Dict, Any

from simulator_service import generate_full_plan
from model_service import predict_progression

app = FastAPI(
    title="UltraHand ML API",
    version="4.1.0",
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
# HELPER — Compute success chance
# ---------------------------------------------------
def _compute_success_chance(
    total_days: int,
    final_recovery_pct: float,
    starting_rom_pct: float
) -> float:
    """
    Real success chance calculation (not just mirroring recoveryPercent).

    Factors:
    - Final recovery % achieved (most important)
    - Treatment duration (longer = riskier)
    - Starting baseline (lower start = harder journey)
    """
    # Base from final recovery achieved
    base = final_recovery_pct

    # Duration penalty: ideal recovery is 15-25 days
    if total_days <= 20:
        duration_penalty = 0
    elif total_days <= 30:
        duration_penalty = (total_days - 20) * 1.0
    else:
        duration_penalty = 10 + (total_days - 30) * 2.0

    # Severity bonus: patients starting lower get a small confidence
    # boost when they reach high recovery (proves the plan worked)
    if starting_rom_pct < 50 and final_recovery_pct > 90:
        severity_bonus = 5
    else:
        severity_bonus = 0

    score = base - duration_penalty + severity_bonus
    return round(min(95, max(40, score)), 1)


# ---------------------------------------------------
# HELPER — Compute risk level (multi-factor)
# ---------------------------------------------------
def _compute_risk_level(
    total_days: int,
    starting_rom_pct: float,
    final_recovery_pct: float,
    age: int = 40
) -> str:
    """
    Multi-factor risk assessment.
    Considers duration, severity, recovery achieved, and age.
    """
    risk_score = 0

    # Duration risk
    if total_days > 40:
        risk_score += 3
    elif total_days > 25:
        risk_score += 2
    elif total_days > 15:
        risk_score += 1

    # Severity risk
    if starting_rom_pct < 40:
        risk_score += 3
    elif starting_rom_pct < 60:
        risk_score += 2
    elif starting_rom_pct < 75:
        risk_score += 1

    # Recovery shortfall risk
    if final_recovery_pct < 70:
        risk_score += 3
    elif final_recovery_pct < 85:
        risk_score += 2
    elif final_recovery_pct < 95:
        risk_score += 1

    # Age risk
    if age >= 70:
        risk_score += 2
    elif age >= 55:
        risk_score += 1

    if risk_score <= 2:
        return "Low"
    elif risk_score <= 5:
        return "Moderate"
    else:
        return "High"


# ---------------------------------------------------
# FULL AI PLAN (REAL ENGINE)
# ---------------------------------------------------
@app.post("/generate-plan")
def generate_plan(payload: Dict[str, Any]):
    try:
        # Run the full simulator
        plan = generate_full_plan(payload)

        sessions = plan.get("sessions", [])

        # Validate simulator produced output
        if not sessions:
            raise HTTPException(
                status_code=500,
                detail="Simulator produced no sessions. Check patient data."
            )

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
                "avgROM": s["avg_rom_after"],
                "recoveryPercent": s["recovery_pct"]
            }
            for s in sessions
        ]

        # -----------------------------------------
        # Summary metrics
        # -----------------------------------------
        total_days = plan.get("total_days_to_recovery", 0)
        starting_rom = plan.get("initial_avg_rom", 0)
        target_rom = plan.get("standard_normal_avg_rom", 80)
        final_rom = sessions[-1]["avg_rom_after"]

        # Baseline recovery: where the patient STARTED (% of normal)
        baseline_recovery_pct = (
            round((starting_rom / target_rom) * 100, 1)
            if target_rom > 0 else 0
        )

        # Predicted recovery: where the patient ENDS (% of journey complete)
        predicted_recovery_pct = round(
            sessions[-1]["recovery_pct"], 1
        )

        # Final ROM as % of normal (how close to "fully healthy")
        final_rom_pct = (
            round((final_rom / target_rom) * 100, 1)
            if target_rom > 0 else 0
        )

        # Target reached day (first day recovery hit 99%+)
        target_reached_day = next(
            (s["day"] for s in sessions if s["recovery_pct"] >= 99),
            None
        )

        # Patient age (for risk calculation)
        try:
            age = int(payload.get("age", 40))
        except (TypeError, ValueError):
            age = 40

        # Real success chance + risk
        success_chance = _compute_success_chance(
            total_days,
            predicted_recovery_pct,
            baseline_recovery_pct
        )

        risk_level = _compute_risk_level(
            total_days,
            baseline_recovery_pct,
            predicted_recovery_pct,
            age
        )

        # -----------------------------------------
        # Mode Distribution (only actual modes used)
        # -----------------------------------------
        mode_distribution = {}
        for s in sessions:
            mode = s["therapy_mode"]
            mode_distribution[mode] = (
                mode_distribution.get(mode, 0) + 1
            )

        # -----------------------------------------
        # Joint Analysis (transform joint_summary
        # into the array shape the frontend expects)
        # -----------------------------------------
        joint_analysis = []
        for joint, info in plan.get("joint_summary", {}).items():
            joint_analysis.append({
                "joint": joint,
                "starting": info.get("starting_rom", 0),
                "normal": info.get("normal_rom", 0),
                "deficit": info.get("deficit", 0),
                "gain": round(
                    max(0, info.get("normal_rom", 0)
                        - info.get("starting_rom", 0)),
                    1
                )
            })

        # Sort: largest deficit first (worst joints surface)
        joint_analysis.sort(
            key=lambda x: x["deficit"],
            reverse=True
        )

        # -----------------------------------------
        # FINAL RESPONSE
        # -----------------------------------------
        return {
            "success": True,

            "summary": {
                # Timeline
                "totalDays": total_days,
                "estimatedDays": total_days,
                "targetReachedDay": target_reached_day,

                # ROM metrics
                "currentAvgROM": starting_rom,
                "targetAvgROM": target_rom,
                "finalAvgROM": final_rom,

                # Recovery — labeled clearly
                "baselineRecoveryPercent": baseline_recovery_pct,
                "predictedRecoveryPercent": predicted_recovery_pct,
                "finalROMPercent": final_rom_pct,

                # Kept for backward compatibility with frontend
                "recoveryPercent": predicted_recovery_pct,

                # Risk + success (computed independently)
                "successChance": success_chance,
                "riskLevel": risk_level,
            },

            "journey": plan.get("journey", []),

            "modeDistribution": mode_distribution,

            "recoveryCurve": recovery_curve,
            "daywisePlan": daywise,
            "jointAnalysis": joint_analysis,

            "planGroups": plan.get("plan_groups", []),
            "jointSummary": plan.get("joint_summary", {}),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Plan generation failed: {str(e)}"
        )