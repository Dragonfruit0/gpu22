import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Cpu, LayoutDashboard, ShoppingCart, LogOut, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar({ user }: { user: User | null }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            GPU-CHAIN
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link to="/marketplace" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </Link>
              <Link to="/worker" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Worker
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
