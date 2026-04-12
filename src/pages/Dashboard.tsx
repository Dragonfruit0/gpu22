import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, doc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Wallet, Activity, Clock, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [balance, setBalance] = useState<number>(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to credits
    const unsubCredits = onSnapshot(doc(db, 'credits', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance);
      }
    });

    // Listen to tasks
    const q = query(
      collection(db, 'tasks'),
      where('requesterId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubTasks = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(taskList);
      setLoading(false);
    });

    return () => {
      unsubCredits();
      unsubTasks();
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Dashboard</h1>
          <p className="text-white/50">Welcome back, {auth.currentUser?.displayName}</p>
        </div>
        <Link
          to="/marketplace"
          className="px-6 py-3 bg-cyan-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-cyan-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Task
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-[2rem] bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm font-medium text-white/50 uppercase tracking-widest">Balance</span>
          </div>
          <div className="text-4xl font-bold tracking-tighter">{(balance / 100).toFixed(2)} <span className="text-xl text-white/40">USD</span></div>
          <div className="mt-2 text-sm text-cyan-400 font-medium">{balance} Credits</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-[2rem] bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm font-medium text-white/50 uppercase tracking-widest">Active Tasks</span>
          </div>
          <div className="text-4xl font-bold tracking-tighter">
            {tasks.filter(t => ['PENDING', 'ASSIGNED', 'EXECUTING'].includes(t.status)).length}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-[2rem] bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm font-medium text-white/50 uppercase tracking-widest">Total Completed</span>
          </div>
          <div className="text-4xl font-bold tracking-tighter">
            {tasks.filter(t => t.status === 'SUCCESS').length}
          </div>
        </motion.div>
      </div>

      {/* Recent Tasks */}
      <section>
        <h2 className="text-2xl font-bold tracking-tighter mb-6">Recent Tasks</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-white/20">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 rounded-[2rem] border border-dashed border-white/10 text-white/30">
              No tasks found. Start by hiring a GPU from the marketplace.
            </div>
          ) : (
            tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    task.status === 'SUCCESS' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" :
                    task.status === 'FAILED' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                    "bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                  )} />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {task.type} Task
                      <span className="text-xs font-medium text-white/30 px-2 py-0.5 rounded-full border border-white/10">
                        {task.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-sm text-white/50">
                      {new Date(task.createdAt?.toDate()).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="font-bold">{task.cost} Credits</div>
                    <div className="text-xs text-white/30 uppercase tracking-widest">{task.status}</div>
                  </div>
                  <Link
                    to={`/task/${task.id}`}
                    className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
