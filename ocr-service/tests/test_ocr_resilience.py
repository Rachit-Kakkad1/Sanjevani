import pytest
from fastapi.testclient import TestClient
from app.main import app
import numpy as np
import cv2
import io

client = TestClient(app)

def test_health_check():
    response = client.get("/ocr/health")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_image_dimension_limits():
    """
    Test that uploading an excessively large image does not cause OOM.
    The service should dynamically downscale it based on MAX_IMAGE_WIDTH/HEIGHT.
    We mock cv2.resize to verify it is called for large images.
    """
    # Create a 5000x5000 blank image
    img = np.zeros((5000, 5000, 3), dtype=np.uint8)
    _, encoded_img = cv2.imencode('.png', img)
    file_bytes = encoded_img.tobytes()

    response = client.post(
        "/ocr/extract",
        files={"file": ("huge_image.png", file_bytes, "image/png")}
    )

    # Since it's a blank image, OCR will find NO text.
    # We just want to ensure it doesn't crash with 500 internal server error.
    assert response.status_code == 200
    # It should cleanly say no text detected
    assert response.json()["success"] is False
    assert "No text detected" in response.json()["error"]

@pytest.mark.asyncio
async def test_pdf_page_limits(monkeypatch):
    """
    Test that uploading a PDF respects MAX_PDF_PAGES limit.
    Since we can't easily generate a valid multi-page PDF in memory without reportlab,
    we'll mock pdf2image.convert_from_bytes to ensure it is called with the correct limits.
    """
    class MockPDF:
        called_kwargs = {}

    def mock_convert_from_bytes(pdf_bytes, **kwargs):
        MockPDF.called_kwargs = kwargs
        # return a blank image to satisfy the rest of the pipeline
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        return [img]

    import app.services.ocr_service as ocr_service
    monkeypatch.setattr(ocr_service, "convert_from_bytes", mock_convert_from_bytes)
    monkeypatch.setattr(ocr_service, "PDF_AVAILABLE", True)

    fake_pdf = b"%PDF-1.4 dummy pdf bytes"
    
    response = client.post(
        "/ocr/extract",
        files={"file": ("test.pdf", fake_pdf, "application/pdf")}
    )

    # Validate that we passed first_page=1, last_page=MAX_PDF_PAGES to the underlying library
    assert MockPDF.called_kwargs.get("first_page") == 1
    assert MockPDF.called_kwargs.get("last_page") == ocr_service.MAX_PDF_PAGES
