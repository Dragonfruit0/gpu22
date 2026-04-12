/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Toaster } from 'sonner';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import TaskDetails from './pages/TaskDetails';
import WorkerPanel from './pages/WorkerPanel';

// Components
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-pulse text-2xl font-mono tracking-tighter">GPU-CHAIN INITIALIZING...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
        <Navbar user={user} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
            <Route path="/marketplace" element={user ? <Marketplace /> : <Navigate to="/auth" />} />
            <Route path="/task/:taskId" element={user ? <TaskDetails /> : <Navigate to="/auth" />} />
            <Route path="/worker" element={user ? <WorkerPanel /> : <Navigate to="/auth" />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" theme="dark" />
      </div>
    </Router>
  );
}
