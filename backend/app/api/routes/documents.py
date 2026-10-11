"""Document processing API routes."""
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
from app.schemas.document import DocumentExtractionResponse
from app.services.pdf_service import (
    extract_pdf_data,
    PDFProcessingError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/extract",
    response_model=DocumentExtractionResponse,
    summary="Extract selectable text from an uploaded PDF document",
    description="Accepts a multipart PDF file, validates format and size, extracts selectable text per page, and identifies pages that require OCR."
)
async def extract_document(file: UploadFile = File(...)):
    """
    Handle PDF upload and text extraction.
    Ensures safe error handling without leaking filesystem or stack traces.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was uploaded or filename is missing."
        )

    try:
        # Read uploaded bytes and guarantee cleanup
        pdf_bytes = await file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read the uploaded file."
        )
    finally:
        # Ensure underlying file descriptor is closed
        await file.close()

    try:
        result = extract_pdf_data(pdf_bytes=pdf_bytes, filename=file.filename)
        return result
    except PDFProcessingError as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message}
        )
    except Exception as exc:
        logger.error("Unexpected error during PDF processing: %s", str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal error occurred while processing the document. Please try again."}
        )
