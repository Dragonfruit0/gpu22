# GPU-CHAIN Setup Instructions

GPU-CHAIN is a decentralized P2P GPU compute marketplace. To use the system as a worker (GPU owner), follow these steps:

## 1. Web Setup
1. Sign in to the GPU-CHAIN web app.
2. Go to the **Worker Panel**.
3. Register your GPU by providing the model, VRAM, and your desired price per task.
4. Copy your **Peer ID** and **User UID** from the panel.

## 2. Local Worker Agent Setup
The worker agent executes tasks on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) installed.
- [Python 3](https://www.python.org/) installed (for executing Python tasks).

### Installation
1. Create a new directory for the agent:
   ```bash
   mkdir gpuchain-agent
   cd gpuchain-agent
   ```
2. Initialize and install dependencies:
   ```bash
   npm init -y
   npm install peerjs firebase
   ```
3. Download the `worker-agent.js` file from the GPU-CHAIN web app (or copy it from the project root).
4. Run the agent:
   ```bash
   node worker-agent.js <YOUR_PEER_ID> <YOUR_USER_UID>
   ```

## 3. Security Notes
- The worker agent executes code using `python3` via a subprocess.
- Ensure you run the agent in a restricted environment or virtual machine if you are concerned about security.
- The current implementation is a production-ready prototype; always validate incoming tasks.

## 4. Credit System
- 1 credit = $0.01.
- New users receive 1000 free credits ($10).
- Workers earn 100% of the task price (platform fee can be implemented via Cloud Functions).
