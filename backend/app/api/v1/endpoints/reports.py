from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, DatasetVersion
from app.models.profile import QualityScore
from app.models.analytics import PatternResult, Insight
from app.models.report import Report
from app.schemas.common import ApiResponse
from app.schemas.report import ReportResponse
from app.data_processing.loader import load_dataframe
from app.reports.generator import generate_executive_report_html
from app.reports.exporter import export_dataframe_safe

router = APIRouter()

@router.post("/{dataset_id}/generate", response_model=ApiResponse[ReportResponse])
def generate_report(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
    patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
    insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()

    qual_dict = {"overall_score": quality.overall_score} if quality else {"overall_score": 95.0}
    pat_list = [{"pattern_type": p.pattern_type, "explanation": p.explanation} for p in patterns]
    ins_list = [{"insight_type": i.insight_type, "title": i.title, "description": i.description, "ai_interpretation": i.ai_interpretation} for i in insights]

    html_content = generate_executive_report_html(
        dataset_name=dataset.original_filename,
        row_count=version.row_count,
        col_count=version.column_count,
        quality_score=qual_dict,
        patterns=pat_list,
        insights=ins_list
    )

    report = Report(
        user_id=current_user.id,
        dataset_version_id=version.id,
        title=f"Executive Intelligence Report - {dataset.original_filename}",
        file_format="html",
        storage_path="./reports/executive.html",
        summary_data={"html": html_content, "executive_summary": "Automated AI Executive Intelligence Report"}
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "success": True,
        "data": report,
        "error": None
    }

@router.get("/{dataset_id}/download")
def download_report_html(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()

    report = db.query(Report).filter(Report.dataset_version_id == version.id).order_by(Report.created_at.desc()).first()
    if not report or not report.summary_data or "html" not in report.summary_data:
        # Generate on the fly
        quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
        patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
        insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()
        
        qual_dict = {"overall_score": quality.overall_score} if quality else {"overall_score": 95.0}
        pat_list = [{"pattern_type": p.pattern_type, "explanation": p.explanation} for p in patterns]
        ins_list = [{"insight_type": i.insight_type, "title": i.title, "description": i.description, "ai_interpretation": i.ai_interpretation} for i in insights]

        html_content = generate_executive_report_html(dataset.original_filename, version.row_count, version.column_count, qual_dict, pat_list, ins_list)
    else:
        html_content = report.summary_data.get("html", "")

    return HTMLResponse(content=html_content, status_code=200)

@router.get("/{dataset_id}/export")
def export_dataset_file(
    dataset_id: str,
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()

    df = load_dataframe(version.storage_path, dataset.file_type)
    content, media_type, ext = export_dataframe_safe(df, file_format=format)

    filename = f"{dataset.original_filename.rsplit('.', 1)[0]}_v{version.version_number}_export{ext}"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=content, media_type=media_type, headers=headers)
