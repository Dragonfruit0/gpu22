import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Chrome, Cpu } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create user profile
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Initialize credits
        await setDoc(doc(db, 'credits', user.uid), {
          userId: user.uid,
          balance: 1000, // 1000 credits = $10
          updatedAt: serverTimestamp()
        });

        toast.success('Welcome to GPU-CHAIN! You received 1000 free credits.');
      } else {
        toast.success('Welcome back!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-12 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-cyan-500/20">
          <Cpu className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold tracking-tighter mb-4">Join the Network</h2>
        <p className="text-white/50 mb-10">Sign in to access the decentralized GPU marketplace and start executing tasks.</p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full py-4 px-6 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Chrome className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="mt-8 text-xs text-white/30 leading-relaxed">
          By continuing, you agree to GPU-CHAIN's Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
