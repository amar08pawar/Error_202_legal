from app.api.routes.documents import router as documents_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.history import router as history_router

__all__ = ["documents_router", "analysis_router", "history_router"]
