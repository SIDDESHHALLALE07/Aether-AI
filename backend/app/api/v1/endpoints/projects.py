from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ActivityLog
from app.schemas.common import ApiResponse
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ActivityLogResponse

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[ProjectResponse]])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    return {
        "success": True,
        "data": projects,
        "error": None
    }

@router.post("/", response_model=ApiResponse[ProjectResponse])
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_project = Project(
        user_id=current_user.id,
        name=project_in.name,
        description=project_in.description
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Log activity
    log = ActivityLog(
        project_id=new_project.id,
        user_id=current_user.id,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    logs = db.query(ActivityLog).filter(ActivityLog.project_id == project_id).order_by(ActivityLog.created_at.desc()).all()
    return {
        "success": True,
        "data": logs,
        "error": None
    }
