from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.api.v1.api import api_router

def ensure_parser_dependencies():
    import sys
    import subprocess
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    # Check and ensure openpyxl
    try:
        import openpyxl  # type: ignore  # noqa: F401
    except ImportError:
        logger.warning("openpyxl is not installed. Attempting automatic installation...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "openpyxl>=3.1.2"], check=True)
            logger.info("Successfully installed openpyxl.")
        except Exception as e:
            logger.error(f"Failed to auto-install openpyxl: {e}")

    # Check and ensure xlrd
    try:
        import xlrd  # type: ignore  # noqa: F401
    except ImportError:
        logger.warning("xlrd is not installed. Attempting automatic installation...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "xlrd>=2.0.2"], check=True)
            logger.info("Successfully installed xlrd.")
        except Exception as e:
            logger.error(f"Failed to auto-install xlrd: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure critical parser dependencies are installed
    ensure_parser_dependencies()
    # Initialize database tables on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Spatial AI Data Analytics Platform Backend API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS Middleware
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Global Exception Handlers for Standard JSON API Response Wrapper
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(exc.errors())
            }
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging, traceback
    logging.getLogger("uvicorn.error").error(f"Unhandled Exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request."
            }
        }
    )

# Root & Health Check Routes
@app.get("/", tags=["Health"])
def root():
    return {
        "success": True,
        "data": {
            "name": settings.PROJECT_NAME,
            "tagline": "From Raw Data to Intelligent Insights",
            "docs": "/docs",
            "health": "/health"
        },
        "error": None
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT
        },
        "error": None
    }

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.PORT, reload=True)
