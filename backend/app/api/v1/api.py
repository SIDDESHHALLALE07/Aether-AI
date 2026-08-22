from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/status")
def get_api_status():
    return {"success": True, "data": {"message": "Aether Copilot AI API v1 is operational"}, "error": None}
