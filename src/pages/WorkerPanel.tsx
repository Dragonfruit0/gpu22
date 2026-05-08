import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Cpu, Power, Terminal, Activity, Settings, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import Peer from 'peerjs';
import { cn } from '../lib/utils';

export default function WorkerPanel() {
  const [gpu, setGpu] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] Dashboard initialized. Monitoring Firestore..."]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ done: 0, earned: 0 });

  // Form states
  const [gpuModel, setGpuModel] = useState('NVIDIA RTX 4090');
  const [vram, setVram] = useState(24);
  const [price, setPrice] = useState(100);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    addLog("Waiting for local agent to connect and process tasks...");
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'gpu_inventory'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
        setGpu(data);
        if (data.status === 'ONLINE' && !isOnline) {
          addLog("Local agent detected. System is ONLINE.");
        }
        setIsOnline(data.status === 'ONLINE');
        setPeerId(data.peerId);
      } else {
        setGpu(null);
      }
    });

    // Listen for tasks assigned to this worker
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('workerId', '==', auth.currentUser.uid),
      limit(20)
    );

    addLog("System initialized. Monitoring Firestore for assigned tasks...");

    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setActiveTasks(taskList);
      
      // Update stats
      const completed = taskList.filter(t => t.status === 'SUCCESS');
      setStats({
        done: completed.length,
        earned: completed.reduce((acc, t) => acc + (t.cost || 0), 0)
      });

      // Add logs for new updates
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        if (change.type === 'modified' || (change.type === 'added' && !snapshot.metadata.fromCache)) {
          if (data.status === 'EXECUTING') {
            addLog(`Task ${change.doc.id.slice(0, 8)} started execution...`);
          } else if (data.status === 'SUCCESS') {
            addLog(`Task ${change.doc.id.slice(0, 8)} completed successfully.`);
            if (data.result) addLog(`Output: ${data.result.slice(0, 100)}${data.result.length > 100 ? '...' : ''}`);
          } else if (data.status === 'FAILED') {
            addLog(`Task ${change.doc.id.slice(0, 8)} failed.`);
            if (data.logs) addLog(`Error: ${data.logs.slice(0, 100)}`);
          }
        }
      });
    }, (error) => {
      console.error("Tasks listener error:", error);
      addLog(`CRITICAL: Failed to listen for tasks. ${error.message}`);
      if (error.message.includes("index")) {
        addLog("Tip: This usually means a Firestore index is being built. Please wait a few minutes.");
      }
    });

    return () => {
      unsubscribe();
      unsubTasks();
    };
  }, []);

  const updateGpu = async () => {
    if (!gpu) return;
    try {
      await updateDoc(doc(db, 'gpu_inventory', gpu.id), {
        gpuModel,
        vram,
        pricePerTask: price,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      toast.success('GPU specs updated!');
    } catch (error) {
      toast.error('Failed to update GPU');
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const registerGpu = async () => {
    // This button is now purely informational as the local script handles registration
    toast.info("Follow the instructions below to start your node.");
  };

  const toggleStatus = async () => {
    if (!gpu) return;

    try {
      const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
      await updateDoc(doc(db, 'gpu_inventory', gpu.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setIsOnline(!isOnline);
      addLog(`Worker status changed to ${newStatus}`);
      toast.success(`Worker is now ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Worker Panel</h1>
          <p className="text-white/50">Manage your local GPU node and earn credits.</p>
        </div>
        {gpu && (
          <button
            onClick={toggleStatus}
            className={cn(
              "px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg",
              isOnline
                ? "bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20 shadow-red-500/10"
                : "bg-green-500 text-white hover:bg-green-400 shadow-green-500/20"
            )}
          >
            <Power className="w-5 h-5" />
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        )}
      </header>

      {!gpu ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto p-12 rounded-[2.5rem] bg-white/5 border border-white/10 text-center"
        >
          <div className="w-20 h-20 bg-cyan-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Cpu className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tighter mb-4">Register Your GPU</h2>
          <p className="text-white/50 mb-10">Turn your idle GPU power into credits. Register your machine to join the network.</p>

          <div className="space-y-6 text-left mb-10">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/30">GPU Model</label>
              <input
                type="text"
                value={gpuModel}
                onChange={(e) => setGpuModel(e.target.value)}
                className="w-full p-4 bg-black border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/30">VRAM (GB)</label>
                <input
                  type="number"
                  value={vram}
                  onChange={(e) => setVram(Number(e.target.value))}
                  className="w-full p-4 bg-black border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/30">Price (Credits)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full p-4 bg-black border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
          </div>

          <button
            onClick={registerGpu}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:scale-[1.02] transition-transform"
          >
            Register Node
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Card */}
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={gpuModel}
                          onChange={(e) => setGpuModel(e.target.value)}
                          className="bg-black border border-white/10 rounded px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={vram}
                            onChange={(e) => setVram(Number(e.target.value))}
                            className="bg-black border border-white/10 rounded px-2 py-1 text-xs w-20"
                          />
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="bg-black border border-white/10 rounded px-2 py-1 text-xs w-20"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={updateGpu} className="text-[10px] bg-cyan-500 px-2 py-1 rounded">Save</button>
                          <button onClick={() => setIsEditing(false)} className="text-[10px] bg-white/10 px-2 py-1 rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold">{gpu.gpuModel}</h3>
                        <p className="text-white/40 text-sm">VRAM: {gpu.vram}GB • Peer ID: {gpu.peerId}</p>
                        <button onClick={() => setIsEditing(true)} className="text-[10px] text-cyan-400 hover:underline mt-1">Edit Specs</button>
                      </>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2",
                  isOnline ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/30"
                )}>
                  <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-white/20")} />
                  {isOnline ? 'Active & Listening' : 'Inactive'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-black border border-white/5">
                  <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Tasks Done</div>
                  <div className="text-2xl font-bold">{stats.done}</div>
                </div>
                <div className="p-6 rounded-2xl bg-black border border-white/5">
                  <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Earned</div>
                  <div className="text-2xl font-bold">{stats.earned}</div>
                </div>
                <div className="p-6 rounded-2xl bg-black border border-white/5">
                  <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Uptime</div>
                  <div className="text-2xl font-bold">{isOnline ? 'Active' : '0h'}</div>
                </div>
              </div>
            </div>

            {/* Active Tasks */}
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-bold tracking-tighter">Execution History</h3>
              </div>
              <div className="space-y-4">
                {activeTasks.length === 0 ? (
                  <div className="text-center py-12 text-white/20 border border-dashed border-white/10 rounded-2xl">
                    No tasks found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTasks.map((task) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={task.id} 
                        className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-2 h-2 rounded-full transition-all duration-500",
                            task.status === 'SUCCESS' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" :
                            task.status === 'FAILED' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" :
                            task.status === 'EXECUTING' ? "bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.6)]" :
                            "bg-white/20"
                          )} />
                          <div>
                            <div className="text-sm font-bold group-hover:text-cyan-400 transition-colors">{task.type} Task</div>
                            <div className="text-[10px] text-white/30 font-mono">{task.id.slice(0, 8)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold">{task.cost} Credits</div>
                          <div className={cn(
                            "text-[10px] uppercase font-black tracking-tighter transition-colors",
                            task.status === 'SUCCESS' ? "text-green-400" :
                            task.status === 'FAILED' ? "text-red-400" :
                            task.status === 'EXECUTING' ? "text-yellow-400" :
                            "text-white/30"
                          )}>
                            {task.status}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Console / Logs */}
          <div className="space-y-8">
            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-bold tracking-tighter">Worker Console</h3>
              </div>
              <div className="flex-1 bg-black rounded-2xl p-6 font-mono text-xs overflow-y-auto space-y-2 border border-white/5 min-h-[400px]">
                {logs.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-white/20 italic">Waiting for system logs...</div>
                    {!isOnline && (
                      <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-yellow-200/50 text-[10px] leading-relaxed">
                        <p className="font-bold mb-1 uppercase tracking-widest">Connection Guide:</p>
                        <ol className="list-decimal ml-4 space-y-3">
                          <li>Download <code className="text-cyan-400">worker-agent.js</code> to your local machine.</li>
                          <li>
                            Run this command in your terminal:
                            <div className="mt-2 p-2 bg-black rounded border border-white/10 flex items-center justify-between">
                              <code className="text-cyan-400">node agent.js {auth.currentUser?.uid}</code>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`node agent.js ${auth.currentUser?.uid}`);
                                  toast.success('Command copied!');
                                }}
                                className="p-1 hover:bg-white/5 rounded"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </li>
                          <li>Your node will automatically register and appear online here.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={cn(
                      "border-l-2 pl-3 py-1",
                      log.includes('SUCCESS') ? "border-green-500 text-green-400/80" :
                      log.includes('FAILED') || log.includes('CRITICAL') ? "border-red-500 text-red-400/80" :
                      log.includes('EXECUTING') ? "border-yellow-500 text-yellow-400/80" :
                      "border-white/10 text-white/60"
                    )}>
                      {log}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <div className="text-[10px] text-cyan-400/80 uppercase tracking-widest font-bold">
                  Secure Execution Mode Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
