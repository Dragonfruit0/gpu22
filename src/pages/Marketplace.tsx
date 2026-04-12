import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Search, Filter, Play, X, Code, Database } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Marketplace() {
  const navigate = useNavigate();
  const [gpus, setGpus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGpu, setSelectedGpu] = useState<any>(null);
  const [taskCode, setTaskCode] = useState('print("Hello from GPU-CHAIN!")');
  const [taskType, setTaskType] = useState('PYTHON');

  useEffect(() => {
    const q = query(
      collection(db, 'gpu_inventory'),
      where('status', '==', 'ONLINE')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gpuList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGpus(gpuList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTask = async () => {
    if (!auth.currentUser || !selectedGpu) return;

    try {
      const result = await runTransaction(db, async (transaction) => {
        const creditRef = doc(db, 'credits', auth.currentUser!.uid);
        const creditSnap = await transaction.get(creditRef);

        if (!creditSnap.exists()) throw new Error("Credit account not found");

        const balance = creditSnap.data().balance;
        const cost = selectedGpu.pricePerTask;

        if (balance < cost) {
          throw new Error("Insufficient credits");
        }

        // Deduct credits
        transaction.update(creditRef, {
          balance: balance - cost,
          updatedAt: serverTimestamp()
        });

        // Add transaction record
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: auth.currentUser!.uid,
          amount: -cost,
          type: 'DEBIT',
          description: `Compute task on ${selectedGpu.gpuModel}`,
          timestamp: serverTimestamp()
        });

        // Create task
        const taskRef = doc(collection(db, 'tasks'));
        transaction.set(taskRef, {
          requesterId: auth.currentUser!.uid,
          workerId: selectedGpu.ownerId,
          gpuId: selectedGpu.id,
          peerId: selectedGpu.peerId,
          status: 'PENDING',
          type: taskType,
          code: taskCode,
          cost: cost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        return taskRef.id;
      });

      toast.success('Task submitted successfully!');
      setSelectedGpu(null);
      // Redirect to task details to start P2P automatically
      const taskId = await result;
      if (taskId) navigate(`/task/${taskId}`);
    } catch (error: any) {
      console.error('Task error:', error);
      toast.error(error.message || 'Failed to submit task');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tighter">Marketplace</h1>
        <p className="text-white/50">Hire high-performance GPUs from the distributed network.</p>
      </header>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search GPU models (RTX 4090, A100...)"
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
        </div>
        <button className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-colors">
          <Filter className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* GPU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 text-white/20">Scanning network...</div>
        ) : gpus.length === 0 ? (
          <div className="col-span-full text-center py-20 rounded-[2rem] border border-dashed border-white/10 text-white/30">
            No GPUs currently online. Check back later or register your own.
          </div>
        ) : (
          gpus.map((gpu, i) => (
            <motion.div
              key={gpu.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Online
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-1">{gpu.gpuModel}</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 text-white/40 border border-white/10">
                  {gpu.vram}GB VRAM
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  P2P READY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {gpu.pricePerTask < 100 ? 'ECONOMY' : 'PREMIUM'}
                </span>
              </div>
              <p className="text-white/40 text-xs mb-6 leading-relaxed">
                High-performance node optimized for {gpu.vram > 16 ? 'Large Language Models' : 'General Compute'}. 
                Peer ID: {gpu.peerId.slice(0, 12)}...
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <div>
                  <div className="text-2xl font-bold">{gpu.pricePerTask}</div>
                  <div className="text-xs text-white/30 uppercase tracking-widest">Credits / Task</div>
                </div>
                <button
                  onClick={() => setSelectedGpu(gpu)}
                  className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  Hire GPU
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {selectedGpu && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGpu(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tighter">Create Compute Task</h2>
                  <p className="text-white/40 text-sm">Executing on {selectedGpu.gpuModel}</p>
                </div>
                <button
                  onClick={() => setSelectedGpu(null)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTaskType('PYTHON')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center gap-3",
                      taskType === 'PYTHON' ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    )}
                  >
                    <Code className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-bold">Python</div>
                      <div className="text-xs">General purpose</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setTaskType('AI_INFERENCE')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center gap-3",
                      taskType === 'AI_INFERENCE' ? "bg-purple-500/10 border-purple-500 text-purple-400" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    )}
                  >
                    <Database className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-bold">AI Inference</div>
                      <div className="text-xs">PyTorch / TensorFlow</div>
                    </div>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/30">Task Code</label>
                  <textarea
                    value={taskCode}
                    onChange={(e) => setTaskCode(e.target.value)}
                    className="w-full h-48 p-6 bg-black border border-white/10 rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                    placeholder="Enter your code here..."
                  />
                </div>

                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div>
                    <div className="text-sm text-white/40 uppercase tracking-widest">Total Cost</div>
                    <div className="text-2xl font-bold">{selectedGpu.pricePerTask} Credits</div>
                  </div>
                  <button
                    onClick={handleCreateTask}
                    className="px-8 py-4 bg-cyan-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Execute Task
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
