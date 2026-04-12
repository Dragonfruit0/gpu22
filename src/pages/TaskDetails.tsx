import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Terminal, Clock, CheckCircle2, XCircle, Loader2, Code, Copy, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import Peer from 'peerjs';

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;

    const unsub = onSnapshot(doc(db, 'tasks', taskId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as any;
        setTask(data);

        // If task is PENDING and we are the requester, try to connect to worker
        if (data.status === 'PENDING' && data.requesterId === auth.currentUser?.uid && data.peerId) {
          initiateP2P(data);
        }
      } else {
        toast.error('Task not found');
        navigate('/dashboard');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [taskId]);

  const initiateP2P = (taskData: any) => {
    console.log('Initiating P2P connection to worker:', taskData.peerId);
    const peer = new Peer();

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      const conn = peer.connect(taskData.peerId);

      conn.on('open', () => {
        console.log('Connected to worker P2P!');
        toast.info('Connected to worker. Sending task...');
        conn.send({
          taskId: taskData.id,
          code: taskData.code,
          type: taskData.type,
          inputData: taskData.inputData
        });
      });

      conn.on('data', (data: any) => {
        console.log('Received result via P2P:', data);
        if (data.status === 'SUCCESS' || data.status === 'FAILED') {
          toast.success('Task execution completed via P2P');
          peer.destroy();
        }
      });

      conn.on('error', (err) => {
        console.error('P2P Connection Error:', err);
        // toast.error('P2P connection failed. Worker might be offline.');
      });
    });
  };

  if (loading) return <div className="flex items-center justify-center h-96 animate-pulse">Loading task...</div>;
  if (!task) return null;

  const statusColors = {
    'PENDING': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'ASSIGNED': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'EXECUTING': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    'SUCCESS': 'text-green-400 bg-green-400/10 border-green-400/20',
    'FAILED': 'text-red-400 bg-red-400/10 border-red-400/20'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border",
            statusColors[task.status as keyof typeof statusColors]
          )}>
            {task.status}
          </div>
          <h1 className="text-3xl font-bold tracking-tighter">Task {task.id.slice(0, 8)}</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/40 uppercase tracking-widest">Cost</div>
          <div className="text-xl font-bold">{task.cost} Credits</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Code Block */}
          <section className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-bold tracking-tighter">Source Code</h3>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.code);
                  toast.success('Code copied to clipboard');
                }}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-6 bg-black rounded-2xl font-mono text-sm overflow-x-auto border border-white/5 text-white/80">
              <code>{task.code}</code>
            </pre>
          </section>

          {/* Result Block */}
          <section className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-green-400" />
                <h3 className="text-xl font-bold tracking-tighter">Execution Result</h3>
              </div>
              {task.status === 'SUCCESS' && (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              )}
              {task.status === 'FAILED' && (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              {['PENDING', 'ASSIGNED', 'EXECUTING'].includes(task.status) && (
                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              )}
            </div>
            <div className="bg-black rounded-2xl p-6 font-mono text-sm border border-white/5 min-h-[200px]">
              {task.result ? (
                <pre className="text-white/90 whitespace-pre-wrap">{task.result}</pre>
              ) : task.status === 'EXECUTING' ? (
                <div className="text-cyan-500/50 animate-pulse">Worker is executing code...</div>
              ) : task.status === 'PENDING' ? (
                <div className="text-white/20 italic">Waiting for a worker to accept...</div>
              ) : (
                <div className="text-white/20 italic">No result available yet.</div>
              )}
            </div>
          </section>

          {/* Logs Block */}
          {task.logs && (
            <section className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
              <h3 className="text-xl font-bold tracking-tighter mb-6">System Logs</h3>
              <pre className="p-6 bg-black rounded-2xl font-mono text-xs overflow-x-auto border border-white/5 text-white/40">
                <code>{task.logs}</code>
              </pre>
            </section>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6">
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Created At</div>
              <div className="font-medium">{new Date(task.createdAt?.toDate()).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Execution Time</div>
              <div className="font-medium">{task.executionTime ? `${task.executionTime}ms` : 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Worker ID</div>
              <div className="font-mono text-xs text-cyan-400 truncate">{task.workerId || 'Pending...'}</div>
            </div>
            <div className="pt-6 border-t border-white/10">
              <button
                disabled={task.status !== 'SUCCESS'}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Download className="w-5 h-5" />
                Download Output
              </button>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <h4 className="font-bold mb-2">Need help?</h4>
            <p className="text-sm text-white/50 leading-relaxed">
              If your task is stuck in PENDING, it means no workers are currently available for this GPU type.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
