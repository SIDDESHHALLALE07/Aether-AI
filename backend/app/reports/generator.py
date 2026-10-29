from typing import Dict, Any, List
import json

def generate_executive_report_html(
    dataset_name: str,
    row_count: int,
    col_count: int,
    quality_score: Dict[str, Any],
    patterns: List[Dict[str, Any]],
    insights: List[Dict[str, Any]]
) -> str:
    pattern_rows = ""
    for p in patterns[:3]:
        pattern_rows += f"<li><strong>{p.get('pattern_type', '').upper()}:</strong> {p.get('explanation', '')}</li>"

    insight_cards = ""
    for ins in insights[:3]:
        insight_cards += f"""
        <div style="background:#1e293b; color:#f8fafc; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid #3b82f6;">
            <h4 style="margin:0 0 5px 0; color:#60a5fa;">[{ins.get('insight_type', '').upper()}] {ins.get('title', '')}</h4>
            <p style="margin:0 0 10px 0; font-size:14px; color:#cbd5e1;">{ins.get('description', '')}</p>
            <p style="margin:0; font-size:13px; font-style:italic; color:#94a3b8;"><strong>Recommendation:</strong> {ins.get('ai_interpretation', '')}</p>
        </div>
        """

    overall_val = quality_score.get('overall_score')
    overall_display = f"{overall_val}/100" if overall_val is not None else "N/A"

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Executive Data Intelligence Report - {dataset_name}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; line-height: 1.6; }}
        .header {{ border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 25px; }}
        .title {{ font-size: 26px; color: #38bdf8; font-weight: bold; }}
        .subtitle {{ font-size: 14px; color: #94a3b8; }}
        .card {{ background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }}
        .metric-val {{ font-size: 32px; font-weight: bold; color: #10b981; }}
        .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }}
    </style>
</head>
<body>
    <div class="header">
        <div class="title">AETHER — DATA ANALYSIS REPORT</div>
        <div class="subtitle">Dataset: {dataset_name} | Generated automatically by Aether Engine</div>
    </div>

    <div class="grid">
        <div class="card">
            <div style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Data Quality Score</div>
            <div class="metric-val">{overall_display}</div>
        </div>
        <div class="card">
            <div style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Total Records</div>
            <div class="metric-val" style="color:#60a5fa;">{row_count:,}</div>
        </div>
        <div class="card">
            <div style="font-size:12px; color:#94a3b8; text-transform:uppercase;">Total Dimensions</div>
            <div class="metric-val" style="color:#a855f7;">{col_count}</div>
        </div>
    </div>

    <div class="card">
        <h3 style="margin-top:0; color:#38bdf8;">Key Pattern Discovery</h3>
        <ul>
            {pattern_rows if pattern_rows else "<li>No statistical anomalies detected.</li>"}
        </ul>
    </div>

    <div class="card">
        <h3 style="margin-top:0; color:#38bdf8;">Automated Executive AI Insights</h3>
        {insight_cards if insight_cards else "<p>No critical risk factors identified.</p>"}
    </div>
</body>
</html>
"""
    return html
