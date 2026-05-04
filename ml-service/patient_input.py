# patient_input.py
# ULTRAHAND — Interactive Patient Input & Recovery Plan
#
# Run: python patient_input.py
# Enter Day 1 patient data and get:
#   - Predicted progress score
#   - Full day-by-day session plan
#   - Recovery curve
#   - HTML report generated automatically

import sys
import os

# ── Helpers ───────────────────────────────────────────────────────────────────

def clr():
    os.system("cls" if os.name == "nt" else "clear")

def header(title):
    print("\n" + "═" * 60)
    print(f"  {title}")
    print("═" * 60)

def section(title):
    print(f"\n  ── {title} " + "─" * (54 - len(title)))

def ask(prompt, options=None, default=None, typ=str):
    """
    Prompt user for input.
    options: list of valid choices (shown as numbered menu)
    default: shown in brackets, used if user presses Enter
    typ:     int or float for numeric fields
    """
    while True:
        if options:
            for i, o in enumerate(options, 1):
                print(f"    {i}. {o}")
            hint = f"[1-{len(options)}]" + (f" default={options.index(default)+1}" if default in options else "")
            raw = input(f"  → {prompt} {hint}: ").strip()
            if raw == "" and default is not None:
                return default
            try:
                idx = int(raw) - 1
                if 0 <= idx < len(options):
                    return options[idx]
            except ValueError:
                pass
            print("    ✗ Invalid choice. Enter a number from the list.")
        else:
            hint = f"[default: {default}]" if default is not None else ""
            raw = input(f"  → {prompt} {hint}: ").strip()
            if raw == "" and default is not None:
                return default
            if raw == "" and default is None:
                print("    ✗ This field is required.")
                continue
            try:
                return typ(raw)
            except (ValueError, TypeError):
                print(f"    ✗ Please enter a valid {typ.__name__}.")

def ask_joint(joint_name, normal_rom):
    """Ask for a joint angle with normal ROM shown as reference."""
    while True:
        raw = input(f"  → {joint_name:<22} (normal: {normal_rom}°)  Current ROM: ").strip()
        if raw == "":
            print("    ✗ Required.")
            continue
        try:
            val = float(raw)
            if val < 0 or val > normal_rom:
                print(f"    ✗ Enter a value between 0 and {normal_rom}°.")
                continue
            return val
        except ValueError:
            print("    ✗ Enter a number.")

# ── Valid options ─────────────────────────────────────────────────────────────

DIAGNOSES = [
    "Stroke", "Rheumatoid Arthritis", "Osteoarthritis",
    "Post Surgical Recovery", "Fracture Rehabilitation",
    "Cerebral Palsy", "Peripheral Neuropathy", "Tendon Repair",
    "Dupuytren Contracture", "Other"
]

CATEGORIES = [
    "Neurological", "Musculoskeletal", "Post_Operative",
    "Congenital", "Traumatic", "Other"
]

HAND_SIDES    = ["Right", "Left", "Both"]
SEVERITIES    = ["Mild", "Moderate", "Severe"]
THERAPY_MODES = ["Mechanical Stimulation", "Passive", "Assistive", "Active"]
JOINT_GROUPS  = ["All", "Finger", "Wrist", "Thumb", "MCP", "PIP", "DIP"]

JOINT_NORMALS = {
    "index_mcp": 90,  "index_pip": 100, "index_dip": 80,
    "middle_mcp": 90, "middle_pip": 100,"middle_dip": 80,
    "ring_mcp": 90,   "ring_pip": 100,  "ring_dip": 80,
    "little_mcp": 90, "little_pip": 100,"little_dip": 80,
    "thumb_mcp": 60,  "thumb_ip": 80,
    "wrist_flexion": 80,    "wrist_extension": 70,
    "wrist_radial_dev": 20, "wrist_ulnar_dev": 35,
}

JOINT_GROUPS_MAP = {
    "index":  ["index_mcp",  "index_pip",  "index_dip"],
    "middle": ["middle_mcp", "middle_pip", "middle_dip"],
    "ring":   ["ring_mcp",   "ring_pip",   "ring_dip"],
    "little": ["little_mcp", "little_pip", "little_dip"],
    "thumb":  ["thumb_mcp",  "thumb_ip"],
    "wrist":  ["wrist_flexion", "wrist_extension", "wrist_radial_dev", "wrist_ulnar_dev"],
}

# ── Input collection ──────────────────────────────────────────────────────────

def collect_patient_data():
    clr()
    header("ULTRAHAND — New Patient Assessment")
    print("  Enter the patient's Day 1 clinical data.")
    print("  Press Enter to accept the default value where shown.\n")

    data = {}

    # Patient info
    section("Patient Information")
    data["Diagnosis"]   = ask("Diagnosis",   DIAGNOSES,    default="Stroke")
    data["Category"]    = ask("Category",    CATEGORIES,   default="Neurological")
    data["Hand_Side"]   = ask("Affected hand", HAND_SIDES, default="Right")
    data["severity_level"] = ask("Severity", SEVERITIES,   default="Moderate")
    data["affected_joints"] = ask("Affected joints", JOINT_GROUPS, default="All")

    section("Session Parameters")
    data["Sessions_per_day"]     = ask("Sessions per day",     default=1,  typ=int)
    data["total_sessions_done"]  = ask("Sessions completed so far", default=0, typ=int)
    data["Session_duration_min"] = ask("Session duration (min)",  default=30, typ=int)
    data["repetitions_completed"]= ask("Repetitions completed",   default=20, typ=int)
    data["pre_session_stiffness"]= ask("Pre-session stiffness (1=low, 5=high)", default=3, typ=int)
    data["Therapy_Mode"]         = ask("Starting therapy mode", THERAPY_MODES, default="Mechanical Stimulation")

    # Joint angles — grouped for readability
    section("Joint ROM Measurements (enter current ROM in degrees)")
    print("  Reference: enter the patient's CURRENT range of motion.")
    print("  Normal ROM shown for reference. Cannot exceed normal.\n")

    for group, joints in JOINT_GROUPS_MAP.items():
        print(f"\n  [ {group.upper()} ]")
        for j in joints:
            data[j] = ask_joint(j, JOINT_NORMALS[j])

    return data


# ── Output display ────────────────────────────────────────────────────────────

def display_results(patient_data):
    from model_service import predict_progression
    from simulator_service import generate_full_plan
    from recovery_curve_service import generate_recovery_curve
    from config import JOINT_NORMAL_ROM

    clr()
    header("ULTRAHAND — Recovery Plan Results")

    name = f"{patient_data['Diagnosis']} | {patient_data['Hand_Side']} Hand | {patient_data['severity_level']}"
    print(f"  Patient: {name}\n")

    # Step 1: Score
    print("  Generating predictions...")
    try:
        score = predict_progression(patient_data)
    except Exception as e:
        print(f"  ✗ Prediction failed: {e}")
        return

    # Step 2: Full plan (single call — reused everywhere)
    try:
        plan     = generate_full_plan(patient_data)
        sessions = plan["sessions"]
        groups   = plan["plan_groups"]
    except Exception as e:
        print(f"  ✗ Plan generation failed: {e}")
        return

    # ── Overview ──────────────────────────────────────────────────────────────
    section("Recovery Overview")
    print(f"  Predicted ROM gain/session  : {score:.2f}°")
    print(f"  Starting avg ROM            : {plan['initial_avg_rom']:.1f}°")
    print(f"  Target (normal) avg ROM     : {plan['standard_normal_avg_rom']:.1f}°")
    print(f"  Total days to full recovery : {plan['total_days_to_recovery']} days")

    # Mode breakdown
    from collections import Counter
    mode_counts = Counter(s["therapy_mode"] for s in sessions)
    print(f"\n  Sessions per mode:")
    for mode in ["Mechanical Stimulation", "Passive", "Assistive", "Active"]:
        n = mode_counts.get(mode, 0)
        bar = "█" * min(n, 40)
        print(f"    {mode:<26} {n:>3} days  {bar}")

    # ── Joint ROM at Day 1 ────────────────────────────────────────────────────
    section("Joint ROM at Day 1  (current / normal / deficit)")
    print(f"  {'Joint':<22} {'Current':>8}  {'Normal':>8}  {'Deficit':>8}  Progress")
    print("  " + "─" * 70)
    for col, info in plan["joint_summary"].items():
        pct    = round((info["starting_rom"] / info["normal_rom"]) * 100) if info["normal_rom"] > 0 else 0
        filled = int(pct / 5)
        bar    = "█" * filled + "░" * (20 - filled)
        print(f"  {col:<22} {info['starting_rom']:>7.1f}°  {info['normal_rom']:>7.0f}°  "
              f"{info['deficit']:>7.1f}°  [{bar}] {pct}%")

    # ── Plan summary ──────────────────────────────────────────────────────────
    section("Full Session Plan  (grouped by identical settings)")
    print(f"  {'Day Range':<22} {'Mode':<26} {'Speed':<8} {'Intensity':<12} "
          f"{'Min':>5} {'Reps':>5} {'Rec%':>6}  End ROM")
    print("  " + "─" * 105)
    for g in groups:
        print(f"  {g['day_range']:<22} {g['therapy_mode']:<26} {g['speed']:<8} "
              f"{g['intensity']:<12} {g['session_duration_min']:>5} {g['repetitions']:>5} "
              f"{g.get('recovery_pct_at_end','–'):>5}%  {g['avg_rom_at_end']:.1f}°")

    # ── Day-by-day first 15 ───────────────────────────────────────────────────
    section("Day-by-Day Detail  (first 15 days)")
    print(f"  {'Day':<5} {'Mode':<26} {'Spd':<7} {'Int':<10} {'Min':>4} {'Reps':>5} "
          f"{'Prog':>6} {'ROM':>7} {'Rec%':>6}  {'Trend':<10} Notes")
    print("  " + "─" * 120)
    for s in sessions[:15]:
        trend = {"increasing": "↑ up", "declining": "↓ down", "stable": "→ stable", "–": "–"}.get(
            s["recovery_trend"], s["recovery_trend"])
        sore  = " ⚡SORE" if s["soreness_active"] else ""
        chg   = " ▲" if s["settings_changed"] else ""
        print(f"  {s['day']:<5} {s['therapy_mode']:<26} {s['speed']:<7} "
              f"{s['intensity']:<10} {s['session_duration_min']:>4} {s['repetitions']:>5} "
              f"{s['actual_progress']:>6.2f} {s['avg_rom_after']:>7.2f} "
              f"{s['recovery_pct']:>5.1f}%  {trend:<10} {s['session_notes']}{sore}{chg}")

    # ── Recovery curve ────────────────────────────────────────────────────────
    section("Recovery Curve  (every 5th session)")
    try:
        curve = generate_recovery_curve(patient_data,
                                        max_sessions=plan["total_days_to_recovery"])
        milestone_sessions = [c for c in curve if c["session"] % 5 == 0 or c["session"] == 1]
        print(f"  {'Day':<6} {'AvgROM':>8}  {'index_mcp':>10}  "
              f"{'wrist_flex':>11}  {'thumb_mcp':>10}  {'Recovery':>9}")
        print("  " + "─" * 65)
        for pt in milestone_sessions:
            total = plan["total_days_to_recovery"]
            pct   = round(pt["session"] / total * 100) if total > 0 else 0
            bar   = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"  {pt['session']:<6} {pt['avg_rom']:>8.2f}°  "
                  f"{pt.get('index_mcp','-'):>10}  "
                  f"{pt.get('wrist_flexion','-'):>11}  "
                  f"{pt.get('thumb_mcp','-'):>10}  "
                  f"[{bar}]")
    except Exception as e:
        print(f"  ✗ Curve failed: {e}")

    # ── Fatigue & soreness notes ──────────────────────────────────────────────
    section("Fatigue & Soreness Summary")
    sore_days    = [s["day"] for s in sessions if s["soreness_active"]]
    fatigue_days = [s["day"] for s in sessions if s["fatigue_factor"] < 0.90]
    decline_days = [s["day"] for s in sessions if s["recovery_trend"] == "declining"]
    print(f"  Sore days    : {len(sore_days)} sessions (every 7-day cycle, 2-day recovery)")
    if sore_days[:5]:
        print(f"                 First few: Days {', '.join(map(str, sore_days[:8]))}...")
    print(f"  High-fatigue : {len(fatigue_days)} sessions (progress reduced)")
    print(f"  Declining days: {len(decline_days)} sessions → consider reviewing intensity")

    print("\n" + "═" * 60)
    print("  ✅ Plan complete.")
    print("  💡 Run 'python generate_report.py' for full HTML chart report.")
    print("═" * 60 + "\n")

    # Ask to generate HTML report
    gen = input("  Generate HTML report now? (y/n) [y]: ").strip().lower()
    if gen != "n":
        generate_html_report(patient_data, plan, score)


def generate_html_report(patient_data, plan, score):
    """Generate the HTML report inline without re-running the plan."""
    import json

    sessions     = plan["sessions"]
    groups       = plan["plan_groups"]
    joint_summary= plan["joint_summary"]

    days        = [s["day"]            for s in sessions]
    avg_rom     = [s["avg_rom_after"]  for s in sessions]
    actual_prog = [s["actual_progress"]for s in sessions]
    normal_line = [round(plan["standard_normal_avg_rom"], 2)] * len(sessions)

    key_joints  = ["index_mcp", "index_pip", "wrist_flexion", "wrist_extension", "thumb_mcp"]
    joint_curves= {j: [s["joint_rom"].get(j, 0) for s in sessions] for j in key_joints}

    MODE_COLORS = {
        "Mechanical Stimulation": "#6366f1",
        "Passive":                "#06b6d4",
        "Assistive":              "#10b981",
        "Active":                 "#f59e0b",
    }

    def mode_badge(mode):
        c = MODE_COLORS.get(mode, "#94a3b8")
        return f'<span style="background:{c};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">{mode}</span>'

    def trend_icon(t):
        return {"increasing": "↑", "declining": "↓", "stable": "→"}.get(t, "–")

    def trend_color(t):
        return {"increasing": "#10b981", "declining": "#ef4444", "stable": "#94a3b8"}.get(t, "#94a3b8")

    rows = ""
    for s in sessions:
        sore  = '<span style="color:#ef4444;font-weight:700"> ⚡SORE</span>' if s["soreness_active"] else ""
        chg   = '<span style="color:#f59e0b;font-size:10px"> ▲</span>' if s["settings_changed"] else ""
        tc    = trend_color(s["recovery_trend"])
        ti    = trend_icon(s["recovery_trend"])
        jvals = " ".join(
            f'<span style="color:#94a3b8;font-size:10px">{j.replace("_"," ")}: '
            f'<b style="color:#e2e8f0">{s["joint_rom"].get(j,"–")}</b></span>'
            for j in key_joints if j in s["joint_rom"]
        )
        rows += f"""<tr>
          <td style="text-align:center;font-weight:700;color:#f1f5f9">{s['day']}</td>
          <td>{mode_badge(s['therapy_mode'])}{chg}</td>
          <td style="text-align:center">{s['speed']}</td>
          <td style="text-align:center;color:#a78bfa;font-weight:600">{s['intensity']}</td>
          <td style="text-align:center">{s['session_duration_min']} min</td>
          <td style="text-align:center">{s['repetitions']}</td>
          <td style="text-align:center;color:#64748b;font-size:11px">{s['recovery_pct']}%</td>
          <td style="text-align:center;color:#10b981;font-weight:600">{s['actual_progress']:.2f}°</td>
          <td style="text-align:center;color:#38bdf8;font-weight:700">{s['avg_rom_after']:.1f}°</td>
          <td style="text-align:center;color:{tc};font-weight:700">{ti}</td>
          <td style="font-size:10px;color:#94a3b8">{s['session_notes']}{sore}</td>
          <td style="font-size:10px">{jvals}</td>
        </tr>"""

    joint_bars = ""
    for col, info in joint_summary.items():
        pct   = round((info["starting_rom"] / info["normal_rom"]) * 100) if info["normal_rom"] > 0 else 0
        color = "#ef4444" if pct < 50 else "#f59e0b" if pct < 75 else "#10b981"
        joint_bars += f"""<tr>
          <td style="color:#cbd5e1;font-size:12px;padding:4px 8px">{col.replace("_"," ")}</td>
          <td style="padding:4px 8px">
            <div style="background:#1e293b;border-radius:4px;height:10px;width:160px;overflow:hidden">
              <div style="background:{color};height:100%;width:{pct}%;border-radius:4px"></div>
            </div>
          </td>
          <td style="color:#94a3b8;font-size:11px;padding:4px 8px">{info['starting_rom']}° / {info['normal_rom']}°</td>
          <td style="color:{color};font-size:11px;font-weight:600;padding:4px 8px">{pct}%</td>
          <td style="color:#ef4444;font-size:11px;padding:4px 8px">−{info['deficit']}°</td>
        </tr>"""

    group_rows = ""
    for g in groups:
        group_rows += f"""<tr>
          <td style="color:#f1f5f9;font-weight:600;padding:6px 10px">{g['day_range']}</td>
          <td style="padding:6px 10px">{mode_badge(g['therapy_mode'])}</td>
          <td style="color:#94a3b8;padding:6px 10px">{g['speed']}</td>
          <td style="color:#a78bfa;font-weight:600;padding:6px 10px">{g['intensity']}</td>
          <td style="color:#94a3b8;padding:6px 10px">{g['session_duration_min']} min</td>
          <td style="color:#94a3b8;padding:6px 10px">{g['repetitions']} reps</td>
          <td style="color:#38bdf8;font-weight:600;padding:6px 10px">{g['avg_rom_at_end']}°</td>
          <td style="color:#64748b;padding:6px 10px">{g.get('recovery_pct_at_end','–')}%</td>
        </tr>"""

    name = f"{patient_data['Diagnosis']} | {patient_data['Hand_Side']} Hand | {patient_data['severity_level']}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ULTRAHAND — {name}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  :root{{--bg:#0a0f1e;--surface:#111827;--border:#1e293b;--text:#e2e8f0;--muted:#64748b;--accent:#38bdf8;--green:#10b981;--red:#ef4444;--yellow:#f59e0b}}
  body{{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;padding:28px;min-height:100vh}}
  h1{{font-size:24px;font-weight:700;color:#fff}}
  h2{{font-size:13px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}}
  .tag{{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}}
  .card{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}}
  .hdr{{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid var(--border)}}
  .stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}}
  .stat{{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px}}
  .stat-val{{font-size:26px;font-weight:700;color:var(--accent);font-family:'DM Mono',monospace}}
  .stat-lbl{{font-size:11px;color:var(--muted);margin-top:3px}}
  .cgrid{{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px}}
  .cw{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;height:280px;position:relative}}
  .pw{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;height:160px;position:relative;margin-bottom:20px}}
  table{{width:100%;border-collapse:collapse;font-size:12px}}
  th{{background:#0f172a;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-size:10px;padding:9px 8px;text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0}}
  td{{padding:7px 8px;border-bottom:1px solid #1a2235;vertical-align:middle}}
  tr:hover td{{background:#151f32}}
  .scroll{{max-height:460px;overflow-y:auto;border-radius:8px;border:1px solid var(--border)}}
  .two{{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px}}
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="tag">Ultrahand AI · Recovery Report</div>
    <h1 style="margin-top:5px">{patient_data['Diagnosis']}</h1>
    <div style="font-size:13px;color:var(--muted);margin-top:3px">{patient_data['Hand_Side']} Hand &nbsp;·&nbsp; {patient_data['severity_level']} &nbsp;·&nbsp; {patient_data['affected_joints']} joints</div>
  </div>
  <div style="text-align:right">
    <div class="tag">Starting Mode</div>
    <div style="font-size:16px;font-weight:600;color:#fff;margin-top:4px">{patient_data['Therapy_Mode']}</div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">Day 1 Assessment</div>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="stat-val">{plan['total_days_to_recovery']}</div><div class="stat-lbl">Days to Full Recovery</div></div>
  <div class="stat"><div class="stat-val">{plan['initial_avg_rom']:.1f}°</div><div class="stat-lbl">Starting Avg ROM</div></div>
  <div class="stat"><div class="stat-val">{plan['standard_normal_avg_rom']:.1f}°</div><div class="stat-lbl">Target Normal ROM</div></div>
  <div class="stat"><div class="stat-val">{score:.2f}°</div><div class="stat-lbl">Progress / Session</div></div>
</div>

<div class="cgrid">
  <div class="cw"><h2>Recovery Curve — Avg ROM per Day</h2>
    <div style="height:210px;position:relative"><canvas id="romChart"></canvas></div></div>
  <div class="cw"><h2>Per-Joint ROM Progress</h2>
    <div style="height:210px;position:relative"><canvas id="jointChart"></canvas></div></div>
</div>
<div class="pw"><h2>Daily Progress Score</h2>
  <div style="height:110px;position:relative"><canvas id="progChart"></canvas></div></div>

<div class="card">
  <h2>Plan Summary — Settings by Phase</h2>
  <table><thead><tr>
    <th>Day Range</th><th>Mode</th><th>Speed</th><th>Intensity</th>
    <th>Duration</th><th>Reps</th><th>ROM at End</th><th>Recovery %</th>
  </tr></thead><tbody>{group_rows}</tbody></table>
</div>

<div class="two">
  <div class="card" style="margin-bottom:0">
    <h2>Joint ROM at Day 1</h2>
    <table><thead><tr><th>Joint</th><th>Bar</th><th>Current/Normal</th><th>%</th><th>Deficit</th></tr></thead>
    <tbody>{joint_bars}</tbody></table>
  </div>
  <div class="card" style="margin-bottom:0">
    <h2>Fatigue &amp; Soreness Model</h2>
    <div style="font-size:12px;color:var(--muted);line-height:1.9">
      <p style="color:var(--text);margin-bottom:10px">Settings adapt dynamically every session.</p>
      <p><span style="color:var(--yellow);font-weight:600">Fatigue</span> — builds within each mode block.<br>Reduces progress up to 20%. Resets on mode upgrade.</p><br>
      <p><span style="color:var(--red);font-weight:600">Soreness ⚡</span> — every 7 days (muscle overload).<br>Day 1: −30% intensity · Day 2: −12% intensity.</p><br>
      <p><span style="color:var(--green);font-weight:600">↑ Increasing</span> — recovery accelerating<br>
         <span style="color:var(--muted)">→ Stable</span> — consistent progress<br>
         <span style="color:var(--red)">↓ Declining</span> — review therapy intensity</p><br>
      <p><b style="color:#fff">Active mode max: 5 sessions</b><br>After 5 Active days → patient discharged.</p>
    </div>
  </div>
</div>
<br>
<div class="card">
  <h2>Full Day-by-Day Session Plan</h2>
  <div class="scroll"><table>
    <thead><tr>
      <th>Day</th><th>Mode</th><th>Speed</th><th>Intensity</th><th>Duration</th><th>Reps</th>
      <th>Rec%</th><th>Progress</th><th>Avg ROM</th><th>Trend</th><th>Notes</th><th>Key Joints</th>
    </tr></thead>
    <tbody>{rows}</tbody>
  </table></div>
</div>

<div style="text-align:center;color:var(--muted);font-size:11px;margin-top:20px;padding-top:14px;border-top:1px solid var(--border)">
  ULTRAHAND AI · For clinical reference only · Not a substitute for physiotherapist judgment
</div>

<script>
const CD = {{
  color:'#94a3b8',
  plugins:{{legend:{{labels:{{color:'#94a3b8',font:{{size:11}}}}}}}},
  scales:{{
    x:{{ticks:{{color:'#64748b',font:{{size:9}},maxTicksLimit:20}},grid:{{color:'#1e293b'}}}},
    y:{{ticks:{{color:'#64748b',font:{{size:10}}}},grid:{{color:'#1e293b'}}}}
  }}
}};
const L={json.dumps(days)}, AR={json.dumps(avg_rom)}, NL={json.dumps(normal_line)}, PR={json.dumps(actual_prog)};
const JD={json.dumps([{{"label":j.replace("_"," "),"data":joint_curves[j],"borderColor":c,"backgroundColor":c+"22","tension":0.4,"pointRadius":0}} for j,c in zip(key_joints,["#6366f1","#06b6d4","#10b981","#f59e0b","#ec4899"])])};
new Chart(document.getElementById('romChart'),{{type:'line',data:{{labels:L,datasets:[
  {{label:'Avg ROM',data:AR,borderColor:'#38bdf8',backgroundColor:'#38bdf822',fill:true,tension:0.4,pointRadius:0,borderWidth:2}},
  {{label:'Normal Target',data:NL,borderColor:'#10b981',borderDash:[6,4],pointRadius:0,borderWidth:1.5,backgroundColor:'transparent'}}
]}},options:{{...CD,responsive:true,maintainAspectRatio:false}}}});
new Chart(document.getElementById('jointChart'),{{type:'line',data:{{labels:L,datasets:JD}},options:{{...CD,responsive:true,maintainAspectRatio:false}}}});
new Chart(document.getElementById('progChart'),{{type:'bar',data:{{labels:L,datasets:[{{label:'Progress°',data:PR,backgroundColor:'#6366f144',borderColor:'#6366f1',borderWidth:1,borderRadius:3}}]}},options:{{...CD,responsive:true,maintainAspectRatio:false,plugins:{{legend:{{display:false}}}}}}}});
</script>
</body></html>"""

    path = "ultrahand_report.html"
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"\n  ✅ Report saved: {path}")
    print(f"  Open it in your browser to view charts.\n")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "═" * 60)
    print("  ULTRAHAND — Patient Input System")
    print("  Enter patient data to generate recovery plan")
    print("═" * 60)

    while True:
        try:
            patient_data = collect_patient_data()
            display_results(patient_data)
        except KeyboardInterrupt:
            print("\n\n  Session ended.\n")
            sys.exit(0)

        again = input("\n  Assess another patient? (y/n) [n]: ").strip().lower()
        if again != "y":
            print("\n  Goodbye.\n")
            break
