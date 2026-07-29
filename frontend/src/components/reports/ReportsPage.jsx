import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';

import Navbar from '../Navbar';
import CurrentBillCard from '../upload/CurrentBillCard';
import HistoryList from '../upload/HistoryList';
import AnalyticsCharts from '../upload/AnalyticsCharts';
import InsightsPanel from '../upload/InsightsPanel';
import { getBillHistory } from '../../utils/api';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
};

export default function ReportsPage({ onLogout, currentPage }) {
  const navigate = useNavigate();
  const [currentBill, setCurrentBill] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const savedBillStr = localStorage.getItem('lastBill');
        
        if (savedBillStr) {
          try {
            setCurrentBill(JSON.parse(savedBillStr));
          } catch (e) {
            console.error('Failed to parse saved bill:', e);
          }
        }

        try {
          const historyData = await getBillHistory();
          if (Array.isArray(historyData)) {
            setHistory(historyData);
          }
        } catch (apiErr) {
          console.warn('Backend history unavailable, using stored bill:', apiErr);
          if (savedBillStr) {
            try {
              setHistory([JSON.parse(savedBillStr)]);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleSelectBill = (bill) => {
    setCurrentBill(bill);
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={pageVariants}
      className="min-h-screen relative"
      style={{ backgroundColor: '#E3D5CA' }}
    >
      <Navbar onLogout={onLogout} currentPage={currentPage} />

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-serif" style={{ color: '#1a1a1a' }}>
                Medical Bill Audit Reports
              </h1>
              <p className="text-sm md:text-base text-[#8D7B68] mt-1 font-medium">
                Comprehensive AI breakdown, overcharge flags, and CGHS price comparisons
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md cursor-pointer"
                style={{ backgroundColor: '#8D7B68' }}
              >
                <FileText size={18} />
                Upload Another Bill
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/70 border border-[#8D7B68]/30 text-[#8D7B68] cursor-pointer shadow-sm"
              >
                <Download size={18} />
                Export PDF Report
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Current Bill Summary & Itemized Audit */}
        <motion.div variants={itemVariants} className="mb-8">
          <CurrentBillCard bill={currentBill} />
        </motion.div>

        {/* History List */}
        <motion.div variants={itemVariants} className="mb-8">
          <HistoryList 
            onSelectBill={handleSelectBill} 
            history={history} 
            loading={loading} 
          />
        </motion.div>
        
        {/* Analytics Charts */}
        {history.length > 0 && (
          <motion.div variants={itemVariants} className="mb-8">
            <AnalyticsCharts bills={history} loading={loading} />
          </motion.div>
        )}
        
        {/* Insights Panel */}
        {history.length > 0 && (
          <motion.div variants={itemVariants}>
            <InsightsPanel bills={history} loading={loading} />
          </motion.div>
        )}
      </main>

      <footer className="py-6 px-4 md:px-8 border-t border-[#8D7B68]/20 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#8D7B68] font-medium">
          <div>Sanjevani — AI-Powered Medical Bill Advocacy Platform</div>
          <div className="flex items-center gap-4">
            <span>Encrypted Data Protection</span>
            <span>•</span>
            <span>Government Standard CGHS Pricing</span>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
