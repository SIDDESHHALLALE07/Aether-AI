from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.project import Project, ActivityLog
from app.schemas.common import ApiResponse
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ActivityLogResponse

router = APIRouter()

@router.get("", response_model=ApiResponse[List[ProjectResponse]], include_in_schema=False)
@router.get("/", response_model=ApiResponse[List[ProjectResponse]])
def list_projects(
    db: Session = Depends(get_db)
):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return {
        "success": True,
        "data": projects,
        "error": None
    }

from sqlalchemy import func

@router.post("", response_model=ApiResponse[ProjectResponse], include_in_schema=False)
@router.post("/", response_model=ApiResponse[ProjectResponse])
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db)
):
    clean_name = project_in.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name cannot be empty."
        )

    # Check for duplicate project name
    existing = db.query(Project).filter(func.lower(Project.name) == clean_name.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A project named '{clean_name}' already exists."
        )

    new_project = Project(
        user_id="default-user",
        name=clean_name,
        description=project_in.description
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Log activity
    log = ActivityLog(
        project_id=new_project.id,
        user_id="default-user",
        action_type="PROJECT_CREATED",
        details={"project_name": new_project.name}
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "data": new_project,
        "error": None
    }

@router.get("/{project_id}", response_model=ApiResponse[ProjectResponse])
def get_project(
    project_id: str,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "data": project,
        "error": None
    }

@router.get("/{project_id}/activity", response_model=ApiResponse[List[ActivityLogResponse]])
def get_project_activity(
    project_id: str,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    logs = db.query(ActivityLog).filter(ActivityLog.project_id == project_id).order_by(ActivityLog.created_at.desc()).all()
    return {
        "success": True,
        "data": logs,
        "error": None
    }

@router.put("/{project_id}", response_model=ApiResponse[ProjectResponse])
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description

    db.commit()
    db.refresh(project)
    return {
        "success": True,
        "data": project,
        "error": None
    }

@router.delete("/{project_id}", response_model=ApiResponse[dict])
def delete_project(
    project_id: str,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {
        "success": True,
        "data": {"message": "Project deleted successfully", "id": project_id},
        "error": None
    }

