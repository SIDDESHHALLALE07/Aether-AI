import os
import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.project import Project
from app.models.dataset import Dataset, DatasetVersion
from app.models.profile import QualityScore, DataProfile
from app.models.analytics import PatternResult, Insight
from app.models.cleaning import CleaningOperation
from app.models.report import Report
from app.schemas.common import ApiResponse
from app.schemas.report import ReportResponse
from app.data_processing.loader import load_dataframe
from app.reports.pdf_generator import generate_executive_pdf_report
from app.reports.exporter import export_dataframe_safe

from pydantic import BaseModel

logger = logging.getLogger(__name__)

class PdfGeneratePayload(BaseModel):
    chart_config: Optional[Dict[str, Any]] = None
    report_sections: Optional[List[str]] = None
    detail_level: Optional[str] = None

router = APIRouter()


def sanitize_filename(name: str) -> str:
    """Sanitizes dataset name for filesystem and header safety."""
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    clean = re.sub(r'_+', '_', clean).strip('_')
    return clean or "Dataset"


@router.post("/{dataset_id}/generate_pdf", response_model=ApiResponse[ReportResponse])
@router.post("/{dataset_id}/generate", response_model=ApiResponse[ReportResponse])
def generate_report_pdf(
    dataset_id: str,
    payload: Optional[PdfGeneratePayload] = None,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    try:
        quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
        profile = db.query(DataProfile).filter(DataProfile.dataset_version_id == version.id).first()
        patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
        insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()
        cleaning_ops = db.query(CleaningOperation).filter(CleaningOperation.dataset_id == dataset_id).all()

        qual_dict = {
            "overall_score": quality.overall_score if quality else None,
            "completeness_score": quality.completeness_score if quality else None,
            "uniqueness_score": quality.uniqueness_score if quality else None,
            "detected_issues": quality.detected_issues if quality else {}
        }
        summary_stats: dict[str, Any] = dict(profile.numeric_summary) if (profile and profile.numeric_summary) else {}
        pat_list = [
            {"pattern_type": p.pattern_type, "explanation": p.explanation, "evidence": p.evidence, "statistical_metrics": p.statistical_metrics}
            for p in patterns
        ]
        ins_list = [
            {"insight_type": i.insight_type, "title": i.title, "description": i.description, "ai_interpretation": i.ai_interpretation, "confidence_score": i.confidence_score}
            for i in insights
        ]
        clean_list = [
            {"operation_type": c.operation_type, "parameters": c.parameters, "affected_rows_count": c.affected_rows_count}
            for c in cleaning_ops
        ]

        project = db.query(Project).filter(Project.id == dataset.project_id).first()
        project_name = project.name if project else "Enterprise Workspace"

        df = None
        if os.path.exists(version.storage_path):
            df = load_dataframe(version.storage_path, dataset.file_type)

        pdf_bytes = generate_executive_pdf_report(
            dataset_name=dataset.original_filename,
            row_count=version.row_count,
            col_count=version.column_count,
            quality_score=qual_dict,
            summary_stats=summary_stats,
            patterns=pat_list,
            insights=ins_list,
            df=df,
            cleaning_ops=clean_list,
            chart_config=payload.chart_config if payload else None,
            project_name=project_name,
            version_num=version.version_number
        )

        clean_base = sanitize_filename(dataset.original_filename.rsplit('.', 1)[0])
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"Aether_Data_Analysis_Report_{clean_base}_{date_str}.pdf"

        os.makedirs(settings.reports_dir, exist_ok=True)
        pdf_path = os.path.join(settings.reports_dir, filename)
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        report = Report(
            user_id="default-user",
            dataset_version_id=version.id,
            title=f"Data Analysis Report — {dataset.original_filename}",
            file_format="pdf",
            storage_path=pdf_path,
            summary_data={
                "dataset_name": dataset.original_filename,
                "dataset_id": dataset.id,
                "version_number": version.version_number,
                "overall_score": qual_dict["overall_score"],
                "filename": filename
            }
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        return {
            "success": True,
            "data": report,
            "error": None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate report PDF for dataset {dataset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to generate the report. Please try again.")


@router.get("/{dataset_id}/history", response_model=ApiResponse[List[ReportResponse]])
def get_report_history(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    versions = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).all()
    version_ids = [v.id for v in versions]

    reports = db.query(Report).filter(
        Report.dataset_version_id.in_(version_ids)
    ).order_by(Report.created_at.desc()).all()

    # Filter and prune stale history entries whose physical files no longer exist
    valid_reports: List[Report] = []
    stale_reports: List[Report] = []

    for r in reports:
        if r.storage_path and os.path.exists(r.storage_path):
            valid_reports.append(r)
        else:
            stale_reports.append(r)

    if stale_reports:
        for sr in stale_reports:
            db.delete(sr)
        db.commit()

    return {
        "success": True,
        "data": valid_reports,
        "error": None
    }


@router.get("/{dataset_id}/download_pdf")
@router.get("/{dataset_id}/download")
def download_report_pdf(
    dataset_id: str,
    report_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    clean_base = sanitize_filename(dataset.original_filename.rsplit('.', 1)[0])
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"Aether_Data_Analysis_Report_{clean_base}_{date_str}.pdf"

    pdf_bytes: Optional[bytes] = None

    # Check if a specific report was requested
    if report_id:
        target_report = db.query(Report).filter(Report.id == report_id).first()
        if target_report and target_report.storage_path and os.path.exists(target_report.storage_path):
            with open(target_report.storage_path, "rb") as f:
                pdf_bytes = f.read()

    if pdf_bytes is None:
        # Check if default file exists
        default_path = os.path.join(settings.reports_dir, filename)
        if os.path.exists(default_path):
            with open(default_path, "rb") as f:
                pdf_bytes = f.read()
        else:
            # Check latest report in DB
            latest_report = db.query(Report).filter(
                Report.dataset_version_id == version.id
            ).order_by(Report.created_at.desc()).first()

            if latest_report and latest_report.storage_path and os.path.exists(latest_report.storage_path):
                with open(latest_report.storage_path, "rb") as f:
                    pdf_bytes = f.read()
            else:
                # Generate on the fly
                project = db.query(Project).filter(Project.id == dataset.project_id).first()
                project_name = project.name if project else "Enterprise Workspace"

                quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
                profile = db.query(DataProfile).filter(DataProfile.dataset_version_id == version.id).first()
                patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
                insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()
                cleaning_ops = db.query(CleaningOperation).filter(CleaningOperation.dataset_id == dataset_id).all()

                qual_dict = {
                    "overall_score": quality.overall_score if quality else None,
                    "completeness_score": quality.completeness_score if quality else None,
                    "uniqueness_score": quality.uniqueness_score if quality else None,
                    "detected_issues": quality.detected_issues if quality else {}
                }
                summary_stats: dict[str, Any] = dict(profile.numeric_summary) if (profile and profile.numeric_summary) else {}
                pat_list = [{"pattern_type": p.pattern_type, "explanation": p.explanation} for p in patterns]
                ins_list = [{"insight_type": i.insight_type, "title": i.title, "description": i.description, "ai_interpretation": i.ai_interpretation} for i in insights]
                clean_list = [{"operation_type": c.operation_type, "parameters": c.parameters, "affected_rows_count": c.affected_rows_count} for c in cleaning_ops]

                df = None
                if os.path.exists(version.storage_path):
                    df = load_dataframe(version.storage_path, dataset.file_type)

                pdf_bytes = generate_executive_pdf_report(
                    dataset_name=dataset.original_filename,
                    row_count=version.row_count,
                    col_count=version.column_count,
                    quality_score=qual_dict,
                    summary_stats=summary_stats,
                    patterns=pat_list,
                    insights=ins_list,
                    df=df,
                    cleaning_ops=clean_list,
                    project_name=project_name,
                    version_num=version.version_number
                )
                os.makedirs(settings.reports_dir, exist_ok=True)
                with open(default_path, "wb") as f:
                    f.write(pdf_bytes)

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf"
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/{dataset_id}/export")
def export_dataset_file(
    dataset_id: str,
    format: str = "csv",
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    if not os.path.exists(version.storage_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    df = load_dataframe(version.storage_path, dataset.file_type)
    content, media_type, ext = export_dataframe_safe(df, file_format=format)

    clean_base = sanitize_filename(dataset.original_filename.rsplit('.', 1)[0])
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"Aether_Export_{clean_base}_{date_str}{ext}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=content, media_type=media_type, headers=headers)
