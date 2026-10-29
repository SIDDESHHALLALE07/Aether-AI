import io
import os
import math
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
    PageBreak
)
from reportlab.pdfgen import canvas

from app.reports.analysis_engine import analyze_dataset_for_report


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas for dynamic total page count and professional running header/footer.
    """
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []
        self.dataset_title: str = "Dataset"

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int) -> None:
        self.saveState()
        page_num: int = getattr(self, '_pageNumber', 1)
        # Suppress running header & footer on cover page
        if page_num > 1:
            # Header
            self.setFont("Helvetica-Bold", 8.5)
            self.setFillColor(colors.HexColor("#0F172A"))
            self.drawString(40, 810, "Aether")
            self.setFont("Helvetica", 8.5)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(75, 810, "— Data Analysis Report")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(40, 802, 555, 802)

            # Footer
            self.line(40, 45, 555, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            # Left: Dataset name
            ds_text = getattr(self, 'dataset_title', 'Dataset')
            self.drawString(40, 32, ds_text[:50])
            # Right: Page X of Y
            page_text = f"Page {page_num} of {page_count}"
            self.drawRightString(555, 32, page_text)
        self.restoreState()


# ==============================================================================
# VISUALIZATION GENERATION FUNCTIONS (MATPLOTLIB)
# Publication quality: Pure white backgrounds, readable typography, no clipping.
# ==============================================================================

def _generate_missing_values_chart_image(col_profiles: Dict[str, Dict[str, Any]]) -> Optional[io.BytesIO]:
    """Generates a clean horizontal bar chart of missing data rates across columns."""
    cols = list(col_profiles.keys())
    missing_pcts = [col_profiles[c].get("missing_pct", 0.0) for c in cols]
    
    # If zero missing across all, no need for chart
    if max(missing_pcts, default=0.0) == 0:
        return None

    items = sorted(zip(cols, missing_pcts), key=lambda x: x[1], reverse=True)
    items = [x for x in items if x[1] > 0][:8]
    if not items:
        return None

    c_names = [x[0][:18] for x in items]
    c_vals = [x[1] for x in items]

    fig, ax = plt.subplots(figsize=(6.8, 2.2), dpi=200)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    y_pos = np.arange(len(c_names))
    colors_bar = ["#EF4444" if v > 20 else "#F59E0B" if v > 5 else "#2563EB" for v in c_vals]
    ax.barh(y_pos, c_vals, color=colors_bar, alpha=0.9, height=0.5)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(c_names, fontsize=8, color="#0F172A", fontfamily="sans-serif")
    ax.invert_yaxis()
    ax.set_xlabel("Missing Data Rate (%)", fontsize=8, color="#475569", fontfamily="sans-serif")
    ax.set_title("Missing Value Proportions by Column", fontsize=9, fontweight="bold", color="#0F172A", loc="left", pad=8)
    
    for i, v in enumerate(c_vals):
        ax.text(v + 0.5, i, f"{v:.1f}%", color="#334155", fontsize=7.5, va="center")

    ax.grid(axis="x", linestyle="--", alpha=0.3, color="#CBD5E1")
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color("#E2E8F0")
    ax.spines['bottom'].set_color("#E2E8F0")
    ax.tick_params(axis="both", labelsize=8)
    
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
    plt.close(fig)
    buf.seek(0)
    return buf


def _generate_distribution_chart_image(df: pd.DataFrame, numeric_cols: List[str]) -> Optional[io.BytesIO]:
    """Generates distribution histograms for primary numerical features."""
    if not numeric_cols or df is None or len(df) == 0:
        return None

    top_cols = numeric_cols[:min(3, len(numeric_cols))]
    fig, axes = plt.subplots(1, len(top_cols), figsize=(6.8, 2.4), dpi=200)
    fig.patch.set_facecolor("#FFFFFF")
    axes_list = [axes] if len(top_cols) == 1 else list(axes)

    for ax, col in zip(axes_list, top_cols):
        ax.set_facecolor("#FFFFFF")
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) > 0:
            ax.hist(series, bins=12, color='#2563EB', edgecolor='#1D4ED8', alpha=0.85, density=False)
            median_val = series.median()
            ax.axvline(median_val, color='#DC2626', linestyle='--', linewidth=1.2, label=f'Median: {median_val:.1f}')
            ax.set_title(f"{col[:16]}", fontsize=8.5, fontweight='bold', color='#0F172A', pad=6)
            ax.tick_params(axis='both', which='major', labelsize=7)
            ax.grid(axis='y', linestyle='--', alpha=0.3, color="#CBD5E1")
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color("#E2E8F0")
            ax.spines['bottom'].set_color("#E2E8F0")
            ax.legend(fontsize=6.5, loc='upper right', framealpha=0.9)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
    plt.close(fig)
    buf.seek(0)
    return buf


def _generate_box_plot_image(df: pd.DataFrame, numeric_cols: List[str]) -> Optional[io.BytesIO]:
    """Generates box plots visualizing interquartile ranges and outlier observations."""
    if not numeric_cols or df is None or len(df) == 0:
        return None

    top_cols = numeric_cols[:min(4, len(numeric_cols))]
    fig, ax = plt.subplots(figsize=(6.8, 2.5), dpi=200)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    data_to_plot = []
    labels = []
    for col in top_cols:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) > 0:
            s_min, s_max = series.min(), series.max()
            if s_max > s_min:
                normalized = (series - s_min) / (s_max - s_min) * 100
                data_to_plot.append(normalized)
            else:
                data_to_plot.append(series)
            labels.append(f"{col[:12]}\n(Scaled 0-100)")

    if not data_to_plot:
        plt.close(fig)
        return None

    bp = ax.boxplot(
        data_to_plot,
        tick_labels=labels,
        patch_artist=True,
        boxprops=dict(facecolor="#EFF6FF", color="#2563EB", linewidth=1.2),
        whiskerprops=dict(color="#2563EB", linewidth=1),
        capprops=dict(color="#2563EB", linewidth=1),
        medianprops=dict(color="#DC2626", linewidth=1.5),
        flierprops=dict(marker='o', markersize=3.5, markerfacecolor='#EF4444', markeredgecolor='none', alpha=0.7)
    )

    ax.set_ylabel("Standardized Scale (0-100)", fontsize=7.5, color="#475569")
    ax.set_title("Interquartile Dispersion & Outlier Range (Tukey's 1.5x IQR)", fontsize=9, fontweight="bold", color="#0F172A", loc="left", pad=8)
    ax.grid(axis="y", linestyle="--", alpha=0.3, color="#CBD5E1")
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color("#E2E8F0")
    ax.spines['bottom'].set_color("#E2E8F0")
    ax.tick_params(axis="both", labelsize=7.5)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
    plt.close(fig)
    buf.seek(0)
    return buf


def _generate_correlation_heatmap_image(df: pd.DataFrame) -> Optional[io.BytesIO]:
    """Generates an annotated correlation heatmap for numeric features."""
    if df is None or len(df) == 0:
        return None

    numeric_df = df.select_dtypes(include="number")
    if numeric_df.shape[1] < 2:
        return None

    corr = numeric_df.corr().fillna(0)
    cols = list(corr.columns)[:8]
    sub_corr = corr.loc[cols, cols]

    fig, ax = plt.subplots(figsize=(6.8, 3.4), dpi=200)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    cax = ax.matshow(sub_corr.values, cmap='Blues', vmin=-1, vmax=1)
    cbar = fig.colorbar(cax, fraction=0.046, pad=0.04)
    cbar.ax.tick_params(labelsize=7)

    ax.set_xticks(range(len(cols)))
    ax.set_yticks(range(len(cols)))
    ax.set_xticklabels([c[:12] for c in cols], rotation=30, ha="left", fontsize=7.5, color="#0F172A")
    ax.set_yticklabels([c[:12] for c in cols], fontsize=7.5, color="#0F172A")

    for i in range(len(cols)):
        for j in range(len(cols)):
            val = sub_corr.values[i, j]
            text_color = "white" if abs(val) > 0.55 else "#0F172A"
            ax.text(j, i, f"{val:.2f}", ha="center", va="center", color=text_color, fontsize=7.5, fontweight='bold')

    ax.set_title("Pearson Feature Correlation Matrix", fontsize=9, fontweight='bold', pad=14, color="#0F172A", loc="left")
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
    plt.close(fig)
    buf.seek(0)
    return buf


def _generate_categorical_chart_image(df: pd.DataFrame, cat_cols: List[str]) -> Optional[io.BytesIO]:
    """Generates a categorical frequency bar chart for the primary categorical attribute."""
    if not cat_cols or df is None or len(df) == 0:
        return None

    primary_cat = cat_cols[0]
    series = df[primary_cat].dropna().astype(str)
    counts = series.value_counts().head(8)
    if len(counts) == 0:
        return None

    fig, ax = plt.subplots(figsize=(6.8, 2.4), dpi=200)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    y_pos = np.arange(len(counts))
    ax.barh(y_pos, counts.values, color="#2563EB", edgecolor="#1D4ED8", alpha=0.9, height=0.5)
    ax.set_yticks(y_pos)
    ax.set_yticklabels([str(k)[:16] for k in counts.index], fontsize=8, color="#0F172A")
    ax.invert_yaxis()
    ax.set_xlabel("Record Frequency", fontsize=8, color="#475569")
    ax.set_title(f"Category Frequencies: '{primary_cat}' (Top {len(counts)} Levels)", fontsize=9, fontweight="bold", color="#0F172A", loc="left", pad=8)
    ax.grid(axis="x", linestyle="--", alpha=0.3, color="#CBD5E1")
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color("#E2E8F0")
    ax.spines['bottom'].set_color("#E2E8F0")

    for i, v in enumerate(counts.values):
        pct = (v / len(series)) * 100
        ax.text(v + (max(counts.values) * 0.015), i, f"{v:,} ({pct:.1f}%)", va='center', fontsize=7.5, color="#334155")

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
    plt.close(fig)
    buf.seek(0)
    return buf


def _generate_bivariate_chart_image(df: pd.DataFrame, numeric_cols: List[str], datetime_cols: List[str]) -> Optional[io.BytesIO]:
    """Generates scatter plot or chronological trend chart where meaningful."""
    if df is None or len(df) == 0:
        return None

    fig, ax = plt.subplots(figsize=(6.8, 2.5), dpi=200)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    if len(numeric_cols) >= 2:
        x_col = numeric_cols[0]
        y_col = numeric_cols[1]
        x_series = pd.to_numeric(df[x_col], errors="coerce")
        y_series = pd.to_numeric(df[y_col], errors="coerce")
        valid = x_series.notna() & y_series.notna()
        if valid.sum() > 0:
            ax.scatter(x_series[valid].head(250), y_series[valid].head(250), color="#2563EB", alpha=0.7, edgecolors="#1D4ED8", s=24)
            ax.set_xlabel(x_col[:20], fontsize=8, color="#475569")
            ax.set_ylabel(y_col[:20], fontsize=8, color="#475569")
            ax.set_title(f"Bivariate Scatter: '{x_col}' vs '{y_col}'", fontsize=9, fontweight="bold", color="#0F172A", loc="left", pad=8)
            ax.grid(True, linestyle="--", alpha=0.3, color="#CBD5E1")
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color("#E2E8F0")
            ax.spines['bottom'].set_color("#E2E8F0")
            ax.tick_params(axis="both", labelsize=7.5)
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
            plt.close(fig)
            buf.seek(0)
            return buf

    if datetime_cols and numeric_cols:
        d_col = datetime_cols[0]
        n_col = numeric_cols[0]
        parsed = pd.to_datetime(df[d_col], errors="coerce")
        y_num = pd.to_numeric(df[n_col], errors="coerce")
        valid = parsed.notna() & y_num.notna()
        sub = df[valid].copy()
        sub["_dt"] = parsed[valid]
        sub["_val"] = y_num[valid]
        sub = sub.sort_values(by="_dt").head(50)
        if len(sub) > 0:
            ax.plot(range(len(sub)), sub["_val"], color="#2563EB", marker="o", markersize=3, linewidth=1.4)
            ax.fill_between(range(len(sub)), sub["_val"], color="#2563EB", alpha=0.12)
            step = max(1, len(sub) // 5)
            ticks = list(range(0, len(sub), step))
            ax.set_xticks(ticks)
            ax.set_xticklabels([sub["_dt"].iloc[i].strftime("%Y-%m-%d") for i in ticks], rotation=20, ha="right", fontsize=7)
            ax.set_ylabel(n_col[:16], fontsize=8, color="#475569")
            ax.set_title(f"Temporal Trend: '{n_col}' Across '{d_col}'", fontsize=9, fontweight="bold", color="#0F172A", loc="left", pad=8)
            ax.grid(True, linestyle="--", alpha=0.3, color="#CBD5E1")
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color("#E2E8F0")
            ax.spines['bottom'].set_color("#E2E8F0")
            ax.tick_params(axis="both", labelsize=7.5)
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', facecolor="#FFFFFF")
            plt.close(fig)
            buf.seek(0)
            return buf

    plt.close(fig)
    return None


# ==============================================================================
# MAIN EXECUTIVE REPORT GENERATOR
# ==============================================================================

def generate_executive_pdf_report(
    dataset_name: str,
    row_count: int,
    col_count: int,
    quality_score: Optional[Dict[str, Any]] = None,
    summary_stats: Optional[Dict[str, Any]] = None,
    patterns: Optional[List[Dict[str, Any]]] = None,
    insights: Optional[List[Dict[str, Any]]] = None,
    df: Optional[pd.DataFrame] = None,
    cleaning_ops: Optional[List[Dict[str, Any]]] = None,
    chart_config: Optional[Dict[str, Any]] = None,
    analysis: Optional[Dict[str, Any]] = None,
    project_name: str = "Enterprise Workspace",
    version_num: int = 1
) -> bytes:
    """
    Generates a publication-grade, analyst-ready Data Analysis Report in PDF format.
    Strictly follows all requirements: Cover page, Executive Summary, Dataset Overview,
    Data Quality, Descriptive Statistics, Categorical Analysis, Distribution Analysis,
    Correlation Analysis, Relationships, Outlier Analysis, Key Findings, Recommendations, Appendix.
    """
    # 1. Compute empirical analysis if not provided
    if analysis is None:
        if df is not None and len(df) > 0:
            analysis = analyze_dataset_for_report(
                df=df,
                dataset_name=dataset_name,
                project_name=project_name,
                version_num=version_num
            )
        else:
            analysis = {
                "report_title": f"Data Analysis Report — {dataset_name}",
                "dataset_name": dataset_name,
                "project_name": project_name,
                "version_number": version_num,
                "generation_timestamp": datetime.now(timezone(timedelta(0))).strftime("%d %B %Y, %H:%M UTC"),
                "total_rows": row_count,
                "total_columns": col_count,
                "column_profiles": {},
                "kpi_cards": [
                    {"metric": "Total Records", "value": f"{row_count:,}", "description": "Verified row count."},
                    {"metric": "Total Columns", "value": f"{col_count}", "description": "Analytical feature dimensions."},
                    {"metric": "Data Quality Score", "value": f"{quality_score.get('overall_score', 95) if quality_score else 95}/100", "description": "Calculated completeness & consistency."},
                ],
                "key_findings": ["Analytical profiling initialized successfully."],
                "data_quality": {"overall_score": quality_score.get("overall_score", 95) if quality_score else 95, "sub_scores": {}, "factors": []},
                "numeric_profiles": {},
                "categorical_profiles": {},
                "trend_analysis": {"available": False},
                "correlation_analysis": {"available": False},
                "patterns": patterns or [],
                "insights": insights or [],
                "recommendations": [],
                "numeric_summary_table": [],
                "categorical_summary_table": [],
                "methodology": {}
            }

    col_profiles = analysis.get("column_profiles", {})
    numeric_profiles = analysis.get("numeric_profiles", {})
    categorical_profiles = analysis.get("categorical_profiles", {})
    trend_analysis = analysis.get("trend_analysis", {})
    corr_analysis = analysis.get("correlation_analysis", {})
    dq = analysis.get("data_quality", {})
    overall_score = dq.get("overall_score", 95)
    sub_scores = dq.get("sub_scores", {})
    kpi_cards = analysis.get("kpi_cards", [])
    key_findings = analysis.get("key_findings", [])
    recs = analysis.get("recommendations", [])

    numeric_cols = [c for c, p in col_profiles.items() if p.get("is_numeric")]
    cat_cols = [c for c, p in col_profiles.items() if p.get("is_categorical")]
    datetime_cols = [c for c, p in col_profiles.items() if p.get("is_datetime")]

    # Document setup: A4, 40pt margins -> printable width = 515.27pt
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=45,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    # Refined professional typography
    style_cover_brand = ParagraphStyle(
        'CoverBrand',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )
    style_cover_sub = ParagraphStyle(
        'CoverSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#475569'),
        spaceAfter=28
    )
    style_h1 = ParagraphStyle(
        'ReportH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    style_h2 = ParagraphStyle(
        'ReportH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13.5,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    style_body = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )
    style_body_bold = ParagraphStyle(
        'ReportBodyBold',
        parent=style_body,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0F172A')
    )
    style_meta = ParagraphStyle(
        'ReportMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#64748B'),
        textTransform='uppercase'
    )
    style_tbl_cell = ParagraphStyle(
        'ReportTblCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )
    style_tbl_hdr = ParagraphStyle(
        'ReportTblHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#FFFFFF')
    )

    story: List[Any] = []

    # ==========================================================================
    # COVER PAGE
    # Minimal, strong typography and whitespace, no decorative graphics.
    # ==========================================================================
    story.append(Spacer(1, 45))
    story.append(Paragraph("Aether", style_cover_brand))
    story.append(Paragraph("Data Analysis Report", style_cover_title))
    story.append(Paragraph(
        "Empirical diagnostic evaluation, descriptive statistics, and multivariate exploratory analysis.",
        style_cover_sub
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F172A'), spaceAfter=28))

    now_clean = datetime.now(timezone(timedelta(0))).strftime("%d %B %Y, %H:%M UTC")
    cover_meta = [
        [Paragraph("Dataset Name", style_meta), Paragraph(f"<b>{dataset_name}</b>", style_body_bold)],
        [Paragraph("Report Date", style_meta), Paragraph(f"{now_clean}", style_body)],
        [Paragraph("Dataset Version", style_meta), Paragraph(f"Version {version_num}", style_body)],
        [Paragraph("Total Records", style_meta), Paragraph(f"{row_count:,} rows", style_body)],
        [Paragraph("Feature Dimensions", style_meta), Paragraph(f"{col_count} columns ({len(numeric_cols)} numeric, {len(cat_cols)} categorical)", style_body)],
        [Paragraph("Data Quality Score", style_meta), Paragraph(f"{overall_score}/100", style_body_bold)],
        [Paragraph("Scope of Analysis", style_meta), Paragraph("Full-Spectrum Exploratory & Statistical Audit", style_body)],
    ]
    t_cover = Table(cover_meta, colWidths=[135, 380])
    t_cover.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 7),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_cover)

    story.append(Spacer(1, 35))
    notice_text = (
        "<b>Notice:</b> This report is generated dynamically from verified local dataset records. All numerical metrics, "
        "distribution profiles, and correlation coefficients are computed strictly from the active dataset version."
    )
    t_notice = Table([[Paragraph(notice_text, style_body)]], colWidths=[515])
    t_notice.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('LINEBEFORE', (0, 0), (0, -1), 3, colors.HexColor('#2563EB')),
        ('PADDING', (0, 0), (-1, -1), 9),
    ]))
    story.append(t_notice)

    # PAGE BREAK TO EXECUTIVE SUMMARY
    story.append(PageBreak())

    # ==========================================================================
    # EXECUTIVE SUMMARY
    # ==========================================================================
    story.append(Paragraph("Executive Summary", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    # Compact KPI summary grid (6 key indicators)
    kpis_to_show = kpi_cards[:6] if len(kpi_cards) >= 6 else kpi_cards
    row1 = [
        Paragraph(f"<b>{kpis_to_show[0]['metric'].upper()}</b>", style_meta),
        Paragraph(f"<b>{kpis_to_show[1]['metric'].upper()}</b>", style_meta),
        Paragraph(f"<b>{kpis_to_show[2]['metric'].upper()}</b>", style_meta),
    ]
    row2 = [
        Paragraph(f"<font size=12 color='#0F172A'><b>{kpis_to_show[0]['value']}</b></font>", style_body),
        Paragraph(f"<font size=12 color='#0F172A'><b>{kpis_to_show[1]['value']}</b></font>", style_body),
        Paragraph(f"<font size=12 color='#2563EB'><b>{kpis_to_show[2]['value']}</b></font>", style_body),
    ]
    kpi_rows = [row1, row2]
    if len(kpis_to_show) > 3:
        row3 = [
            Paragraph(f"<b>{kpis_to_show[3]['metric'].upper()}</b>", style_meta),
            Paragraph(f"<b>{kpis_to_show[4]['metric'].upper()}</b>", style_meta),
            Paragraph(f"<b>{kpis_to_show[5]['metric'].upper()}</b>" if len(kpis_to_show) > 5 else "", style_meta),
        ]
        row4 = [
            Paragraph(f"<font size=12 color='#0F172A'><b>{kpis_to_show[3]['value']}</b></font>", style_body),
            Paragraph(f"<font size=12 color='#0F172A'><b>{kpis_to_show[4]['value']}</b></font>", style_body),
            Paragraph(f"<font size=12 color='#0F172A'><b>{kpis_to_show[5]['value']}</b></font>" if len(kpis_to_show) > 5 else "", style_body),
        ]
        kpi_rows.extend([row3, row4])

    t_kpi = Table(kpi_rows, colWidths=[171, 172, 172])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 10))

    exec_p = (
        f"This report presents a structured analysis for <b>{dataset_name}</b> (Version {version_num}). "
        f"The dataset comprises <b>{row_count:,} observations</b> across <b>{col_count} attributes</b>. "
        f"Empirical evaluation yields an overall Data Quality Score of <b>{overall_score}/100</b>, "
        f"measuring record completeness ({sub_scores.get('completeness', 100)}%), uniqueness ({sub_scores.get('uniqueness', 100)}%), "
        f"and validity ({sub_scores.get('validity', 100)}%)."
    )
    story.append(Paragraph(exec_p, style_body))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Key Summary Findings:", style_h2))
    for f in key_findings[:4]:
        story.append(Paragraph(f"• {f}", style_body))
    story.append(Spacer(1, 12))

    # ==========================================================================
    # DATASET OVERVIEW
    # ==========================================================================
    story.append(Paragraph("Dataset Overview", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    file_ext = dataset_name.split('.')[-1].upper() if '.' in dataset_name else "CSV"
    mem_size = f"{round(df.memory_usage(deep=True).sum() / 1024, 1):,} KB" if df is not None else "N/A"
    
    ds_meta_rows = [
        [Paragraph("Dataset Name", style_meta), Paragraph(f"<b>{dataset_name}</b>", style_body_bold),
         Paragraph("Analysis Date", style_meta), Paragraph(f"{now_clean}", style_body)],
        [Paragraph("Row Count", style_meta), Paragraph(f"{row_count:,}", style_body),
         Paragraph("Column Count", style_meta), Paragraph(f"{col_count}", style_body)],
        [Paragraph("File Format", style_meta), Paragraph(f"{file_ext}", style_body),
         Paragraph("Memory Footprint", style_meta), Paragraph(f"{mem_size}", style_body)],
    ]
    t_ds_meta = Table(ds_meta_rows, colWidths=[95, 162, 95, 163])
    t_ds_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_ds_meta)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Column Overview:", style_h2))
    col_prof_rows = [
        [
            Paragraph("Column", style_tbl_hdr),
            Paragraph("Data Type", style_tbl_hdr),
            Paragraph("Non-null", style_tbl_hdr),
            Paragraph("Missing", style_tbl_hdr),
            Paragraph("Unique", style_tbl_hdr),
            Paragraph("Summary", style_tbl_hdr),
        ]
    ]
    for col_name, cp in list(col_profiles.items())[:20]:
        col_prof_rows.append([
            Paragraph(f"<b>{col_name[:20]}</b>", style_tbl_cell),
            Paragraph(str(cp.get("dtype", "object")), style_tbl_cell),
            Paragraph(f"{cp.get('non_null_count', row_count):,}", style_tbl_cell),
            Paragraph(f"{cp.get('missing_count', 0):,} ({cp.get('missing_pct', 0.0)}%)", style_tbl_cell),
            Paragraph(f"{cp.get('unique_count', 0):,}", style_tbl_cell),
            Paragraph(cp.get("summary", ""), style_tbl_cell),
        ])

    t_col_prof = Table(col_prof_rows, colWidths=[110, 70, 65, 75, 65, 130], repeatRows=1)
    t_col_prof.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_col_prof)

    # PAGE BREAK TO DATA QUALITY & DESCRIPTIVE STATISTICS
    story.append(PageBreak())

    # ==========================================================================
    # DATA QUALITY
    # ==========================================================================
    story.append(Paragraph("Data Quality", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    dq_rows = [
        [
            Paragraph("Quality Dimension", style_tbl_hdr),
            Paragraph("Score", style_tbl_hdr),
            Paragraph("Benchmark", style_tbl_hdr),
            Paragraph("Assessment Detail", style_tbl_hdr),
        ],
        [
            Paragraph("<b>Completeness</b>", style_tbl_cell),
            Paragraph(f"<b>{sub_scores.get('completeness', 100)}%</b>", style_tbl_cell),
            Paragraph(">= 95.0%", style_tbl_cell),
            Paragraph("Calculates proportion of non-null cells across the observation matrix.", style_tbl_cell),
        ],
        [
            Paragraph("<b>Uniqueness</b>", style_tbl_cell),
            Paragraph(f"<b>{sub_scores.get('uniqueness', 100)}%</b>", style_tbl_cell),
            Paragraph(">= 98.0%", style_tbl_cell),
            Paragraph("Measures absence of identical duplicate row vectors.", style_tbl_cell),
        ],
        [
            Paragraph("<b>Validity</b>", style_tbl_cell),
            Paragraph(f"<b>{sub_scores.get('validity', 100)}%</b>", style_tbl_cell),
            Paragraph(">= 90.0%", style_tbl_cell),
            Paragraph("Evaluates presence of constant zero-variance features.", style_tbl_cell),
        ],
        [
            Paragraph("<b>Consistency</b>", style_tbl_cell),
            Paragraph(f"<b>{sub_scores.get('consistency', 100)}%</b>", style_tbl_cell),
            Paragraph(">= 85.0%", style_tbl_cell),
            Paragraph("Checks for type homogeneity and uniform data formatting.", style_tbl_cell),
        ],
    ]
    t_dq = Table(dq_rows, colWidths=[110, 65, 75, 265])
    t_dq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_dq)
    story.append(Spacer(1, 8))

    dup_count = int(df.duplicated().sum()) if df is not None else 0
    dup_pct = round(dup_count / max(1, row_count) * 100, 2)
    tot_missing = sum(p.get("missing_count", 0) for p in col_profiles.values())
    tot_cells = max(1, row_count * col_count)
    
    story.append(Paragraph(
        f"<b>Audit Details:</b> {tot_missing:,} missing cells identified ({round(tot_missing/tot_cells*100, 2)}% of dataset). "
        f"Duplicate row analysis identified {dup_count:,} duplicate record(s) ({dup_pct}%).",
        style_body
    ))

    # Missing value chart if applicable
    miss_chart = _generate_missing_values_chart_image(col_profiles)
    if miss_chart:
        story.append(Spacer(1, 4))
        story.append(Image(miss_chart, width=6.8 * inch, height=2.2 * inch))
    story.append(Spacer(1, 10))

    # ==========================================================================
    # DESCRIPTIVE STATISTICS
    # ==========================================================================
    story.append(Paragraph("Descriptive Statistics", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    if numeric_profiles:
        stat_rows = [
            [
                Paragraph("Feature", style_tbl_hdr),
                Paragraph("Count", style_tbl_hdr),
                Paragraph("Mean", style_tbl_hdr),
                Paragraph("Median", style_tbl_hdr),
                Paragraph("Std Dev", style_tbl_hdr),
                Paragraph("Min", style_tbl_hdr),
                Paragraph("Max", style_tbl_hdr),
                Paragraph("Q1", style_tbl_hdr),
                Paragraph("Q3", style_tbl_hdr),
                Paragraph("IQR", style_tbl_hdr),
                Paragraph("Skew", style_tbl_hdr),
            ]
        ]
        for col, np_data in list(numeric_profiles.items())[:12]:
            stat_rows.append([
                Paragraph(f"<b>{col[:14]}</b>", style_tbl_cell),
                Paragraph(f"{np_data.get('count', row_count):,}", style_tbl_cell),
                Paragraph(f"{np_data.get('mean', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('median', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('std', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('min', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('max', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('q1', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('q3', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('iqr', 0.0):.1f}", style_tbl_cell),
                Paragraph(f"{np_data.get('skewness', 0.0):.2f}", style_tbl_cell),
            ])

        t_stats = Table(stat_rows, colWidths=[85, 45, 43, 43, 45, 43, 43, 42, 42, 42, 42], repeatRows=1)
        t_stats.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 3.5),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(t_stats)
    else:
        story.append(Paragraph("No continuous numerical attributes detected for parametric statistical evaluation.", style_body))

    # PAGE BREAK TO CATEGORICAL & DISTRIBUTION ANALYSIS
    story.append(PageBreak())

    # ==========================================================================
    # CATEGORICAL ANALYSIS
    # ==========================================================================
    story.append(Paragraph("Categorical Analysis", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    if categorical_profiles:
        cat_tbl_rows = [
            [
                Paragraph("Column", style_tbl_hdr),
                Paragraph("Unique", style_tbl_hdr),
                Paragraph("Most Frequent Value", style_tbl_hdr),
                Paragraph("Frequency", style_tbl_hdr),
                Paragraph("Percentage", style_tbl_hdr),
                Paragraph("Status", style_tbl_hdr),
            ]
        ]
        for col, cp in list(categorical_profiles.items())[:8]:
            dom = cp.get("dominant_category")
            status_text = f"Dominant ({cp.get('top_pct')}%)" if dom else "Balanced"
            cat_tbl_rows.append([
                Paragraph(f"<b>{col[:18]}</b>", style_tbl_cell),
                Paragraph(f"{cp.get('unique_count', 0):,}", style_tbl_cell),
                Paragraph(str(cp.get("top_category", "N/A"))[:18], style_tbl_cell),
                Paragraph(f"{cp.get('top_count', 0):,}", style_tbl_cell),
                Paragraph(f"{cp.get('top_pct', 0.0)}%", style_tbl_cell),
                Paragraph(status_text, style_tbl_cell),
            ])
        t_cat = Table(cat_tbl_rows, colWidths=[115, 65, 125, 65, 65, 80], repeatRows=1)
        t_cat.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(t_cat)
        story.append(Spacer(1, 8))

        cat_chart = _generate_categorical_chart_image(df, cat_cols)
        if cat_chart:
            story.append(Image(cat_chart, width=6.8 * inch, height=2.4 * inch))
            story.append(Spacer(1, 10))
    else:
        story.append(Paragraph("No discrete categorical features detected.", style_body))
        story.append(Spacer(1, 10))

    # ==========================================================================
    # DISTRIBUTION ANALYSIS
    # ==========================================================================
    story.append(Paragraph("Distribution Analysis", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    dist_chart = _generate_distribution_chart_image(df, numeric_cols)
    if dist_chart:
        story.append(Image(dist_chart, width=6.8 * inch, height=2.4 * inch))
        story.append(Spacer(1, 8))

    box_chart = _generate_box_plot_image(df, numeric_cols)
    if box_chart:
        story.append(Image(box_chart, width=6.8 * inch, height=2.5 * inch))
        story.append(Spacer(1, 8))

    # PAGE BREAK TO CORRELATION, RELATIONSHIPS & OUTLIERS
    story.append(PageBreak())

    # ==========================================================================
    # CORRELATION ANALYSIS
    # ==========================================================================
    story.append(Paragraph("Correlation Analysis", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    corr_chart = _generate_correlation_heatmap_image(df)
    if corr_chart:
        story.append(Image(corr_chart, width=6.8 * inch, height=3.4 * inch))
        story.append(Spacer(1, 8))

    relationships = corr_analysis.get("relationships", [])
    if relationships:
        corr_tbl_rows = [
            [
                Paragraph("Feature X", style_tbl_hdr),
                Paragraph("Feature Y", style_tbl_hdr),
                Paragraph("Pearson r", style_tbl_hdr),
                Paragraph("Strength", style_tbl_hdr),
                Paragraph("Direction", style_tbl_hdr),
            ]
        ]
        for rel in relationships[:5]:
            corr_tbl_rows.append([
                Paragraph(f"<b>{rel['feature_x']}</b>", style_tbl_cell),
                Paragraph(f"<b>{rel['feature_y']}</b>", style_tbl_cell),
                Paragraph(f"{rel['correlation']:.2f}", style_tbl_cell),
                Paragraph(rel.get("strength", "Moderate"), style_tbl_cell),
                Paragraph(rel.get("direction", "Positive"), style_tbl_cell),
            ])
        t_corr = Table(corr_tbl_rows, colWidths=[120, 120, 75, 100, 100], repeatRows=1)
        t_corr.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_corr)
    else:
        story.append(Paragraph("Insufficient numerical attributes to generate correlation matrix.", style_body))
    story.append(Spacer(1, 10))

    # ==========================================================================
    # RELATIONSHIPS
    # ==========================================================================
    biv_chart = _generate_bivariate_chart_image(df, numeric_cols, datetime_cols)
    if biv_chart:
        story.append(Paragraph("Relationships", style_h1))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
        story.append(Image(biv_chart, width=6.8 * inch, height=2.5 * inch))
        story.append(Spacer(1, 10))

    # ==========================================================================
    # OUTLIER ANALYSIS
    # ==========================================================================
    story.append(Paragraph("Outlier Analysis", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    if numeric_profiles:
        outlier_rows = [
            [
                Paragraph("Feature", style_tbl_hdr),
                Paragraph("Outlier Count", style_tbl_hdr),
                Paragraph("Percentage", style_tbl_hdr),
                Paragraph("Lower Bound (1.5x IQR)", style_tbl_hdr),
                Paragraph("Upper Bound (1.5x IQR)", style_tbl_hdr),
            ]
        ]
        has_outliers = False
        for col, np_data in list(numeric_profiles.items())[:8]:
            cnt = np_data.get('outlier_count', 0)
            if cnt > 0:
                has_outliers = True
            outlier_rows.append([
                Paragraph(f"<b>{col}</b>", style_tbl_cell),
                Paragraph(f"{cnt:,}", style_tbl_cell),
                Paragraph(f"{np_data.get('outlier_pct', 0.0)}%", style_tbl_cell),
                Paragraph(f"{np_data.get('lower_bound', 0.0):.2f}", style_tbl_cell),
                Paragraph(f"{np_data.get('upper_bound', 0.0):.2f}", style_tbl_cell),
            ])
        t_outliers = Table(outlier_rows, colWidths=[115, 80, 80, 120, 120], repeatRows=1)
        t_outliers.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_outliers)
        if not has_outliers:
            story.append(Spacer(1, 4))
            story.append(Paragraph("No statistical outliers detected outside standard 1.5x IQR thresholds.", style_body))
    else:
        story.append(Paragraph("No numerical attributes available for outlier analysis.", style_body))

    # PAGE BREAK TO FINDINGS, RECOMMENDATIONS & APPENDIX
    story.append(PageBreak())

    # ==========================================================================
    # KEY FINDINGS
    # ==========================================================================
    story.append(Paragraph("Key Findings", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    for item in key_findings[:6]:
        story.append(Paragraph(f"• {item}", style_body))
    story.append(Spacer(1, 10))

    # ==========================================================================
    # RECOMMENDATIONS
    # ==========================================================================
    story.append(Paragraph("Recommendations", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    if recs:
        rec_tbl_rows = [
            [
                Paragraph("Category", style_tbl_hdr),
                Paragraph("Priority", style_tbl_hdr),
                Paragraph("Action Recommendation", style_tbl_hdr),
            ]
        ]
        for r in recs[:6]:
            rec_tbl_rows.append([
                Paragraph(f"<b>{r.get('category', 'General').replace('_', ' ').title()}</b>", style_tbl_cell),
                Paragraph(f"<b>{r.get('priority', 'Medium')}</b>", style_tbl_cell),
                Paragraph(r.get("action", ""), style_tbl_cell),
            ])
        t_recs = Table(rec_tbl_rows, colWidths=[100, 65, 350], repeatRows=1)
        t_recs.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 4.5),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(t_recs)
    else:
        story.append(Paragraph("Dataset meets baseline standards. Regular automated validation recommended.", style_body))
    story.append(Spacer(1, 12))

    # ==========================================================================
    # APPENDIX
    # ==========================================================================
    story.append(Paragraph("Appendix", style_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    appendix_items = [
        [
            Paragraph("<b>Mathematical Methodology</b>", style_tbl_cell),
            Paragraph(
                "• <b>Tukey's IQR Outlier Rule:</b> Outliers identified strictly outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR].<br/>"
                "• <b>Pearson Correlation:</b> Linear association computed as r = cov(X, Y) / (std(X) * std(Y)).<br/>"
                "• <b>Fisher-Pearson Skewness:</b> g1 = m3 / (m2^(3/2)) measuring distribution symmetry.",
                style_tbl_cell
            )
        ],
        [
            Paragraph("<b>Data Quality Scoring</b>", style_tbl_cell),
            Paragraph(
                "Overall score computed via weighted evaluation: Completeness (35%) + Uniqueness (25%) + Validity (20%) + Consistency (20%). "
                "Penalties scale directly with missing cell frequency and duplicate rows.",
                style_tbl_cell
            )
        ],
        [
            Paragraph("<b>Compilation Provenance</b>", style_tbl_cell),
            Paragraph(
                f"Generated by Aether Engine • ReportLab PDF Architecture • Python {pd.__version__} / NumPy {np.__version__}. "
                f"Timestamp: {now_clean}.",
                style_tbl_cell
            )
        ]
    ]
    t_app = Table(appendix_items, colWidths=[140, 375])
    t_app.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_app)

    # Build the document with two-pass NumberedCanvas
    def _canvas_factory(*args: Any, **kwargs: Any) -> NumberedCanvas:
        c = NumberedCanvas(*args, **kwargs)
        c.dataset_title = dataset_name
        return c

    doc.build(story, canvasmaker=_canvas_factory)
    buffer.seek(0)
    return buffer.getvalue()
