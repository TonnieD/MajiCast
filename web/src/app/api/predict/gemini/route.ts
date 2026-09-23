import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ detail: "Invalid text input" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not defined");
      return NextResponse.json({ detail: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    const systemPrompt = `You are a water safety and quality assessment expert.
Analyze the user's observation description (in English, Kiswahili, or Sheng) to assess water safety for human consumption.

Classification Rules:
1. RELEVANCE CHECK:
   - Check if the input contains water-quality observations (e.g. water appearance, color/rangi, clarity, odor/harufu, taste/ladha, turbidity, contamination, source condition, or infrastructure).
   - If the input is empty, gibberish, off-topic, or contains NO water-quality information (e.g. "This is a car", "hello world", "nani ako hapo"), DO NOT default to "Unsafe". You MUST set:
     "relevant": false,
     "verdict": "Insufficient information",
     "confidence": 0.0,
     "reason": "Input does not contain water-quality or water-source observations."

2. RELEVANT ASSESSMENTS:
   - If the input IS relevant (describes water):
     - Set "relevant": true.
     - If the description clearly indicates clean/safe drinking water, set "verdict": "Safe".
     - If the description indicates contamination, chemical smell, turbidity, brownish/greenish color, or nearby pollution, set "verdict": "Unsafe".
     - If the input IS relevant to water but is ambiguous, borderline, or lacks definitive safety clarity, preserve the precautionary principle and default "verdict" to "Unsafe" with an appropriate confidence score and explanation.

Respond with a JSON object containing exactly these fields:
{
  "relevant": boolean,
  "verdict": "Safe" | "Unsafe" | "Insufficient information",
  "confidence": float between 0.0 and 1.0,
  "reason": "one to two sentence concise explanation"
}
Respond with JSON only, no markdown, no preamble.`;

    const promptText = `${systemPrompt}\n\nObservation description:\n"${text}"`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (response.status === 429) {
      return NextResponse.json(
        { detail: "Gemini rate limit reached. Please try the Local NLP model or wait a moment before retrying." },
        { status: 429 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json({ detail: `Gemini API call failed: ${response.statusText}` }, { status: 502 });
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.error("Empty response from Gemini API:", data);
      return NextResponse.json({ detail: "Gemini API returned an empty response." }, { status: 502 });
    }

    try {
      const parsed = JSON.parse(textResponse);
      const isRelevant = Boolean(parsed.relevant);
      
      let verdict: "Safe" | "Unsafe" | "Insufficient information";
      if (!isRelevant || parsed.verdict === "Insufficient information") {
        verdict = "Insufficient information";
      } else if (parsed.verdict === "Safe") {
        verdict = "Safe";
      } else {
        // Relevant but unsafe / borderline / ambiguous
        verdict = "Unsafe";
      }

      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : (verdict === "Insufficient information" ? 0.0 : 0.5);
      const reason = typeof parsed.reason === "string" 
        ? parsed.reason 
        : (typeof parsed.reasoning === "string" ? parsed.reasoning : "");

      return NextResponse.json({
        label: verdict,
        verdict,
        relevant: verdict !== "Insufficient information",
        confidence: Number(confidence.toFixed(4)),
        reason,
        reasoning: reason,
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", textResponse, parseError);
      return NextResponse.json({ detail: "Failed to parse classification result." }, { status: 502 });
    }
  } catch (error) {
    console.error("Error in Gemini prediction route:", error);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
