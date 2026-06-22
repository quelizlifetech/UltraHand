# ml-service/config.py

> **Source File:** [ml-service/config.py](https://github.com/quelizlifetech/UltraHand/blob/main/ml-service/config.py)
> **Repository:** `UltraHand`
> **Branch:** `main`

# ml-service/config.py

### Overview
This file serves as the central configuration store for the `ml-service`. It defines constants and parameters used across various components, including data paths, model storage locations, machine learning training settings, joint angle definitions, and detailed parameters for generating patient therapy plans.

### Architecture & Role
This file operates at the configuration layer of the `ml-service`. It is a passive module that provides static, read-only parameters to other active components (e.g., data processing scripts, model training pipelines, prediction services, and therapy plan generators). Its role is to centralize and standardize all configurable values, ensuring consistency across the application.

### Key Components
- `DATASET_PATH`: Specifies the location of the primary dataset used for training and evaluation.
- `MODEL_PRODUCTION_PATH`, `MODEL_STAGING_PATH`, `ENCODER_PATH`, `FEATURE_LIST_PATH`: Paths for persistent storage and retrieval of trained models, feature encoders, and feature lists.
- `TARGET_COLUMN`, `CATEGORICAL_COLUMNS`, `DROP_COLUMNS`: Define the target variable and feature engineering specifications for model training.
- `JOINT_ANGLE_COLUMNS`, `JOINT_NORMAL_ROM`, `RECOVERY_TARGET_PCT`: Parameters for analyzing joint range of motion and defining recovery goals.
- `RETRAIN_THRESHOLD`, `TRACKING_FILE`: Configuration for automated model retraining logic based on data volume.
- `THERAPY_MODE_PROGRESSION`, `MODE_THRESHOLDS`, `MODE_INTENSITY_STEPS`: Structured data defining the sequence of therapy modes and the granular progression of intensity, speed, duration, and repetitions within each mode based on patient recovery percentage.
- `SETTINGS_REVIEW_INTERVAL`, `MAX_PLAN_SESSIONS`: Constraints for therapy plan generation.
- `DB_CONFIG`, `DB_TABLE` (commented): Placeholder for PostgreSQL database connection details, indicating potential future integration.

### Execution Flow / Behavior
This file itself does not execute any logic. It is imported by other Python modules within the `ml-service` to access the defined constants. At runtime, these constants are used to configure data loading, model operations, and therapy plan generation algorithms.

### Dependencies
- **Internal**: This file has no internal Python dependencies. Other modules within the `ml-service` explicitly depend on importing and utilizing the constants defined here.
- **External**: The commented-out `DB_CONFIG` section shows a potential future dependency on the `os` module for environment variable access, which would be used for database connection parameters. Currently, no active external dependencies are imported.

### Design Notes
- **Centralized Configuration**: All service parameters are consolidated, simplifying updates and maintaining a single source of truth for configuration.
- **Model Lifecycle Support**: Separate paths for production and staging models facilitate a clear model promotion and testing workflow.
- **Granular Therapy Planning**: The `MODE_INTENSITY_STEPS` structure allows for detailed, phase-based adjustments to therapy parameters, enabling adaptive patient care based on recovery progress.
- **Extensibility**: The constant-based structure allows for easy addition or modification of configuration parameters without altering core logic.
- **Future Database Integration**: The presence of commented-out database configuration indicates a planned architectural evolution to persist data in a PostgreSQL database, likely integrating with a web application or external data store.

### Diagram
None significant.