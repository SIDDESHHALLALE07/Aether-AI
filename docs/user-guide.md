# End-User Guide & Spatial Analytics Walkthrough

## 1. Getting Started

Welcome to **Aether Copilot AI**. This guide explains how to transform raw CSV or Excel files into clean, actionable insights using our spatial analytics interface.

---

## 2. Navigating the Spatial Analytics Workspace

The signature navigation pattern in Aether Copilot AI is the **Spatial Workspace**:

1. **Pan & Zoom:** Click and drag the spatial background canvas to pan. Use mouse wheel or pinching gestures to zoom in/out.
2. **Node Connections:**
   - `Dataset Node`: Represents uploaded file versions.
   - `Quality Node`: Shows Completeness, Uniqueness, Validity, and Consistency scores.
   - `Cleaning Node`: Provides smart missing value imputation, duplicate removal, and type normalization controls.
   - `Analytics Node`: Interactive group-by, aggregation, and statistical percentiles.
   - `Visualizations Node`: Plotly bar, scatter, line, pie, and heatmap charts.
   - `Pattern Discovery Node`: Displays automatically discovered correlations, anomalies, and clusters.
   - `AI Copilot Node`: Context-aware natural language assistant.
   - `Reports Node`: Executive summary generation and PDF/CSV export.
3. **Contextual Side Panels:** Clicking any node on the canvas opens a contextual side panel with detailed actions and metrics.

---

## 3. Step-by-Step Workflow

### Step 1: Upload Dataset
- Click **Upload Dataset** on the Dashboard or Spatial Workspace.
- Select a `.csv` or `.xlsx` file.

### Step 2: Review Data Quality & Profile
- Click the **Data Quality** node to inspect your 0-100 Quality Score.
- Identify detected issues (e.g. 5% missing values in `Age`, 12 duplicate rows).

### Step 3: Apply Smart Data Cleaning
- Click **Clean Dataset**. Choose auto-fix recommendations or custom rules.
- Click **Apply Cleaning**. A new dataset version (V2) is created non-destructively.

### Step 4: Explore Patterns & Analytics
- Navigate to **Pattern Discovery** to view automatic correlation heatmaps and outlier alerts.
- Use **Visualizations** to generate custom Plotly charts.

### Step 5: Interact with AI Copilot
- Ask questions like: *"What is the distribution of sales across regions?"* or *"Explain the strongest correlation in this dataset."*
- Receive clear explanations grounded strictly in computed evidence.

### Step 6: Generate Executive Report
- Click **Reports** -> **Generate Report**.
- Download formatted PDF report or sanitized CSV/Excel data export.
