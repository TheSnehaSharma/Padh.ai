import { callGroq, models } from "../utils/llmClient";

export async function extractFlatTaxonomy(syllabusText: string): Promise<string[]> {
  const prompt = `
    Read this syllabus text. Output a STRICT FLAT LIST of the main overarching topics (e.g., ['Thermodynamics', 'Kinematics', 'Electromagnetism']). 
    DO NOT nest them under a single 'Physics' topic. 
    Each item in the array must be a primary sidebar category.
    Return ONLY a JSON array of strings.
    
    SYLLABUS TEXT:
    ${syllabusText.substring(0, 15000)}
  `;

  try {
    const result = await callGroq({
      messages: [{ role: "user", content: prompt }],
      model: models.GROQ_LLAMA,
      response_format: { type: "json_object" }
    });

    const text = result.choices[0].message.content || "{}";
    
    // Groq json_object mode requires returning an object, so we might get { "topics": [...] }
    // Let's handle both array and object responses
    let topicsData;
    try {
      topicsData = JSON.parse(text.trim());
    } catch (e) {
      topicsData = [];
    }
    
    let topics: string[] = [];
    if (Array.isArray(topicsData)) {
      topics = topicsData;
    } else if (topicsData && typeof topicsData === 'object') {
      // Find the first array value in the object
      const firstArray = Object.values(topicsData).find(val => Array.isArray(val));
      if (firstArray) {
        topics = firstArray as string[];
      }
    }
    
    if (Array.isArray(topics)) {
      return topics.filter(t => typeof t === 'string');
    }
    return [];
  } catch (error) {
    console.error("Taxonomy extraction failed:", error);
    return ["General Study Material"];
  }
}
