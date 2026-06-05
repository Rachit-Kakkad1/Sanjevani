import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, User, LayoutDashboard, FileUp, Database, MapPin, LogOut, ChevronDown, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname.substring(1) || 'landing';

  const onLogout = () => navigate('/landing');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'upload', label: 'Upload Bill', icon: FileUp, href: '/upload' },
    { id: 'jan-aushadhi', label: 'Store Finder', icon: MapPin, href: '/jan-aushadhi' },
    { id: 'cghs-rates', label: 'CGHS Rates', icon: Activity, href: '/cghs-rates' },
    { id: 'gov-data', label: 'Gov Schemes', icon: Database, href: '/gov-schemes' },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Guest User", "email": "guest@sanjeevani.ai"}');

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'py-3 bg-background/80 backdrop-blur-xl border-b border-primary/10 shadow-lg' 
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            to='/dashboard'
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-text-main">
              Sanjee<span className="text-primary">vani</span>
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                to={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  currentPage === link.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-text-muted hover:bg-primary/5 hover:text-primary'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            
            <Link 
              to='/notifications'
              className="p-2.5 rounded-xl hover:bg-primary/5 text-text-muted transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
            </Link>

            <div className="relative">
              <Link 
                onClick={(e) => { e.preventDefault(); setIsProfileOpen(!isProfileOpen); }}
                className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/5"
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-text-main leading-none mb-1">{user.name}</p>
                  <p className="text-[10px] text-text-muted leading-none">Pro Plan</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </Link>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 glass-card rounded-2xl py-2 shadow-2xl z-50 overflow-hidden"
                  >
                    <Link 
                      to='/profile' onClick={() => setIsProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-main hover:bg-primary/10 transition-colors"
                    >
                      <User className="w-4 h-4 text-primary" />
                      My Profile
                    </Link>
                    <div className="h-px bg-primary/10 my-1 mx-2"></div>
                    <Link 
                      to='/login'
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            <ThemeToggle />
            <Link 
              onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(!isMobileMenuOpen); }}
              className="p-2 rounded-xl text-text-main hover:bg-primary/5 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-b border-primary/10 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.href} onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    currentPage === link.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-text-muted hover:bg-primary/5'
                  }`}
                >
                  <link.icon size={20} />
                  {link.label}
                </Link>
              ))}
              <div className="h-px bg-primary/10 my-2"></div>
              <Link 
                to='/profile' onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium text-text-muted"
              >
                <User size={20} />
                Profile
              </Link>
              <Link 
                to='/login'
                className="flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium text-red-500"
              >
                <LogOut size={20} />
                Sign Out
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;// TODO: refine mobile menu animations with stagger effect
