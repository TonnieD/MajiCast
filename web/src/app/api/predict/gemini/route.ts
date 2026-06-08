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

    const systemPrompt = `You are a water safety expert. Based on the observation description provided, 
assess whether the water is safe or unsafe for human consumption. 
Consider factors like color, clarity, odor, nearby activities, and infrastructure condition.
Respond with a JSON object containing exactly these fields:
{
  "label": "Safe" or "Unsafe",
  "confidence": a float between 0 and 1,
  "reasoning": a one to two sentence explanation of your assessment
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
      const label = parsed.label === "Safe" || parsed.label === "Unsafe" ? parsed.label : "Unsafe";
      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
      const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

      return NextResponse.json({
        label,
        confidence: Number(confidence.toFixed(4)),
        reasoning,
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
