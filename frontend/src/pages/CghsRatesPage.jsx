import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import CghsTable from '../components/CghsTable';
import { getCghsProcedures, getClassifications } from '../services/cghs.service';
import { trackEvent } from '../utils/analytics';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 100 }
  }
};

export default function CghsRatesPage({ 
  onLogout, currentPage 
}) {
  const [procedures, setProcedures] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('All');
  const limit = 20;

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCghsProcedures({
        search,
        classification: selectedClassification,
        page,
        limit
      });
      setProcedures(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch procedures', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedClassification, page]);

  useEffect(() => {
    trackEvent('page_view', { page_title: 'CGHS Rates' });
    async function init() {
      try {
        const cats = await getClassifications();
        setClassifications(cats);
      } catch (err) {
        console.error('Failed to fetch classifications', err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProcedures();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProcedures]);

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={pageVariants}
      className="min-h-screen bg-background text-text-main transition-colors duration-300"
    >
      <Helmet>
        <title>CGHS Rates Explorer | Sanjeevani</title>
      </Helmet>
      
      <Navbar onLogout={onLogout} currentPage={currentPage} />

      <main className="pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-text-main">
            CGHS Medical Procedure Rates
          </h1>
          <p className="text-text-muted text-base md:text-lg flex items-center gap-2 font-medium">
            <Info className="w-5 h-5 text-emerald-500 shrink-0" />
            Government-approved benchmark pricing reference for medical procedures.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
        >
          <div className="md:col-span-2 relative group flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-emerald-500 transition-colors z-10 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search by procedure name or code (e.g., Liver, LB124)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-14 pl-12 pr-4 bg-card border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all text-text-main placeholder:text-text-muted/60 shadow-sm font-medium"
            />
          </div>

          <div className="relative group flex items-center">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-emerald-500 transition-colors z-10 pointer-events-none" />
            <select 
              value={selectedClassification}
              onChange={(e) => { setSelectedClassification(e.target.value); setPage(1); }}
              className="w-full h-14 pl-12 pr-4 bg-card border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all text-text-main cursor-pointer shadow-sm font-medium"
            >
              <option value="All" className="bg-card text-text-main">All Classifications</option>
              {classifications.map(cat => (
                <option key={cat} value={cat} className="bg-card text-text-main">{cat}</option>
              ))}
            </select>
          </div>

          <div className="h-14 px-5 bg-card border border-border/50 rounded-2xl flex items-center justify-between shadow-sm">
            <span className="text-text-muted text-sm font-medium">Total Procedures</span>
            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{total.toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Table Section */}
        <motion.div variants={itemVariants} className="min-h-[500px]">
          <CghsTable data={procedures} loading={loading} />
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div 
            variants={itemVariants}
            className="flex items-center justify-center gap-4 pt-4"
          >
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-3 rounded-xl bg-card/60 border border-border/40 text-text-main hover:bg-card/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-bold">{page}</span>
              <span className="text-text-muted">of</span>
              <span className="text-text-muted font-mono">{totalPages}</span>
            </div>

            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-3 rounded-xl bg-card/60 border border-border/40 text-text-main hover:bg-card/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </main>

      <footer className="mt-20 py-10 px-4 border-t border-border/40 bg-card/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold">S</span>
            </div>
            <div>
              <p className="text-text-main font-bold">Sanjeevani</p>
              <p className="text-text-muted text-xs">Medical Bill Transparency Initiative</p>
            </div>
          </div>
          <p className="text-text-muted text-sm">
            © 2026 Sanjeevani. Benchmarked against official CGHS data.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
