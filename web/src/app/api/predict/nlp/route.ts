import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let backendUrl = process.env.INFERENCE_API_URL || process.env.NEXT_PUBLIC_INFERENCE_API_URL || "http://localhost:8000";

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ detail: "Invalid text input" }, { status: 400 });
    }

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
  } catch (error: unknown) {
    console.error("Error in local NLP prediction route:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        detail: `Could not connect to the Local NLP inference service at ${backendUrl}. Ensure the FastAPI server is running (e.g. 'uvicorn main:app --port 8000'). [${msg}]`,
      },
      { status: 503 }
    );
  }
}
