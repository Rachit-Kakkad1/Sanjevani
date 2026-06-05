import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import UploadPage from './components/upload/UploadPage';
import ReportsPage from './components/reports/ReportsPage';
import InsightsPage from './components/insights/InsightsPage';
import Dashboard from './pages/Dashboard';
import GovSchemesPage from './pages/GovSchemesPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import JanAushadhiMap from './pages/JanAushadhiMap';
import CghsRatesPage from './pages/CghsRatesPage';

function App() {
  return (
    <Router>
      <div className="relative overflow-x-hidden">
        <Helmet>
          <title>Sanjeevani - The Ultimate Medical Bill Advocate</title>
          <meta name="description" content="AI-powered medical bill auditing tool to detect overcharges and billing fraud." />
        </Helmet>
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/gov-schemes" element={<GovSchemesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/jan-aushadhi" element={<JanAushadhiMap />} />
          <Route path="/cghs-rates" element={<CghsRatesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
