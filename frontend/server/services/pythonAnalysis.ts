export async function runPythonAnalysis(topicsData: any) {
  try {
    const results = [];
    for (const t of topicsData) {
      const pyqs = t.pyqs || [];
      const count = pyqs.length;
      const importance = count >= 3 ? "High" : count > 0 ? "Medium" : "Low";
      const frequency = count * 20;
      
      results.push({
        topic: t.name,
        stats: {
          count,
          importance,
          frequency,
          avg_marks: count > 0 ? "5-10" : "N/A"
        }
      });
    }
    return results;
  } catch (error: any) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}
