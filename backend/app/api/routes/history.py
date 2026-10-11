"""Document history and persistence API routes."""
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status

from app.schemas.analysis import DocumentHistoryItem
from app.services.storage_service import (
    delete_history_document,
    get_history_document,
    list_history_documents,
)

router = APIRouter(prefix="/documents", tags=["History"])


@router.get(
    "/history",
    response_model=List[DocumentHistoryItem],
    summary="List saved document analysis history",
    description="Retrieves previously processed legal document analyses from local persistent SQLite storage."
)
async def get_history(limit: int = 50) -> List[DocumentHistoryItem]:
    """Retrieve history list of saved document analyses."""
    return list_history_documents(limit=limit)


@router.get(
    "/history/{document_id}",
    summary="Get saved document analysis by ID",
    description="Returns the full analysis and page extraction payload for reopening and inspecting a previously processed document."
)
async def get_saved_document(document_id: str) -> Dict[str, Any]:
    """Reopen a saved document analysis from persistent storage."""
    res = get_history_document(document_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' was not found in local history."
        )
    analysis, extraction = res
    return {
        "analysis": analysis.model_dump(),
        "extraction": extraction.model_dump() if extraction else None
    }


@router.delete(
    "/history/{document_id}",
    summary="Delete saved document from history",
    description="Safely removes a document analysis record from local persistent SQLite storage."
)
async def delete_saved_document(document_id: str) -> Dict[str, Any]:
    """Delete a document analysis record from storage."""
    success = delete_history_document(document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' was not found in local history."
        )
    return {"success": True, "message": f"Document '{document_id}' successfully deleted from history."}
