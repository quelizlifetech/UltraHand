# simulator_service.py
# ULTRAHAND — Full Session Plan Generator
#
# JOURNEY — Starting mode determines which phases are in the plan:
#
#   Mechanical Stimulation start → Mech Stim → Passive → Assistive → Active
#   Passive start                → Passive → Active
#   Assistive start              → Assistive → Active
#   Active start                 → Active only
#
# Active is always the final discharge phase (max 5 sessions).
# Within each mode, 3 sub-phases increase speed/intensity as recovery progresses.
# Fatigue builds within each mode block. Soreness spikes every 7 days.

import copy
import logging

from model_service import predict_progression
from config import (
    THERAPY_MODE_PROGRESSION, MODE_INTENSITY_STEPS,
    JOINT_ANGLE_COLUMNS, JOINT_NORMAL_ROM,
    MAX_PLAN_SESSIONS,
)

logger = logging.getLogger(__name__)

# Which modes are included depending on where the patient starts
JOURNEYS = {
    "Mechanical Stimulation": ["Mechanical Stimulation", "Passive", "Assistive", "Active"],
    "Passive":                ["Passive", "Active"],
    "Assistive":              ["Assistive", "Active"],
    "Active":                 ["Active"],
}

MODE_MIN_SESSIONS = {
    "Mechanical Stimulation": 5,
    "Passive":                8,
    "Assistive":              10,
    # Active has NO minimum — patient stays as long as needed, max 5
}

MODE_MAX_SESSIONS = {
    "Active": 5,
}


def _get(data, *keys, default=None):
    for key in keys:
        if key in data:
            return data[key]
    return default


def _compute_avg_rom(patient_data):
    values = [float(patient_data[col]) for col in JOINT_ANGLE_COLUMNS if col in patient_data]
    return round(sum(values) / len(values), 2) if values else 0.0


def _count_deficit_joints(patient_data):
    return sum(
        1 for col in JOINT_ANGLE_COLUMNS
        if col in patient_data
        and float(JOINT_NORMAL_ROM.get(col, 90)) - float(patient_data[col]) > 1.0
    )


def _compute_total_deficit(patient_data):
    return sum(
        max(float(JOINT_NORMAL_ROM.get(col, 90)) - float(patient_data[col]), 0)
        for col in JOINT_ANGLE_COLUMNS if col in patient_data
    )


def _is_fully_recovered(patient_data):
    for col in JOINT_ANGLE_COLUMNS:
        if col in patient_data:
            if float(patient_data[col]) < float(JOINT_NORMAL_ROM.get(col, 90)) - 1.0:
                return False
    return True


def _get_dynamic_thresholds(starting_mode):
    """
    Divide 0.0-1.0 recovery % across only the modes in this patient's journey.
    Active always occupies the final 15% (0.85-1.0).
    All other modes share 0.0-0.85 equally.
    """
    journey    = JOURNEYS.get(starting_mode, JOURNEYS["Mechanical Stimulation"])
    non_active = [m for m in journey if m != "Active"]

    if not non_active:
        return {"Active": (0.0, 1.0)}

    share      = 0.85 / len(non_active)
    thresholds = {}
    for i, m in enumerate(non_active):
        thresholds[m] = (round(i * share, 4), round((i + 1) * share, 4))
    thresholds["Active"] = (0.85, 1.0)
    return thresholds


def _get_mode_for_pct(recovery_pct, thresholds):
    for mode, (lo, hi) in thresholds.items():
        if lo <= recovery_pct < hi:
            return mode
    return "Active"


def _get_intensity_step(mode, recovery_pct, thresholds):
    """
    Within each mode, sub-phases increase speed/intensity as % grows.
    Maps the recovery_pct into the mode's own 0-1 sub-range.
    """
    steps = MODE_INTENSITY_STEPS.get(mode, [])
    if not steps:
        return "Medium", "Moderate", 0, 0

    # Normalize recovery_pct into 0.0-1.0 within this mode's band
    lo, hi = thresholds.get(mode, (0.0, 1.0))
    band   = hi - lo
    if band <= 0:
        sub_pct = 0.0
    else:
        sub_pct = min((recovery_pct - lo) / band, 0.999)

    # Map sub_pct (0-1) onto the step table's original pct range
    # Steps are defined in global % space — convert to sub-space
    # by using position within the steps list
    n      = len(steps)
    idx    = min(int(sub_pct * n), n - 1)
    _, _, speed, intensity, d_bonus, r_bonus = steps[idx]
    return speed, intensity, d_bonus, r_bonus


def _get_settings(mode, recovery_pct, thresholds, base_duration, base_reps):
    speed, intensity, d_bonus, r_bonus = _get_intensity_step(
        mode, recovery_pct, thresholds
    )
    return {
        "therapy_mode":         mode,
        "speed":                speed,
        "intensity":            intensity,
        "session_duration_min": int(base_duration + d_bonus),
        "repetitions":          int(base_reps + r_bonus),
    }


def _fatigue_factor(sessions_in_block, mode_upgrades):
    fatigue = min(sessions_in_block / 12.0, 0.20)
    relief  = mode_upgrades * 0.05
    return max(1.0 - fatigue + relief, 0.80)


def _soreness_on_day(day):
    cycle = (day - 1) % 7
    if cycle == 0:   return True, 0.8
    elif cycle == 1: return True, 0.4
    return False, 0.0


def _apply_fatigue_soreness(settings, fatigue, soreness_active, soreness_sev):
    adjusted = dict(settings)
    notes    = []

    if fatigue < 0.95:
        notes.append(f"fatigue -{round((1-fatigue)*100)}% progress")

    if soreness_active:
        cut = 1.0 - soreness_sev * 0.3
        adjusted["session_duration_min"] = max(int(settings["session_duration_min"] * cut), 15)
        adjusted["repetitions"]          = max(int(settings["repetitions"] * cut), 10)
        if soreness_sev > 0.5:
            adjusted["speed"]     = "Low"
            adjusted["intensity"] = "Low"
        notes.append(f"soreness -{round(soreness_sev*100)}% intensity")

    return adjusted, (", ".join(notes) if notes else "normal")


def _get_trend(window):
    if len(window) < 3: return "–"
    mid   = len(window) // 2
    early = sum(window[:mid]) / max(mid, 1)
    late  = sum(window[mid:]) / max(len(window) - mid, 1)
    diff  = late - early
    if diff > 0.05:    return "increasing"
    elif diff < -0.05: return "declining"
    return "stable"


def _group_sessions(sessions):
    if not sessions:
        return []

    def key(s):
        return (s["therapy_mode"], s["speed"], s["intensity"],
                s["session_duration_min"], s["repetitions"])

    groups, start, prev = [], 1, sessions[0]
    for i in range(1, len(sessions)):
        curr = sessions[i]
        if key(curr) != key(prev):
            groups.append({
                "day_range":            f"Day {start} - Day {sessions[i-1]['day']}",
                "day_from":             start,
                "day_to":               sessions[i-1]["day"],
                "total_days":           sessions[i-1]["day"] - start + 1,
                "therapy_mode":         prev["therapy_mode"],
                "speed":                prev["speed"],
                "intensity":            prev["intensity"],
                "session_duration_min": prev["session_duration_min"],
                "repetitions":          prev["repetitions"],
                "avg_rom_at_end":       prev["avg_rom_after"],
                "recovery_pct_at_end":  prev["recovery_pct"],
            })
            start = curr["day"]
            prev  = curr

    groups.append({
        "day_range":            f"Day {start} - Day {sessions[-1]['day']}",
        "day_from":             start,
        "day_to":               sessions[-1]["day"],
        "total_days":           sessions[-1]["day"] - start + 1,
        "therapy_mode":         prev["therapy_mode"],
        "speed":                prev["speed"],
        "intensity":            prev["intensity"],
        "session_duration_min": prev["session_duration_min"],
        "repetitions":          prev["repetitions"],
        "avg_rom_at_end":       prev["avg_rom_after"],
        "recovery_pct_at_end":  prev["recovery_pct"],
    })
    return groups


def generate_full_plan(patient_data):
    simulated      = copy.deepcopy(patient_data)
    base_duration  = float(_get(simulated, "Session_duration_min",
                                "session_duration_min", default=30))
    base_reps      = int(_get(simulated, "repetitions_completed", default=30))

    initial_avg_rom = _compute_avg_rom(simulated)
    normal_avg_rom  = sum(JOINT_NORMAL_ROM.values()) / len(JOINT_NORMAL_ROM)
    avg_rom_deficit = max(normal_avg_rom - initial_avg_rom, 0.001)

    # ── Starting mode sets the journey ───────────────────────────────────────
    starting_mode = _get(simulated, "Therapy_Mode", "therapy_mode",
                         default="Mechanical Stimulation")
    if starting_mode not in JOURNEYS:
        starting_mode = "Mechanical Stimulation"

    journey    = JOURNEYS[starting_mode]
    thresholds = _get_dynamic_thresholds(starting_mode)

    logger.info(f"[simulator] Journey: {' → '.join(journey)}")

    # ── Session counters ──────────────────────────────────────────────────────
    mode_session_counts = {m: 0 for m in THERAPY_MODE_PROGRESSION}
    sessions            = []
    progress_window     = []
    sessions_in_block   = 0
    mode_upgrades       = 0

    for day in range(1, MAX_PLAN_SESSIONS + 1):

        # Exit when fully recovered AND in Active (or Active not in journey)
        # Active sessions continue until recovery confirmed, capped at 5
        in_active = (sessions[-1]["therapy_mode"] == "Active") if sessions else False
        if _is_fully_recovered(simulated) and (in_active or "Active" not in journey):
            logger.info(f"[simulator] Full recovery confirmed at day {day}.")
            break

        # Recovery % (0.0 → 1.0 based on avg ROM improvement)
        current_avg  = _compute_avg_rom(simulated)
        recovery_pct = min((current_avg - initial_avg_rom) / avg_rom_deficit, 0.999)
        recovery_pct = max(recovery_pct, 0.0)

        # Mode from dynamic thresholds (only modes in this journey)
        natural_mode = _get_mode_for_pct(recovery_pct, thresholds)

        # If patient is fully recovered but hasn't reached Active yet,
        # skip straight to Active (discharge phase — always required)
        if _is_fully_recovered(simulated) and "Active" in journey:
            enforced_mode = "Active"
        else:
            # Enforce minimum sessions — can't advance until minimum met
            enforced_mode = journey[0]
            for m in journey:
                min_req = MODE_MIN_SESSIONS.get(m, 0)
                if mode_session_counts[m] >= min_req:
                    enforced_mode = m
                else:
                    enforced_mode = m
                    break
                if m == natural_mode:
                    enforced_mode = m
                    break

        # Active hard cap → discharge
        if (enforced_mode == "Active" and
                mode_session_counts["Active"] >= MODE_MAX_SESSIONS.get("Active", 5)):
            logger.info(f"[simulator] Active cap reached day {day}. Discharged.")
            break

        # Detect mode change
        prev_mode    = sessions[-1]["therapy_mode"] if sessions else None
        mode_changed = enforced_mode != prev_mode
        if mode_changed and prev_mode is not None:
            sessions_in_block = 0
            mode_upgrades    += 1

        # Settings for this mode + recovery sub-phase
        base_settings                    = _get_settings(enforced_mode, recovery_pct,
                                                         thresholds, base_duration, base_reps)
        fatigue                          = _fatigue_factor(sessions_in_block, mode_upgrades)
        soreness_active, soreness_sev    = _soreness_on_day(day)
        adjusted_settings, session_notes = _apply_fatigue_soreness(
            base_settings, fatigue, soreness_active, soreness_sev
        )

        simulated["Therapy_Mode"]          = enforced_mode
        simulated["Session_duration_min"]  = adjusted_settings["session_duration_min"]
        simulated["repetitions_completed"] = adjusted_settings["repetitions"]

        # Predict & apply progress
        try:
            raw_progress = max(0.1, predict_progression(simulated))
        except Exception as e:
            logger.error(f"[simulator] Prediction failed day {day}: {e}")
            raw_progress = 0.5

        progress = raw_progress * fatigue
        if soreness_active:
            progress *= (1.0 - soreness_sev * 0.3)
        progress = max(progress, 0.05)

        # Update joint angles
        n_deficit   = max(_count_deficit_joints(simulated), 1)
        avg_deficit = max(_compute_total_deficit(simulated) / n_deficit, 0.001)

        for col in JOINT_ANGLE_COLUMNS:
            if col in simulated:
                normal  = float(JOINT_NORMAL_ROM.get(col, 90))
                current = float(simulated[col])
                gap     = normal - current
                if gap > 0:
                    joint_gain     = progress * (gap / avg_deficit)
                    simulated[col] = round(min(current + joint_gain, normal), 2)

        sessions_in_block              += 1
        mode_session_counts[enforced_mode] += 1
        progress_window.append(progress)
        if len(progress_window) > 6:
            progress_window.pop(0)

        new_avg_rom = _compute_avg_rom(simulated)
        trend       = _get_trend(progress_window)

        joint_snapshot = {
            col: round(float(simulated[col]), 1)
            for col in JOINT_ANGLE_COLUMNS if col in simulated
        }

        sessions.append({
            "day":                  day,
            "therapy_mode":         enforced_mode,
            "speed":                adjusted_settings["speed"],
            "intensity":            adjusted_settings["intensity"],
            "session_duration_min": adjusted_settings["session_duration_min"],
            "repetitions":          adjusted_settings["repetitions"],
            "raw_progress":         round(raw_progress, 3),
            "actual_progress":      round(progress, 3),
            "recovery_pct":         round(recovery_pct * 100, 1),
            "fatigue_factor":       round(fatigue, 2),
            "soreness_active":      soreness_active,
            "session_notes":        session_notes,
            "avg_rom_after":        round(new_avg_rom, 2),
            "recovery_trend":       trend,
            "settings_changed":     mode_changed,
            "joint_rom":            joint_snapshot,
        })

    joint_summary = {
        col: {
            "starting_rom": float(patient_data.get(col, 0)),
            "normal_rom":   float(JOINT_NORMAL_ROM.get(col, 90)),
            "deficit":      round(max(float(JOINT_NORMAL_ROM.get(col, 90)) -
                                      float(patient_data.get(col, 0)), 0), 1),
        }
        for col in JOINT_ANGLE_COLUMNS if col in patient_data
    }

    return {
        "total_days_to_recovery":  len(sessions),
        "initial_avg_rom":         round(initial_avg_rom, 2),
        "standard_normal_avg_rom": round(normal_avg_rom, 2),
        "journey":                 journey,
        "sessions":                sessions,
        "plan_groups":             _group_sessions(sessions),
        "joint_summary":           joint_summary,
    }


def estimate_recovery_time(patient_data):
    return generate_full_plan(patient_data)["total_days_to_recovery"]


def recommend_therapy_plan(patient_data):
    plan   = generate_full_plan(patient_data)
    groups = plan.get("plan_groups", [])
    first  = groups[0] if groups else {}
    return {
        "current_mode":             _get(patient_data, "Therapy_Mode", "therapy_mode",
                                         default="Passive"),
        "recommended_next_mode":    first.get("therapy_mode", "Passive"),
        "total_days_to_recovery":   plan["total_days_to_recovery"],
        "recommended_duration_min": first.get("session_duration_min", 30),
        "recommended_repetitions":  first.get("repetitions", 30),
        "speed":                    first.get("speed", "Low"),
        "intensity":                first.get("intensity", "Low"),
    }