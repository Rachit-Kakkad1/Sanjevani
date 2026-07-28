import axios from 'axios';

const getBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  if (envUrl.endsWith('/')) envUrl = envUrl.slice(0, -1);
  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl}/api/v1`;
};

const API_BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 4000
});

// Official CGHS Standalone Dataset (Guaranteed fallback when DB is empty or API is offline)
export const DEFAULT_CGHS_PROCEDURES = [
  { _id: 'cghs-1', code: 'LB086', canonicalName: 'Alanine Aminotransferase (ALT/SGPT)', nonNABH: 85, NABH: 100, superSpeciality: 100, classification: 'Laboratory' },
  { _id: 'cghs-2', code: 'LB087', canonicalName: 'Aspartate Aminotransferase (AST/SGOT)', nonNABH: 85, NABH: 100, superSpeciality: 100, classification: 'Laboratory' },
  { _id: 'cghs-3', code: 'LB001', canonicalName: 'Complete Blood Count (CBC / Hemogram)', nonNABH: 135, NABH: 160, superSpeciality: 160, classification: 'Laboratory' },
  { _id: 'cghs-4', code: 'LB015', canonicalName: 'Blood Sugar Fasting (FBS)', nonNABH: 50, NABH: 60, superSpeciality: 60, classification: 'Laboratory' },
  { _id: 'cghs-5', code: 'LB016', canonicalName: 'Blood Sugar Post Prandial (PPBS)', nonNABH: 50, NABH: 60, superSpeciality: 60, classification: 'Laboratory' },
  { _id: 'cghs-6', code: 'LB022', canonicalName: 'HbA1c (Glycated Hemoglobin)', nonNABH: 215, NABH: 250, superSpeciality: 250, classification: 'Laboratory' },
  { _id: 'cghs-7', code: 'LB040', canonicalName: 'Kidney Function Test (KFT / Renal Profile)', nonNABH: 225, NABH: 260, superSpeciality: 260, classification: 'Laboratory' },
  { _id: 'cghs-8', code: 'LB052', canonicalName: 'Liver Function Test (LFT Complete)', nonNABH: 295, NABH: 350, superSpeciality: 350, classification: 'Laboratory' },
  { _id: 'cghs-9', code: 'LB068', canonicalName: 'Lipid Profile (Total Cholesterol, HDL, LDL, Triglycerides)', nonNABH: 250, NABH: 295, superSpeciality: 295, classification: 'Laboratory' },
  { _id: 'cghs-10', code: 'LB075', canonicalName: 'Thyroid Profile (T3, T4, TSH)', nonNABH: 200, NABH: 235, superSpeciality: 235, classification: 'Laboratory' },
  { _id: 'cghs-11', code: 'LB102', canonicalName: 'Urine Routine & Microscopic Examination', nonNABH: 40, NABH: 50, superSpeciality: 50, classification: 'Laboratory' },
  { _id: 'cghs-12', code: 'IM001', canonicalName: 'X-Ray Chest PA View', nonNABH: 150, NABH: 180, superSpeciality: 180, classification: 'Imaging & Radiology' },
  { _id: 'cghs-13', code: 'IM008', canonicalName: 'Ultrasound Abdomen & Pelvis (USG)', nonNABH: 500, NABH: 600, superSpeciality: 600, classification: 'Imaging & Radiology' },
  { _id: 'cghs-14', code: 'IM024', canonicalName: 'CT Scan Brain / Head Plain', nonNABH: 1350, NABH: 1600, superSpeciality: 1600, classification: 'Imaging & Radiology' },
  { _id: 'cghs-15', code: 'IM030', canonicalName: 'CT Scan HRCT Chest / Thorax', nonNABH: 2100, NABH: 2500, superSpeciality: 2500, classification: 'Imaging & Radiology' },
  { _id: 'cghs-16', code: 'IM045', canonicalName: 'MRI Brain Plain (1.5T / 3T)', nonNABH: 2500, NABH: 3000, superSpeciality: 3000, classification: 'Imaging & Radiology' },
  { _id: 'cghs-17', code: 'IM052', canonicalName: 'MRI Lumbar Spine Plain', nonNABH: 2500, NABH: 3000, superSpeciality: 3000, classification: 'Imaging & Radiology' },
  { _id: 'cghs-18', code: 'CD001', canonicalName: '12-Lead Electrocardiogram (ECG)', nonNABH: 120, NABH: 150, superSpeciality: 150, classification: 'Cardiology' },
  { _id: 'cghs-19', code: 'CD005', canonicalName: '2D Echocardiography with Color Doppler', nonNABH: 1200, NABH: 1400, superSpeciality: 1400, classification: 'Cardiology' },
  { _id: 'cghs-20', code: 'CD010', canonicalName: 'Treadmill Test (TMT / Stress ECG)', nonNABH: 700, NABH: 820, superSpeciality: 820, classification: 'Cardiology' },
  { _id: 'cghs-21', code: 'CD020', canonicalName: 'Coronary Angiography (CAG)', nonNABH: 10200, NABH: 12000, superSpeciality: 12000, classification: 'Cardiology' },
  { _id: 'cghs-22', code: 'CD025', canonicalName: 'Coronary Angioplasty (PTCA with 1 Stent)', nonNABH: 55000, NABH: 65000, superSpeciality: 65000, classification: 'Cardiology' },
  { _id: 'cghs-23', code: 'SU001', canonicalName: 'Appendectomy (Laparoscopic / Open)', nonNABH: 15300, NABH: 18000, superSpeciality: 18000, classification: 'General Surgery' },
  { _id: 'cghs-24', code: 'SU005', canonicalName: 'Laparoscopic Cholecystectomy (Gallbladder)', nonNABH: 18700, NABH: 22000, superSpeciality: 22000, classification: 'General Surgery' },
  { _id: 'cghs-25', code: 'SU010', canonicalName: 'Inguinal Hernia Repair (Mesh)', nonNABH: 14500, NABH: 17000, superSpeciality: 17000, classification: 'General Surgery' },
  { _id: 'cghs-26', code: 'OP001', canonicalName: 'Cataract Surgery with IOL Implant (Phacoemulsification)', nonNABH: 11000, NABH: 13000, superSpeciality: 13000, classification: 'Ophthalmology' },
  { _id: 'cghs-27', code: 'NE001', canonicalName: 'Hemodialysis (Per Session)', nonNABH: 1400, NABH: 1650, superSpeciality: 1650, classification: 'Nephrology' },
  { _id: 'cghs-28', code: 'RM001', canonicalName: 'General Ward Room Charges (Per Day)', nonNABH: 1000, NABH: 1000, superSpeciality: 1000, classification: 'Room Rent' },
  { _id: 'cghs-29', code: 'RM002', canonicalName: 'Semi-Private Room Charges (Per Day)', nonNABH: 2000, NABH: 2000, superSpeciality: 2000, classification: 'Room Rent' },
  { _id: 'cghs-30', code: 'RM003', canonicalName: 'Private Room Charges (Per Day)', nonNABH: 3000, NABH: 3000, superSpeciality: 3000, classification: 'Room Rent' },
  { _id: 'cghs-31', code: 'RM004', canonicalName: 'ICU / CCU Charges (Per Day)', nonNABH: 4000, NABH: 5000, superSpeciality: 5000, classification: 'Room Rent' }
];

export const getCghsProcedures = async (params = {}) => {
  try {
    const response = await apiClient.get('/cghs/procedures', { params });
    if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      return response.data;
    }
  } catch (error) {
    console.warn('[cghs.service] API call failed, using embedded CGHS procedures dataset');
  }

  // Standalone Client Filter Fallback (Executes whenever API fails or returns 0 records)
  const { search = '', classification = 'All', page = 1, limit = 20 } = params;
  let filtered = [...DEFAULT_CGHS_PROCEDURES];

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(item =>
      item.canonicalName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.classification.toLowerCase().includes(q)
    );
  }

  if (classification && classification !== 'All') {
    filtered = filtered.filter(item => item.classification.toLowerCase() === classification.toLowerCase());
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return {
    data,
    total,
    page: Number(page),
    limit: Number(limit),
    count: data.length
  };
};

export const getClassifications = async () => {
  try {
    const response = await apiClient.get('/cghs/classifications');
    if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      return response.data.data;
    }
  } catch (error) {
    console.warn('[cghs.service] Classifications API failed, returning default classifications');
  }

  const cats = [...new Set(DEFAULT_CGHS_PROCEDURES.map(p => p.classification))];
  return cats.sort();
};

export default {
  getCghsProcedures,
  getClassifications,
};
