const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../utils/logger');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TIMEOUT = 60000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Forward uploaded bill directly to the Python FastAPI OCR service.
 * Dummy/mock data fallbacks have been completely removed.
 */
async function callOCRService(filePath, filename, retryCount = 0) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath), filename);

  const ocrUrl = process.env.OCR_SERVICE_URL || 'https://rachit-ai-sanjeevani-ocr.hf.space/ocr/extract';

  try {
    const response = await axios.post(ocrUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: Number(process.env.OCR_TIMEOUT_MS || TIMEOUT)
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Python OCR service returned an invalid response');
    }

    logger.info(`[OCR] Python OCR stage extraction successful for: ${filename}`);
    return response.data.data;
  } catch (err) {
    const isRetryable = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.response?.status >= 500;
    
    if (retryCount < MAX_RETRIES && isRetryable) {
      logger.warn(`[OCR] Python OCR stage retry ${retryCount + 1}/${MAX_RETRIES}: ${err.message}`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return callOCRService(filePath, filename, retryCount + 1);
    }

    logger.error(`[OCR] Python OCR stage failed: ${err.message}`);
    throw new Error(`Python OCR stage processing error: ${err.message}`);
  }
}

async function processOCR(filePath, filename) {
  logger.info(`[OCR] Forwarding uploaded bill to Python stage: ${filename}`);
  const result = await callOCRService(filePath, filename);

  if (!result.items) {
    throw new Error('Python OCR stage response missing items array');
  }

  const confidence = result.items.length > 0
    ? result.items.reduce((sum, item) => sum + (item.confidence || 0), 0) / result.items.length
    : 0;

  return {
    engine: result.engine || 'python-easyocr',
    items: result.items,
    total: result.parsedTotal || result.items.reduce((sum, item) => sum + (item.price || 0), 0),
    ocr_confidence: confidence
  };
}

module.exports = { processOCR };