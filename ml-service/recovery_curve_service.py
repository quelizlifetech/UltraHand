# recovery_curve_service.py
# ULTRAHAND — Recovery Curve Service
# Clean JSON-friendly recovery simulator for charts / frontend dashboards

import copy
import logging
from model_service import predict_progression
from config import (
    JOINT_ANGLE_COLUMNS,
    JOINT_NORMAL_ROM
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------
# Helpers
# ---------------------------------------------------
def safe_float(value):
    try:
        return float(value)
    except:
        return 0.0


def compute_avg_rom(data):
    values = []

    for col in JOINT_ANGLE_COLUMNS:
        if col in data:
            values.append(
                safe_float(data[col])
            )

    if not values:
        return 0.0

    return round(
        sum(values) / len(values),
        2
    )


def compute_total_deficit(data):
    total = 0.0

    for col in JOINT_ANGLE_COLUMNS:
        if col in data:
            current = safe_float(
                data[col]
            )

            normal = safe_float(
                JOINT_NORMAL_ROM.get(
                    col,
                    90
                )
            )

            total += max(
                normal - current,
                0
            )

    return round(total, 2)


def count_deficit_joints(data):
    count = 0

    for col in JOINT_ANGLE_COLUMNS:
        if col in data:
            current = safe_float(
                data[col]
            )

            normal = safe_float(
                JOINT_NORMAL_ROM.get(
                    col,
                    90
                )
            )

            if normal - current > 1:
                count += 1

    return count


def is_fully_recovered(data):
    for col in JOINT_ANGLE_COLUMNS:
        if col in data:
            current = safe_float(
                data[col]
            )

            normal = safe_float(
                JOINT_NORMAL_ROM.get(
                    col,
                    90
                )
            )

            if current < normal - 1:
                return False

    return True


# ---------------------------------------------------
# Main Recovery Curve Generator
# ---------------------------------------------------
def generate_recovery_curve(
    patient_data: dict,
    max_sessions: int = 180
):
    """
    Returns structured session-by-session
    recovery curve for charts.

    Output Example:
    [
      {
        session: 1,
        avg_rom: 57.2,
        progress_gain: 1.4,
        recoveryPercent: 61.2,
        joints: {...}
      }
    ]
    """

    simulated = copy.deepcopy(
        patient_data
    )

    curve = []

    # target avg ROM
    normal_values = [
        safe_float(v)
        for v in JOINT_NORMAL_ROM.values()
    ]

    target_avg = round(
        sum(normal_values) /
        len(normal_values),
        2
    )

    for session in range(
        1,
        max_sessions + 1
    ):

        if is_fully_recovered(
            simulated
        ):
            break

        # -----------------------------------------
        # Predict progress using ML
        # -----------------------------------------
        try:
            progress = float(
                predict_progression(
                    simulated
                )
            )

            progress = max(
                0.1,
                progress
            )

        except Exception as e:
            logger.error(
                f"[curve] Prediction failed session {session}: {e}"
            )

            progress = 1.0

        # -----------------------------------------
        # Distribute progress across deficit joints
        # -----------------------------------------
        n_deficit = max(
            count_deficit_joints(
                simulated
            ),
            1
        )

        total_deficit = max(
            compute_total_deficit(
                simulated
            ),
            0.001
        )

        avg_deficit = (
            total_deficit /
            n_deficit
        )

        for col in JOINT_ANGLE_COLUMNS:

            if col not in simulated:
                continue

            current = safe_float(
                simulated[col]
            )

            normal = safe_float(
                JOINT_NORMAL_ROM.get(
                    col,
                    90
                )
            )

            gap = normal - current

            if gap <= 0:
                continue

            scale = gap / avg_deficit

            gain = progress * scale

            simulated[col] = round(
                min(
                    current + gain,
                    normal
                ),
                2
            )

        # -----------------------------------------
        # Metrics after update
        # -----------------------------------------
        avg_rom = compute_avg_rom(
            simulated
        )

        recovery_pct = round(
            (
                avg_rom /
                target_avg
            ) * 100,
            1
        )

        point = {
            "session": session,
            "avg_rom": avg_rom,
            "progress_gain": round(
                progress,
                2
            ),
            "recoveryPercent":
                recovery_pct,
            "joints": {}
        }

        for col in JOINT_ANGLE_COLUMNS:
            if col in simulated:
                point["joints"][
                    col
                ] = round(
                    safe_float(
                        simulated[col]
                    ),
                    2
                )

        curve.append(point)

    return curve


# ---------------------------------------------------
# Quick Local Test
# ---------------------------------------------------
if __name__ == "__main__":

    sample = {
        "index_mcp": 50,
        "index_pip": 70,
        "index_dip": 60,
        "middle_mcp": 55,
        "middle_pip": 75,
        "middle_dip": 62,
        "ring_mcp": 60,
        "ring_pip": 78,
        "ring_dip": 66,
        "little_mcp": 58,
        "little_pip": 76,
        "little_dip": 60,
        "thumb_mcp": 42,
        "thumb_ip": 50,
        "wrist_flexion": 55,
        "wrist_extension": 48,
        "wrist_radial_deviation": 12,
        "wrist_ulnar_deviation": 18
    }

    result = generate_recovery_curve(
        sample
    )

    import json
    print(
        json.dumps(
            result[:5],
            indent=2
        )
    )