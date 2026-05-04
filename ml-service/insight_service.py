# insight_service.py
# ULTRAHAND — Professional AI Insight Service
# Returns structured JSON insights for frontend dashboards

import logging
from model_service import predict_progression
from generate_report import generate_report

logger = logging.getLogger(__name__)


# ---------------------------------------------------
# Helpers
# ---------------------------------------------------
def safe_float(value):
    try:
        return float(value)
    except:
        return 0.0


def risk_level(score):
    if score >= 75:
        return "Low"
    elif score >= 45:
        return "Moderate"
    return "High"


def recovery_grade(percent):
    if percent >= 85:
        return "Excellent"
    elif percent >= 65:
        return "Good"
    elif percent >= 40:
        return "Fair"
    return "Poor"


def generate_recommendations(report):
    recs = []

    summary = report["summary"]
    score = summary["predictedScore"]
    days = summary["recoveryDays"]
    current = summary["currentAvgROM"]

    if score < 35:
        recs.append(
            "Increase supervised therapy frequency."
        )

    if current < 45:
        recs.append(
            "Prioritize mobility restoration before resistance work."
        )

    if days > 30:
        recs.append(
            "Consider reassessment after 2 weeks."
        )

    if score >= 70:
        recs.append(
            "Progress to active strengthening sooner."
        )

    if len(recs) == 0:
        recs.append(
            "Maintain current rehabilitation strategy."
        )

    return recs


def top_problem_joints(report, top_n=5):
    joints = report["jointAnalysis"]

    joints_sorted = sorted(
        joints,
        key=lambda x: x["deficit"],
        reverse=True
    )

    return joints_sorted[:top_n]


# ---------------------------------------------------
# Main Insight Function
# ---------------------------------------------------
def generate_patient_insight(
    patient_data: dict
):
    """
    Final structured JSON used by frontend.
    """

    try:
        score = safe_float(
            predict_progression(
                patient_data
            )
        )

    except Exception as e:
        logger.error(
            f"Prediction error: {e}"
        )
        score = 25

    report = generate_report(
        patient_data
    )

    summary = report["summary"]

    insight = {
        "success": True,

        "executiveSummary": {
            "riskLevel": risk_level(
                score
            ),

            "recoveryGrade":
                recovery_grade(
                    summary[
                        "recoveryPercent"
                    ]
                ),

            "predictedRecoveryDays":
                summary[
                    "recoveryDays"
                ],

            "predictedGainPerSession":
                summary[
                    "gainPerSession"
                ],

            "currentRecoveryPercent":
                summary[
                    "recoveryPercent"
                ],

            "predictedScore":
                summary[
                    "predictedScore"
                ]
        },

        "clinicalRecommendations":
            generate_recommendations(
                report
            ),

        "criticalJoints":
            top_problem_joints(
                report
            ),

        "summary":
            report["summary"],

        "modeDistribution":
            report[
                "modeDistribution"
            ],

        "jointAnalysis":
            report[
                "jointAnalysis"
            ],

        "recoveryCurve":
            report[
                "recoveryCurve"
            ],

        "sessionPlan":
            report[
                "sessionPlan"
            ],

        "warnings":
            report[
                "warnings"
            ]
    }

    return insight


# ---------------------------------------------------
# Local Testing
# ---------------------------------------------------
if __name__ == "__main__":

    sample = {
        "index_mcp": 40,
        "index_pip": 65,
        "index_dip": 50,

        "middle_mcp": 42,
        "middle_pip": 70,
        "middle_dip": 55,

        "ring_mcp": 45,
        "ring_pip": 72,
        "ring_dip": 56,

        "little_mcp": 48,
        "little_pip": 70,
        "little_dip": 54,

        "thumb_mcp": 30,
        "thumb_ip": 40,

        "wrist_flexion": 45,
        "wrist_extension": 40,
        "wrist_radial_deviation": 8,
        "wrist_ulnar_deviation": 12
    }

    result = generate_patient_insight(
        sample
    )

    import json
    print(
        json.dumps(
            result,
            indent=2
        )
    )