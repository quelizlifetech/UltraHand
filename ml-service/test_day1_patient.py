# test_day1_patient.py
# ULTRAHAND — Day 1 Pipeline Test (clean, no repeating output)
# Run: python test_day1_patient.py
# For visual HTML report with charts: python generate_report.py

import traceback
from model_service import predict_progression
from simulator_service import generate_full_plan
from recovery_curve_service import generate_recovery_curve
from config import JOINT_NORMAL_ROM

DAY1_PATIENTS = {
    "Patient A — Stroke, Severe": {
        "Diagnosis": "Stroke", "Category": "Neurological",
        "Hand_Side": "Right", "Therapy_Mode": "Mechanical Stimulation",
        "severity_level": "Severe", "affected_joints": "All",
        "Sessions_per_day": 1, "total_sessions_done": 0,
        "Session_duration_min": 45, "repetitions_completed": 20,
        "pre_session_stiffness": 4,
        "index_mcp": 30, "index_pip": 35, "index_dip": 20,
        "middle_mcp": 28,"middle_pip": 33,"middle_dip": 18,
        "ring_mcp": 25,  "ring_pip": 30,  "ring_dip": 15,
        "little_mcp": 22,"little_pip": 28,"little_dip": 12,
        "thumb_mcp": 18, "thumb_ip": 22,
        "wrist_flexion": 20, "wrist_extension": 15,
        "wrist_radial_dev": 5, "wrist_ulnar_dev": 8,
    },
    "Patient B — Arthritis, Moderate": {
        "Diagnosis": "Rheumatoid Arthritis", "Category": "Musculoskeletal",
        "Hand_Side": "Left", "Therapy_Mode": "Passive",
        "severity_level": "Moderate", "affected_joints": "Finger",
        "Sessions_per_day": 1, "total_sessions_done": 5,
        "Session_duration_min": 30, "repetitions_completed": 35,
        "pre_session_stiffness": 3,
        "index_mcp": 55, "index_pip": 60, "index_dip": 45,
        "middle_mcp": 52,"middle_pip": 58,"middle_dip": 42,
        "ring_mcp": 50,  "ring_pip": 55,  "ring_dip": 40,
        "little_mcp": 48,"little_pip": 52,"little_dip": 38,
        "thumb_mcp": 35, "thumb_ip": 45,
        "wrist_flexion": 50, "wrist_extension": 40,
        "wrist_radial_dev": 12, "wrist_ulnar_dev": 20,
    },
    "Patient C — Post Surgery, Mild": {
        "Diagnosis": "Post Surgical Recovery", "Category": "Post_Operative",
        "Hand_Side": "Right", "Therapy_Mode": "Assistive",
        "severity_level": "Mild", "affected_joints": "Wrist",
        "Sessions_per_day": 1, "total_sessions_done": 10,
        "Session_duration_min": 40, "repetitions_completed": 50,
        "pre_session_stiffness": 1,
        "index_mcp": 75, "index_pip": 82, "index_dip": 65,
        "middle_mcp": 72,"middle_pip": 80,"middle_dip": 62,
        "ring_mcp": 70,  "ring_pip": 78,  "ring_dip": 60,
        "little_mcp": 68,"little_pip": 75,"little_dip": 58,
        "thumb_mcp": 48, "thumb_ip": 62,
        "wrist_flexion": 60, "wrist_extension": 52,
        "wrist_radial_dev": 15, "wrist_ulnar_dev": 28,
    },
}


def run_pipeline(name, patient_data):
    print("\n" + "=" * 70)
    print(f"  {name}")
    print("=" * 70)
    results = {}

    # Step 1: Score
    print("\n-- STEP 1: Predicted Progress Score --")
    try:
        score = predict_progression(patient_data)
        print(f"  ROM improvement per session : {score:.4f} deg")
        results["score"] = "PASS"
    except Exception as e:
        print(f"  FAILED: {e}"); traceback.print_exc()
        results["score"] = "FAIL"
        return

    # Step 2: Generate plan ONCE
    print("\n-- STEP 2: Generating plan (runs once only) --")
    try:
        plan     = generate_full_plan(patient_data)
        sessions = plan["sessions"]
        groups   = plan["plan_groups"]
        print(f"  Total days to recovery : {plan['total_days_to_recovery']}")
        print(f"  Starting avg ROM       : {plan['initial_avg_rom']} deg")
        print(f"  Recovery goal          : {plan['standard_normal_avg_rom']} deg")
        results["plan"] = "PASS"
    except Exception as e:
        print(f"  FAILED: {e}"); traceback.print_exc()
        results["plan"] = "FAIL"
        return

    # Plan phases
    print()
    print(f"  {'Day Range':<22} {'Mode':<26} {'Speed':<8} {'Min':<6} {'Reps':<6} End ROM")
    print(f"  {'-'*22} {'-'*26} {'-'*8} {'-'*6} {'-'*6} {'-'*8}")
    for g in groups:
        print(f"  {g['day_range']:<22} {g['therapy_mode']:<26} {g['speed']:<8} "
              f"{g['session_duration_min']:<6} {g['repetitions']:<6} {g['avg_rom_at_end']} deg")

    # First 10 days
    print("\n-- STEP 3: First 10 Days Detail --")
    print(f"  {'Day':<5} {'Mode':<26} {'Spd':<7} {'Min':<5} {'Reps':<6} {'Prog':>6} {'AvgROM':>7} {'Trend':<10} Notes")
    print("  " + "-" * 105)
    for s in sessions[:10]:
        trend = {"increasing": "up", "declining": "down", "stable": "stable"}.get(s["recovery_trend"], "–")
        sore  = " [SORE]" if s["soreness_active"] else ""
        print(f"  {s['day']:<5} {s['therapy_mode']:<26} {s['speed']:<7} "
              f"{s['session_duration_min']:<5} {s['repetitions']:<6} "
              f"{s['actual_progress']:>6.2f} {s['avg_rom_after']:>7.2f} "
              f"{trend:<10} {s['session_notes']}{sore}")

    # Recovery curve
    print("\n-- STEP 4: Recovery Curve (10 sessions) --")
    try:
        curve = generate_recovery_curve(patient_data, max_sessions=10)
        print(f"  {'Day':<6} {'AvgROM':>8}   {'index_mcp':>10}  {'wrist_flex':>10}  {'thumb_mcp':>10}")
        print(f"  {'-'*6} {'-'*8}   {'-'*10}  {'-'*10}  {'-'*10}")
        for pt in curve:
            print(f"  {pt['session']:<6} {pt['avg_rom']:>8.2f}  "
                  f"{pt.get('index_mcp','-'):>10}  "
                  f"{pt.get('wrist_flexion','-'):>10}  "
                  f"{pt.get('thumb_mcp','-'):>10}")
        results["curve"] = "PASS"
    except Exception as e:
        print(f"  FAILED: {e}"); traceback.print_exc()
        results["curve"] = "FAIL"

    print("\n-- RESULT --")
    for k, v in results.items():
        print(f"  {'OK' if v=='PASS' else 'FAIL'} {k:<20} : {v}")

    print(f"\n  Run 'python generate_report.py' for visual HTML report with charts.")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("  ULTRAHAND — DAY 1 PIPELINE TEST")
    print("=" * 70)
    for name, data in DAY1_PATIENTS.items():
        run_pipeline(name, data)
    print("\n" + "=" * 70)
    print("  DONE — Run generate_report.py for visual charts")
    print("=" * 70 + "\n")