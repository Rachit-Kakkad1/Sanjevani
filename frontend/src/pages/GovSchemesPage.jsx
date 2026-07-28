import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import HeroSection from '../components/schemes/HeroSection';
import InputPanel from '../components/schemes/InputPanel';
import ResultsSection from '../components/schemes/ResultsSection';
import InsightsPanel from '../components/schemes/InsightsPanel';
import { fetchGovSchemes, filterEligibleSchemes } from '../services/schemes.service';

export default function GovSchemesPage({ onLogout, currentPage }) {
  const DEFAULT_INCOME = 40000;
  const DEFAULT_STATE = 'Gujarat';

  const [schemes, setSchemes] = useState(() => filterEligibleSchemes(DEFAULT_INCOME, DEFAULT_STATE));
  const [isLoading, setIsLoading] = useState(false);
  const [searchedIncome, setSearchedIncome] = useState(DEFAULT_INCOME);

  useEffect(() => {
    // Initial fetch for default params (40,000 Gujarat)
    handleSearch(DEFAULT_INCOME, DEFAULT_STATE);
  }, []);

  const handleSearch = async (income, state) => {
    setIsLoading(true);
    setSearchedIncome(income);
    try {
      const results = await fetchGovSchemes(income, state);
      setSchemes(results);
    } catch (error) {
      console.error('[GovSchemesPage] Search error:', error);
      setSchemes(filterEligibleSchemes(income, state));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background transition-colors duration-300"
    >
      <Helmet>
        <title>Government Schemes | Sanjeevani - Eligibility Checker</title>
        <meta name="description" content="Discover government healthcare schemes and eligibility based on your income and state." />
      </Helmet>
      <Navbar onLogout={onLogout} currentPage={currentPage} />

      <main className="pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <HeroSection />
          <InputPanel onSearch={handleSearch} isLoading={isLoading} />
          
          {schemes && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <InsightsPanel schemes={schemes} income={searchedIncome} />
              <ResultsSection schemes={schemes} searchedIncome={searchedIncome} />
            </motion.div>
          )}
        </div>
      </main>
    </motion.div>
  );
}
