/**
 * GPU-CHAIN Local Worker Agent
 * 
 * Instructions:
 * 1. Install Node.js
 * 2. Create a folder and run: npm install peerjs firebase
 * 3. Save this file as agent.js
 * 4. Run: node agent.js
 */

const Peer = require('peerjs').Peer;
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where } = require('firebase/firestore');
const { exec } = require('child_process');
const fs = require('fs');

// --- CONFIGURATION ---
// Copy this from your firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyA4TUlrRt7fvaK4aMqDNAWaTzvtOoHTZ9A",
  authDomain: "gen-lang-client-0621030623.firebaseapp.com",
  projectId: "gen-lang-client-0621030623",
  appId: "1:417076431472:web:b656f27441acd8f1a542b5",
  firestoreDatabaseId: "ai-studio-3a6029c6-e804-48ce-a680-2d2a62260b54"
};

// Your User UID from the Worker Panel
const MY_WORKER_UID = process.argv[2] || "YOUR_USER_UID_HERE";

if (MY_WORKER_UID === "YOUR_USER_UID_HERE") {
  console.error("\x1b[31m[ERROR]\x1b[0m Please provide your User UID as the first argument.");
  console.log("Usage: node agent.js <YOUR_USER_UID>");
  process.exit(1);
}

// --- INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let isBusy = false;
let gpuDocId = null;

// Generate or use a persistent peer ID
const peer = new Peer();

peer.on('open', async (id) => {
  console.log(`\x1b[36m[GPU-CHAIN]\x1b[0m Worker Agent Online. Local Peer ID: ${id}`);
  
  // Register/Update GPU status in Firestore
  try {
    const q = query(
      collection(db, 'gpu_inventory'),
      where('ownerId', '==', MY_WORKER_UID)
    );
    
    // Find existing doc or create new one
    const { getDocs } = require('firebase/firestore');
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      gpuDocId = snapshot.docs[0].id;
      await updateDoc(doc(db, 'gpu_inventory', gpuDocId), {
        peerId: id,
        status: 'ONLINE',
        updatedAt: serverTimestamp()
      });
      console.log(`\x1b[32m[DB]\x1b[0m Existing GPU node updated.`);
    } else {
      const { addDoc } = require('firebase/firestore');
      const docRef = await addDoc(collection(db, 'gpu_inventory'), {
        ownerId: MY_WORKER_UID,
        gpuModel: "NVIDIA RTX Worker",
        vram: 24,
        pricePerTask: 100,
        peerId: id,
        status: 'ONLINE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      gpuDocId = docRef.id;
      console.log(`\x1b[32m[DB]\x1b[0m New GPU node registered.`);
    }
  } catch (err) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to register with Firestore:`, err.message);
  }

  listenForTasks();
});

peer.on('connection', (conn) => {
  console.log(`\x1b[32m[P2P]\x1b[0m Incoming connection from requester...`);
  
  if (isBusy) {
    console.log(`\x1b[31m[P2P]\x1b[0m Worker is currently busy. Rejecting task.`);
    conn.send({ status: 'FAILED', logs: 'Worker is currently busy with another task.' });
    setTimeout(() => conn.close(), 1000);
    return;
  }

  conn.on('data', async (data) => {
    if (!data || !data.taskId) return;
    console.log(`\x1b[32m[P2P]\x1b[0m Received task data for:`, data.taskId);
    await executeTask(data, conn);
  });
});

async function executeTask(taskData, conn) {
  const { taskId, code, type } = taskData;
  
  if (isBusy) return;
  isBusy = true;

  console.log(`\x1b[33m[EXEC]\x1b[0m Automatically executing task ${taskId}...`);
  
  // Update Firestore to EXECUTING immediately
  const taskRef = doc(db, 'tasks', taskId);
  try {
    await updateDoc(taskRef, {
      status: 'EXECUTING',
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to update task status:`, err.message);
  }

  const startTime = Date.now();
  
  // Create temporary file
  const fileName = `task_${taskId}.py`;
  fs.writeFileSync(fileName, code);

  // Execute locally
  exec(`python3 ${fileName}`, async (error, stdout, stderr) => {
    const executionTime = Date.now() - startTime;
    const status = error ? 'FAILED' : 'SUCCESS';
    const result = stdout || "No standard output.";
    const errorLogs = stderr || (error ? error.message : "No errors reported.");
    
    console.log(`\x1b[33m[EXEC]\x1b[0m Task ${status} in ${executionTime}ms`);

    // Cleanup
    if (fs.existsSync(fileName)) fs.unlinkSync(fileName);

    const resultData = {
      taskId,
      status,
      output: result,
      logs: errorLogs,
      executionTime
    };

    // Send back via P2P
    try {
      conn.send(resultData);
    } catch (e) {
      console.log(`\x1b[31m[P2P]\x1b[0m Failed to send result via P2P.`);
    }

    // Update Firestore
    try {
      await updateDoc(taskRef, {
        status,
        result: result,
        logs: errorLogs,
        executionTime,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Failed to finalize task:`, err.message);
    }

    isBusy = false;
    console.log(`\x1b[36m[GPU-CHAIN]\x1b[0m Task finalized. Ready for next task.`);
  });
}

function listenForTasks() {
  console.log(`\x1b[36m[GPU-CHAIN]\x1b[0m Monitoring Firestore for ${MY_WORKER_UID}...`);
  
  const q = query(
    collection(db, 'tasks'),
    where('workerId', '==', MY_WORKER_UID),
    where('status', '==', 'PENDING')
  );

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const task = { id: change.doc.id, ...change.doc.data() };
        console.log(`\x1b[35m[TASK]\x1b[0m New incoming task detected: ${task.id}`);
      }
    });
  });
}

// Clean shutdown
const shutdown = async () => {
  console.log("\n\x1b[31m[SHUTDOWN]\x1b[0m Going offline...");
  if (gpuDocId) {
    try {
      await updateDoc(doc(db, 'gpu_inventory', gpuDocId), {
        status: 'OFFLINE',
        updatedAt: serverTimestamp()
      });
      console.log("\x1b[32m[DB]\x1b[0m Status updated to OFFLINE.");
    } catch (e) {}
  }
  peer.destroy();
  process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
