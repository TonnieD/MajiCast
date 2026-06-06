import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Robust CSV parser handling quotes and newlines
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentLine.push(currentField.trim());
      lines.push(currentLine.join("\x1F"));
      currentLine = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine.join("\x1F"));
  }

  if (lines.length === 0) return [];
  
  const headers = lines[0].split("\x1F");
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\x1F");
    if (values.length !== headers.length) continue;
    
    // Ignore completely empty lines
    if (values.every(v => v === "")) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    result.push(row);
  }

  return result;
}

// Helper to find the CSV file in various possible build/runtime paths
function getCSVPath(): string {
  const paths = [
    path.join(process.cwd(), "data", "processed", "environmental.csv"),  // Docker volume mount
    path.join(process.cwd(), "..", "data", "processed", "environmental.csv"),
    path.join(process.cwd(), "web", "..", "data", "processed", "environmental.csv"),
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error(`Could not locate environmental.csv. Searched:\n${paths.join("\n")}`);
}

const REQUIRED_FEATURES = [
  "water_source_clean", "water_source_category", "water_tech_clean",
  "clean_adm1", "clean_adm2", "clean_adm3", "status_clean",
  "distance_to_primary", "distance_to_secondary", "distance_to_tertiary",
  "distance_to_city", "distance_to_town", "local_population", "served_population",
  "crucialness", "pressure", "staleness_score", "latitude", "longitude",
  "chirps_30_precipitation", "ndvi_30_NDVI", "lst_30_LST_Day_1km", "pop_population"
];

// Helper mapping code-defined risk integer to string label
function getRiskLabel(risk: number): string {
  switch (risk) {
    case 0: return "Safe Quality";
    case 1: return "Low Risk";
    case 2: return "Medium Risk";
    case 3: return "High Risk";
    default: return "Unknown";
  }
}

export async function GET() {
  try {
    const csvPath = getCSVPath();
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const parsed = parseCSV(fileContent);

    // Format data slightly to align with expected frontend types
    const formatted = parsed.map((row, idx) => {
      const riskScore = parseFloat(row.risk_score);
      // Let's deduce predicted_risk from risk_score (in Streamlit, risk_score is predicted_risk)
      // Wait, in the CSV row, risk_score is the XGBoost prediction (0, 1, 2, or 3).
      // Let's compute a continuous quality_score from it as done in Streamlit:
      // quality_score = (1 - predicted_risk / 3 * 0.75) * 100
      const predictedRiskVal = isNaN(riskScore) ? 0 : Math.round(riskScore);
      const qualityScore = parseFloat(((1 - predictedRiskVal / 3 * 0.75) * 100).toFixed(1));
      
      return {
        id: row.water_point_id || `point-${idx}`,
        water_source_clean: row.water_source_clean || "Unknown",
        water_source_category: row.water_source_category || "Unknown",
        water_tech_clean: row.water_tech_clean || "Unknown",
        clean_adm1: row.clean_adm1 || "Unknown",
        clean_adm2: row.clean_adm2 || "Unknown",
        clean_adm3: row.clean_adm3 || "",
        status_clean: row.status_clean || "Unknown",
        distance_to_primary: parseFloat(row.distance_to_primary) || 0,
        distance_to_secondary: parseFloat(row.distance_to_secondary) || 0,
        distance_to_tertiary: parseFloat(row.distance_to_tertiary) || 0,
        distance_to_city: parseFloat(row.distance_to_city) || 0,
        distance_to_town: parseFloat(row.distance_to_town) || 0,
        local_population: parseFloat(row.local_population) || 0,
        served_population: parseFloat(row.served_population) || 0,
        crucialness: parseFloat(row.crucialness) || 0,
        pressure: parseFloat(row.pressure) || 0,
        staleness_score: parseFloat(row.staleness_score) || 0,
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
        chirps_30_precipitation: parseFloat(row.chirps_30_precipitation) || 0,
        ndvi_30_NDVI: parseFloat(row.ndvi_30_NDVI) || 0,
        lst_30_LST_Day_1km: parseFloat(row.lst_30_LST_Day_1km) || 0,
        pop_population: parseFloat(row.pop_population) || 0,
        predicted_risk: predictedRiskVal,
        risk_label: getRiskLabel(predictedRiskVal),
        risk_score: qualityScore // higher score = better quality
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("GET /api/data error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length === 0) {
      return NextResponse.json({ success: false, error: "Uploaded file is empty." }, { status: 400 });
    }

    // Check if the file has all required features
    const headers = Object.keys(parsed[0]);
    const missing = REQUIRED_FEATURES.filter(f => !headers.includes(f));

    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Uploaded file is missing required columns: ${missing.join(", ")}`
      }, { status: 400 });
    }

    // Call inference service to generate predictions
    const backendUrl = process.env.INFERENCE_API_URL || process.env.NEXT_PUBLIC_INFERENCE_API_URL || "http://localhost:8000";
    
    // Structure rows for FastAPI model
    const inferenceRows = parsed.map(row => {
      const item: Record<string, string | number | null> = {};
      for (const col of REQUIRED_FEATURES) {
        const val = row[col];
        if (val === "" || val === undefined || val === null) {
          item[col] = null;
        } else if (!isNaN(Number(val)) && val.trim() !== "") {
          item[col] = Number(val);
        } else {
          item[col] = val;
        }
      }
      return item;
    });

    const backendRes = await fetch(`${backendUrl}/predict/environmental`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: inferenceRows }),
    });

    if (!backendRes.ok) {
      const errMsg = await backendRes.text();
      throw new Error(`Inference service error: ${errMsg}`);
    }

    const { predictions } = await backendRes.json();

    // Map predictions back to the parsed rows
    const formatted = parsed.map((row, idx) => {
      const pred = predictions[idx] || { predicted_risk: 0, risk_label: "Safe Quality", risk_score: 100.0 };
      return {
        id: row.water_point_id || `uploaded-point-${idx}`,
        water_source_clean: row.water_source_clean || "Unknown",
        water_source_category: row.water_source_category || "Unknown",
        water_tech_clean: row.water_tech_clean || "Unknown",
        clean_adm1: row.clean_adm1 || "Unknown",
        clean_adm2: row.clean_adm2 || "Unknown",
        clean_adm3: row.clean_adm3 || "",
        status_clean: row.status_clean || "Unknown",
        distance_to_primary: parseFloat(row.distance_to_primary) || 0,
        distance_to_secondary: parseFloat(row.distance_to_secondary) || 0,
        distance_to_tertiary: parseFloat(row.distance_to_tertiary) || 0,
        distance_to_city: parseFloat(row.distance_to_city) || 0,
        distance_to_town: parseFloat(row.distance_to_town) || 0,
        local_population: parseFloat(row.local_population) || 0,
        served_population: parseFloat(row.served_population) || 0,
        crucialness: parseFloat(row.crucialness) || 0,
        pressure: parseFloat(row.pressure) || 0,
        staleness_score: parseFloat(row.staleness_score) || 0,
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
        chirps_30_precipitation: parseFloat(row.chirps_30_precipitation) || 0,
        ndvi_30_NDVI: parseFloat(row.ndvi_30_NDVI) || 0,
        lst_30_LST_Day_1km: parseFloat(row.lst_30_LST_Day_1km) || 0,
        pop_population: parseFloat(row.pop_population) || 0,
        predicted_risk: pred.predicted_risk,
        risk_label: pred.risk_label,
        risk_score: pred.risk_score
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("POST /api/data error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
