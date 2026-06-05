import asyncio
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
import asyncio
from async_timeout import timeout
from app.services.ocr_service import process_bill_image

logger = logging.getLogger("sanjevani.router")
router = APIRouter()

ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'application/pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# TODO: add request tracing for better debugging
@router.post("/extract")
async def extract_bill_data(file: UploadFile = File(...)):
    """
    Extract structured billing data from an uploaded bill image or PDF.

    Returns:
    - success: bool
    - data: extracted items, total, confidence, validation
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Invalid file type. Only images and PDFs supported.")

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(400, "Empty file provided")

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(400, "File too large. Maximum size is 10MB.")

        # Run OCR in a thread pool to avoid blocking the async event loop
        # Enforce a strict 45-second timeout (Express backend gives up at 60s)
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(process_bill_image, contents, file.filename),
                timeout=45.0
            )
        except asyncio.TimeoutError:
            logger.error("OCR execution timed out after 45 seconds")
            raise HTTPException(504, "OCR processing timed out. The image may be too complex.")

        # Check if OCR returned an error state
        if "error" in result:
            return {
                "success": False,
                "error": result["error"],
                "data": result,
            }

        return {"success": True, "data": result}

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"OCR endpoint failed: {error_msg}", exc_info=True)
        if "POPPLER_MISSING" in error_msg:
            raise HTTPException(
                400,
                "PDF processing is not supported in this environment "
                "(Poppler missing). Please upload an image or install Poppler.",
            )
        raise HTTPException(500, f"OCR processing failed: {error_msg}")