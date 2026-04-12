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

// Your Peer ID from the Worker Panel
const MY_PEER_ID = process.argv[2] || "YOUR_PEER_ID_HERE";
const MY_WORKER_UID = process.argv[3] || "YOUR_USER_UID_HERE";

if (MY_PEER_ID === "YOUR_PEER_ID_HERE") {
  console.error("Error: Please provide your Peer ID as the first argument.");
  process.exit(1);
}

// --- INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let isBusy = false;

const peer = new Peer(MY_PEER_ID);

peer.on('open', (id) => {
  console.log(`\x1b[36m[GPU-CHAIN]\x1b[0m Worker Agent Online. Peer ID: ${id}`);
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
    console.log(`\x1b[32m[P2P]\x1b[0m Received task data:`, data.taskId);
    await executeTask(data, conn);
  });
});

async function executeTask(taskData, conn) {
  const { taskId, code, type } = taskData;
  
  if (isBusy) return;
  isBusy = true;

  console.log(`\x1b[33m[EXEC]\x1b[0m Automatically accepting and executing task ${taskId}...`);
  
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
      console.log(`\x1b[31m[P2P]\x1b[0m Failed to send result via P2P, falling back to Firestore only.`);
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
      console.error(`\x1b[31m[ERROR]\x1b[0m Failed to finalize task in Firestore:`, err.message);
    }

    isBusy = false;
    console.log(`\x1b[36m[GPU-CHAIN]\x1b[0m Task finalized. Worker is now IDLE.`);
  });
}

function listenForTasks() {
  console.log(`\x1b[36m[GPU-CHAIN]\x1b[0m Listening for assigned tasks in Firestore...`);
  
  const q = query(
    collection(db, 'tasks'),
    where('workerId', '==', MY_WORKER_UID),
    where('status', '==', 'PENDING')
  );

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const task = { id: change.doc.id, ...change.doc.data() };
        console.log(`\x1b[35m[TASK]\x1b[0m New task assigned: ${task.id}`);
        // The requester will initiate the P2P connection based on our peerId in gpu_inventory
      }
    });
  });
}

process.on('SIGINT', () => {
  console.log("\nShutting down worker agent...");
  peer.destroy();
  process.exit();
});
