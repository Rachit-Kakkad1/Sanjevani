import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { initGA } from './utils/analytics'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { HelmetProvider } from 'react-helmet-async'

// Initialize Google Analytics (Replace with your actual Measurement ID)
initGA(import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX');

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your_google_client_id_here') 
  ? import.meta.env.VITE_GOOGLE_CLIENT_ID 
  : "1234567890-exampleclientid.apps.googleusercontent.com";

if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
  console.warn("Missing real VITE_GOOGLE_CLIENT_ID in environment variables. Google OAuth will use Demo Mode fallback.");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </GoogleOAuthProvider>
    </HelmetProvider>
  </StrictMode>,
)
