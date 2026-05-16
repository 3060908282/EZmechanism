import { spawn } from "child_process";

const PORT = 3002;

// Start the Python Flask server
const python = spawn("python3", ["server.py"], {
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, PORT: PORT.toString() },
});

python.on("error", (err) => {
  console.error("Failed to start Python server:", err);
});

python.on("close", (code) => {
  console.log(`Python server exited with code ${code}`);
});

console.log(`MechFind service starting on port ${PORT}`);
