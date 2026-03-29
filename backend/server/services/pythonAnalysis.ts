import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runPythonAnalysis(topicsData: any) {
  const scriptPath = path.join(__dirname, "../scripts/analyze.py");
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", [scriptPath]);
    
    let stdout = "";
    let stderr = "";
    
    pythonProcess.stdin.write(JSON.stringify(topicsData));
    pythonProcess.stdin.end();
    
    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}: ${stderr}`);
        reject(new Error(`Python process failed: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        console.error("Failed to parse Python output:", stdout);
        reject(new Error("Failed to parse Python output"));
      }
    });
  });
}
