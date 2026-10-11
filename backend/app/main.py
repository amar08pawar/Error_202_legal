"""FastAPI Main Application for NayaSetu."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.schemas.document import HealthResponse
from app.api.routes.documents import router as documents_router

from app.services.ocr_service import is_tesseract_available

app = FastAPI(
    title="NayaSetu API",
    description="Backend API for NayaSetu Indian court-document intelligence platform (Phase 2: OCR & Intelligence Foundation).",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS explicitly
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Returns service status without leaking configuration or secrets."
)
async def health_check() -> HealthResponse:
    """Return application health status including OCR engine availability."""
    ocr_available, _ = is_tesseract_available()
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        ocr_available=ocr_available
    )


from app.api.routes import documents_router, analysis_router

# Register API routers
app.include_router(documents_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
