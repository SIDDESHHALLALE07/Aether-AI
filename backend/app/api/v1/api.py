from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.api.v1.endpoints import (
    auth,
    projects,
    datasets,
    cleaning,
    analytics,
    visualizations,
    patterns,
    copilot,
    insights,
    reports
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(cleaning.router, prefix="/cleaning", tags=["Data Cleaning"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Data Analytics"])
api_router.include_router(visualizations.router, prefix="/visualizations", tags=["Visualizations"])
api_router.include_router(patterns.router, prefix="/patterns", tags=["Pattern Discovery"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["AI Copilot"])
api_router.include_router(insights.router, prefix="/insights", tags=["AI Insights"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Export"])

# Direct /settings endpoint
api_router.add_api_route("/settings", auth.get_user_settings, methods=["GET"], response_model=ApiResponse[auth.UserSettings], tags=["Settings"])
api_router.add_api_route("/settings", auth.update_user_settings, methods=["PUT"], response_model=ApiResponse[auth.UserSettings], tags=["Settings"])

@api_router.get("/status", tags=["System"])
def get_api_status():
    return {"success": True, "data": {"message": "Aether Copilot AI API v1 is operational"}, "error": None}
