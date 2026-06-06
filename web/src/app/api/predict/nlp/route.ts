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

    const prompt = `You are an expert water quality classification assistant for MajiCast, an ML-powered water quality monitoring and contamination risk prediction system in Kenya.

Analyze the following citizen report about a water point:
"${text}"

Your task is to classify this water report as "Safe" or "Unsafe".
- Classify as "Safe" if the water sounds clean, smells fine, looks clear, and there are no signs of contamination, issues, or illness.
- Classify as "Unsafe" if the water looks brown, green, murky, has a bad odor (chemical, sewage, etc.), or if people are getting sick, or if the infrastructure is damaged in a way that suggests contamination.

You MUST respond with a JSON object in the following format:
{
  "label": "Safe" | "Unsafe",
  "confidence": <float between 0.0 and 1.0 representing your confidence level>
}

Do not include any other text, markdown formatting, or explanation.`;

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
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

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

      return NextResponse.json({
        label,
        confidence: Number(confidence.toFixed(4)),
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", textResponse, parseError);
      return NextResponse.json({ detail: "Failed to parse classification result." }, { status: 502 });
    }
  } catch (error) {
    console.error("Error in NLP classification route:", error);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
