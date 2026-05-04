# generate_report.py
# ULTRAHAND — PROFESSIONAL AI REPORT ENGINE
# Better charts + day wise prediction table + understandable outputs

from model_service import predict_progression
import math


# ---------------------------------------------------
# NORMAL ROM TARGETS
# ---------------------------------------------------
NORMAL_ROM = {
    "index_mcp": 90,
    "index_pip": 100,
    "index_dip": 80,

    "middle_mcp": 90,
    "middle_pip": 100,
    "middle_dip": 80,

    "ring_mcp": 90,
    "ring_pip": 100,
    "ring_dip": 80,

    "little_mcp": 90,
    "little_pip": 100,
    "little_dip": 80,

    "thumb_mcp": 60,
    "thumb_ip": 80,

    "wrist_flexion": 80,
    "wrist_extension": 70,
    "wrist_radial_deviation": 20,
    "wrist_ulnar_deviation": 35,
}

JOINT_KEYS = list(
    NORMAL_ROM.keys()
)


# ---------------------------------------------------
# HELPERS
# ---------------------------------------------------
def safe_float(v):
    try:
        return float(v)
    except:
        return 0.0


def avg_rom(data):
    vals = []

    for key in JOINT_KEYS:
        vals.append(
            safe_float(
                data.get(key, 0)
            )
        )

    return round(
        sum(vals) / len(vals),
        2
    )


def target_avg():
    vals = list(
        NORMAL_ROM.values()
    )

    return round(
        sum(vals) / len(vals),
        2
    )


def risk_level(score):
    if score >= 70:
        return "Low"

    elif score >= 45:
        return "Moderate"

    return "High"


def success_probability(score):
    prob = min(
        95,
        max(40, score)
    )

    return round(prob, 1)


# ---------------------------------------------------
# JOINT ANALYSIS
# ---------------------------------------------------
def build_joint_analysis(
    patient_data
):
    rows = []

    for joint in JOINT_KEYS:

        current = safe_float(
            patient_data.get(
                joint,
                0
            )
        )

        normal = NORMAL_ROM[
            joint
        ]

        deficit = max(
            0,
            normal - current
        )

        predicted = round(
            current + deficit * 0.7,
            2
        )

        rows.append({
            "joint": joint,
            "current": round(
                current,
                2
            ),
            "predicted":
                predicted,
            "target":
                normal,
            "gain":
                round(
                    predicted -
                    current,
                    2
                ),
            "deficit":
                round(
                    deficit,
                    2
                )
        })

    rows.sort(
        key=lambda x: x[
            "deficit"
        ],
        reverse=True
    )

    return rows


# ---------------------------------------------------
# RECOVERY CURVE
# ---------------------------------------------------
def build_curve(
    current_avg,
    target,
    gain,
    days
):
    curve = []

    val = current_avg

    for day in range(
        1,
        days + 1
    ):
        val = min(
            target,
            val + gain
        )

        curve.append({
            "day": day,
            "avgROM":
                round(
                    val,
                    2
                ),
            "recoveryPercent":
                round(
                    (val / target)
                    * 100,
                    1
                )
        })

    return curve


# ---------------------------------------------------
# DAY WISE TABLE
# ---------------------------------------------------
def build_daywise_plan(
    patient_data,
    days,
    gain
):
    rows = []

    current = dict(
        patient_data
    )

    for day in range(
        1,
        days + 1
    ):

        # Phase logic
        if day <= days * 0.25:
            phase = "Passive"
            intensity = "Low"
            reps = 10

        elif day <= days * 0.75:
            phase = "Assistive"
            intensity = "Moderate"
            reps = 15

        else:
            phase = "Active"
            intensity = "High"
            reps = 20

        row = {
            "day": day,
            "phase": phase,
            "intensity":
                intensity,
            "repetitions":
                reps
        }

        for joint in JOINT_KEYS:

            current_val = safe_float(
                current.get(
                    joint,
                    0
                )
            )

            target = NORMAL_ROM[
                joint
            ]

            gap = max(
                0,
                target -
                current_val
            )

            step = gap * 0.08

            current_val = min(
                target,
                current_val +
                max(
                    0.2,
                    step
                )
            )

            current[
                joint
            ] = round(
                current_val,
                2
            )

            row[
                joint
            ] = round(
                current_val,
                2
            )

        row[
            "avgROM"
        ] = avg_rom(
            current
        )

        rows.append(
            row
        )

    return rows


# ---------------------------------------------------
# MODE DISTRIBUTION
# ---------------------------------------------------
def mode_distribution(days):
    passive = int(days * 0.25)
    assistive = int(days * 0.50)
    active = (
        days -
        passive -
        assistive
    )

    return {
        "passive":
            passive,
        "assistive":
            assistive,
        "active":
            active
    }


# ---------------------------------------------------
# WARNINGS
# ---------------------------------------------------
def build_warnings(
    score,
    days,
    current_avg
):
    warnings = []

    if score < 35:
        warnings.append(
            "Slow recovery expected."
        )

    if days > 30:
        warnings.append(
            "Extended rehabilitation timeline."
        )

    if current_avg < 40:
        warnings.append(
            "Severe stiffness detected."
        )

    if not warnings:
        warnings.append(
            "Recovery within expected range."
        )

    return warnings


# ---------------------------------------------------
# MAIN REPORT
# ---------------------------------------------------
def generate_report(
    patient_data: dict
):

    score = safe_float(
        predict_progression(
            patient_data
        )
    )

    score = max(
        1,
        min(
            score,
            100
        )
    )

    current_avg = avg_rom(
        patient_data
    )

    target = target_avg()

    gain = round(
        max(
            0.8,
            score / 45
        ),
        2
    )

    deficit = max(
        1,
        target -
        current_avg
    )

    days = math.ceil(
        deficit / gain
    )

    report = {
        "success": True,

        "summary": {
            "predictedScore":
                round(
                    score,
                    2
                ),

            "successChance":
                success_probability(
                    score
                ),

            "riskLevel":
                risk_level(
                    score
                ),

            "currentAvgROM":
                current_avg,

            "targetAvgROM":
                target,

            "gainPerDay":
                gain,

            "estimatedDays":
                days,

            "recoveryPercent":
                round(
                    (
                        current_avg /
                        target
                    ) * 100,
                    1
                )
        },

        "jointAnalysis":
            build_joint_analysis(
                patient_data
            ),

        "recoveryCurve":
            build_curve(
                current_avg,
                target,
                gain,
                days
            ),

        "daywisePlan":
            build_daywise_plan(
                patient_data,
                days,
                gain
            ),

        "modeDistribution":
            mode_distribution(
                days
            ),

        "warnings":
            build_warnings(
                score,
                days,
                current_avg
            )
    }

    return report


# ---------------------------------------------------
# LOCAL TEST
# ---------------------------------------------------
if __name__ == "__main__":

    sample = {
        "index_mcp": 50,
        "index_pip": 70,
        "index_dip": 60,

        "middle_mcp": 50,
        "middle_pip": 80,
        "middle_dip": 60,

        "ring_mcp": 60,
        "ring_pip": 80,
        "ring_dip": 70,

        "little_mcp": 60,
        "little_pip": 80,
        "little_dip": 60,

        "thumb_mcp": 40,
        "thumb_ip": 50,

        "wrist_flexion": 60,
        "wrist_extension": 50,
        "wrist_radial_deviation": 10,
        "wrist_ulnar_deviation": 15
    }

    import json

    result = generate_report(
        sample
    )

    print(
        json.dumps(
            result,
            indent=2
        )
    )