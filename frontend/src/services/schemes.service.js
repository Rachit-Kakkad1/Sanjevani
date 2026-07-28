/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ Government Healthcare Schemes Service — Production v3.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provides live querying and intelligent eligibility matching for public
 * health coverage programs (Ayushman Bharat PM-JAY, MA Vatsalya, CGHS, PMBJP, RAN, etc.).
 *
 * Fallback Cascade:
 *   1. Backend REST Endpoint (/api/v1/schemes)
 *   2. Curated Embedded Standalone Schemes Dataset (Zero-fail guarantee)
 */

import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

// ─── Embedded Official Government Healthcare Schemes Dataset ───────
export const NATIONWIDE_GOV_SCHEMES = [
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    minIncome: 0,
    maxIncome: 500000,
    states: [], // National
    coverageAmount: 500000,
    category: 'Universal Coverage',
    benefits: [
      'Up to ₹5,00,000 coverage per family per year',
      'Cashless & paperless access at empanelled hospitals',
      'Covers secondary & tertiary care hospitalizations',
      'Pre-existing conditions covered from Day 1'
    ],
    description: 'A flagship national public health insurance scheme providing free health coverage up to ₹5 Lakhs per family for secondary and tertiary hospitalization.'
  },
  {
    id: 'ma_vatsalya_gujarat',
    name: 'Mukhyamantri Amrutam (MA) & MA Vatsalya Yojana',
    minIncome: 0,
    maxIncome: 400000,
    states: ['Gujarat'],
    coverageAmount: 500000,
    category: 'State Scheme (Gujarat)',
    benefits: [
      'Cashless medical treatment up to ₹5,00,000 per family per year',
      'Covers 698 surgical procedures & medical treatments',
      'Includes cardiovascular, neurosurgery, renal, & oncology care',
      '₹300 travel allowance per hospital visit'
    ],
    description: 'Government of Gujarat flagship tertiary health scheme providing zero-cost treatment for low and middle-income families across Gujarat.'
  },
  {
    id: 'pmbjp_generic',
    name: 'PM Bhartiya Janaushadhi Pariyojana (PMBJP)',
    minIncome: 0,
    maxIncome: 10000000,
    states: [], // National
    coverageAmount: 100000,
    category: 'Generic Medicines',
    benefits: [
      '50% to 90% savings on generic medicines vs branded MRPs',
      'Over 2,000 quality medicines & 300 surgical items',
      'NABL accredited laboratory tested medicines',
      'Available across 10,000+ Jan Aushadhi Kendras nationwide'
    ],
    description: 'A national initiative making quality generic medicines accessible to all citizens at up to 90% lower prices compared to branded equivalents.'
  },
  {
    id: 'ran_bpl',
    name: 'Rashtriya Arogya Nidhi (RAN)',
    minIncome: 0,
    maxIncome: 150000,
    states: [], // National
    coverageAmount: 1500000,
    category: 'Critical Illness Grant',
    benefits: [
      'One-time financial assistance up to ₹15,00,000 for BPL patients',
      'Covers life-threatening diseases (Cancer, Organ Transplant, Heart Surgery)',
      'Direct payment to super-specialty government hospitals',
      'Fast-track emergency approval pathway'
    ],
    description: 'Central Government grant providing financial assistance to patients living below poverty line suffering from major life-threatening diseases.'
  },
  {
    id: 'cghs_scheme',
    name: 'Central Government Health Scheme (CGHS)',
    minIncome: 0,
    maxIncome: 10000000,
    states: [], // National
    coverageAmount: 1000000,
    category: 'Govt & Pensioner Care',
    benefits: [
      'Comprehensive OPD, IPD, & dispensary medical services',
      'Empanelled NABH hospital rates across major metro cities',
      'Full reimbursement for emergency private hospital care',
      'Includes cashless diagnostics & pathology'
    ],
    description: 'Comprehensive health coverage scheme for Central Government employees, pensioners, and eligible dependents.'
  },
  {
    id: 'mjpjay_maharashtra',
    name: 'Mahatma Jyotiba Phule Jan Arogya Yojana',
    minIncome: 0,
    maxIncome: 150000,
    states: ['Maharashtra'],
    coverageAmount: 150000,
    category: 'State Scheme (Maharashtra)',
    benefits: [
      'Up to ₹1,50,000 per family per year for 971 procedures',
      'End-to-end cashless treatment in government & private hospitals',
      'Free follow-up consultations & medications'
    ],
    description: 'Flagship health insurance scheme of Maharashtra providing end-to-end cashless hospitalization services.'
  },
  {
    id: 'cmchis_tn',
    name: 'Chief Minister\'s Comprehensive Health Insurance Scheme',
    minIncome: 0,
    maxIncome: 120000,
    states: ['Tamil Nadu'],
    coverageAmount: 500000,
    category: 'State Scheme (Tamil Nadu)',
    benefits: [
      'Up to ₹5,00,000 per family per year for cashless care',
      'Covers 1,027 medical procedures & 154 specialized follow-up procedures'
    ],
    description: 'Tamil Nadu government scheme providing comprehensive healthcare access to eligible families.'
  },
  {
    id: 'bsky_odisha',
    name: 'Biju Swasthya Kalyan Yojana (BSKY)',
    minIncome: 0,
    maxIncome: 500000,
    states: ['Odisha'],
    coverageAmount: 500000,
    category: 'State Scheme (Odisha)',
    benefits: [
      'Up to ₹5,00,000 per family per year (₹10 Lakhs for women members)',
      'Universal health coverage across state government hospitals',
      'Free medicine & diagnostic facilities'
    ],
    description: 'Government of Odisha initiative for health protection of economically vulnerable families.'
  }
];

/**
 * Filter schemes by family income and state of residence.
 */
export function filterEligibleSchemes(income, state) {
  const numIncome = Number(income) || 0;
  const targetState = (state || '').trim().toLowerCase();

  const matched = NATIONWIDE_GOV_SCHEMES.filter(scheme => {
    // 1. Income check
    const incomeMatches = numIncome >= scheme.minIncome && numIncome <= scheme.maxIncome;

    // 2. State check (empty array means National/All states)
    const stateMatches =
      scheme.states.length === 0 ||
      scheme.states.some(s => s.toLowerCase() === targetState);

    return incomeMatches && stateMatches;
  });

  // Calculate score & sort
  const scored = matched.map(scheme => {
    const score = numIncome > 0 ? (scheme.coverageAmount / numIncome) : scheme.coverageAmount;
    return { ...scheme, impactScore: score };
  });

  scored.sort((a, b) => b.impactScore - a.impactScore);

  // If no specific match, fallback to national schemes
  if (scored.length === 0) {
    return NATIONWIDE_GOV_SCHEMES.filter(s => s.states.length === 0);
  }

  return scored;
}

/**
 * Fetch eligible schemes via Backend API with fallback to embedded dataset.
 */
export async function fetchGovSchemes(income, state) {
  try {
    const response = await axios.get(`${API_BASE_URL}/schemes`, {
      params: { income, state },
      timeout: 4000
    });
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
  } catch (err) {
    console.warn('[schemes.service] Backend schemes API unavailable, using embedded dataset:', err.message);
  }

  // Standalone zero-fail fallback
  return filterEligibleSchemes(income, state);
}
