import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ detail: "Invalid text input" }, { status: 400 });
    }

    let backendUrl = process.env.INFERENCE_API_URL || process.env.NEXT_PUBLIC_INFERENCE_API_URL || "http://localhost:8000";
    if (backendUrl.startsWith("/")) {
      const host = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : `http://${req.headers.get("host") || "localhost:3000"}`;
      backendUrl = `${host}${backendUrl}`;
    }

    const response = await fetch(`${backendUrl}/predict/nlp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Local NLP Inference API error:", errorText);
      return NextResponse.json({ detail: `Inference service call failed: ${response.statusText}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in local NLP prediction route:", error);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
