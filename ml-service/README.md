# ULTRAHAND — Hand Rehabilitation AI

AI-powered physiotherapy system that predicts ROM (range of motion) recovery
and generates full day-by-day session plans with fatigue/soreness modelling.

---

## FOLDER STRUCTURE

```
ULTRAHAND/
├── ultrahand_dataset.csv        ← training data (add yours here)
├── requirements.txt             ← Python dependencies
│
├── config.py                    ← all settings, thresholds, joint normals
├── train_model.py               ← trains the RandomForest model
├── evaluate_model.py            ← evaluates & promotes candidate model
│
├── model_service.py             ← loads model, runs predictions
├── simulator_service.py         ← generates full day-by-day recovery plan
├── recovery_curve_service.py    ← ROM curve session by session
├── insight_service.py           ← clinical summary text report
├── db_service.py                ← database stub (PostgreSQL-ready)
├── retrain_service.py           ← auto-retraining trigger
│
├── patient_input.py             ← INTERACTIVE: enter patient, see plan
├── test_day1_patient.py         ← test 3 sample patients
├── generate_report.py           ← generate HTML report with charts
│
└── models/
    ├── production/              ← active model used for predictions
    ├── staging/                 ← candidate model (evaluated before promoting)
    ├── encoders.pkl             ← label encoders for categorical columns
    └── feature_list.pkl         ← feature names used during training
```

---

## QUICK START (New Environment)

### Step 1 — Prerequisites
- Python 3.9 or higher
- VS Code (recommended)

### Step 2 — Open in VS Code
```
File → Open Folder → select the ULTRAHAND folder
```

### Step 3 — Install Python extension
In VS Code Extensions (Ctrl+Shift+X), search and install:
- Python  (by Microsoft)

### Step 4 — Open terminal in VS Code
```
Ctrl + `   (backtick)
```

### Step 5 — Install dependencies
```
pip install -r requirements.txt
```

### Step 6 — Add your dataset
Place your CSV file in the folder and rename it:
```
ultrahand_dataset.csv
```

### Step 7 — Train the model
```
python train_model.py
```
This creates:  models/production/progression_model.pkl
               models/encoders.pkl
               models/feature_list.pkl

### Step 8 — Evaluate the model
```
python evaluate_model.py
```
Compares candidate vs production model. Promotes if better.

### Step 9 — Test with sample patients
```
python test_day1_patient.py
```
Runs 3 built-in patients (Severe/Stroke, Moderate/Arthritis, Mild/PostSurgery).

### Step 10 — Enter your own patient & see results
```
python patient_input.py
```
Interactive prompts. Generates full plan + HTML report with charts.

### Step 11 — View the HTML report
After running patient_input.py or generate_report.py:
```
Double-click ultrahand_report.html  →  opens in browser
```
Or in VS Code terminal:
```
start ultrahand_report.html
```

---

## RUN ORDER SUMMARY

```
pip install -r requirements.txt
python train_model.py
python evaluate_model.py
python test_day1_patient.py
python patient_input.py
```

---

## WHAT EACH FILE DOES

| File | Purpose |
|------|---------|
| train_model.py | Trains RandomForest on your CSV dataset |
| evaluate_model.py | Tests candidate model, promotes if MAE improves |
| test_day1_patient.py | Smoke test with 3 hardcoded patients |
| patient_input.py | Interactive input → full plan + HTML report |
| generate_report.py | Re-generates HTML report for Patient C (edit to change) |
| config.py | Edit mode thresholds, joint normals, session limits here |

---

## NOTES

- The `models/` folder will be created automatically by train_model.py
- Do NOT delete encoders.pkl or feature_list.pkl after training
- The HTML report opens in any browser — no server needed
- Active mode is capped at 5 sessions (discharge criteria)
- Soreness model: spikes every 7 days, recovers over 2 days
- Fatigue model: builds within each mode block, resets on mode upgrade

---

## PYTHON VERSION

Tested on Python 3.9, 3.10, 3.11
