"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

interface WaterPoint {
  id: string;
  water_source_clean: string;
  water_source_category: string;
  water_tech_clean: string;
  clean_adm1: string;
  clean_adm2: string;
  clean_adm3: string;
  status_clean: string;
  distance_to_primary: number;
  distance_to_secondary: number;
  distance_to_tertiary: number;
  distance_to_city: number;
  distance_to_town: number;
  local_population: number;
  served_population: number;
  crucialness: number;
  pressure: number;
  staleness_score: number;
  latitude: number;
  longitude: number;
  chirps_30_precipitation: number;
  ndvi_30_NDVI: number;
  lst_30_LST_Day_1km: number;
  pop_population: number;
  predicted_risk: number;
  risk_label: string;
  risk_score: number; // continuous quality score (0 to 100, higher = better quality)
}

// Helper for Box-Muller transform to simulate normal distribution noise
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdDev * randStdNormal;
}

export default function AnalysisClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WaterPoint[]>([]);
  const [isCustom, setIsCustom] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "status" | "risk" | "trend">("all");
  
  // Search & Pagination states for Tab 1
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter states for Tab 2 & 3
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  
  // Tab 4 (Quality Trend) selection
  const [selectedPointId, setSelectedPointId] = useState<string>("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data");
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        if (result.data.length > 0) {
          setSelectedPointId(result.data[0].id);
        }
        // Initialize status and risk filters
        const statuses = Array.from(new Set<string>(result.data.map((r: WaterPoint) => r.status_clean || "Unknown")));
        setSelectedStatuses(statuses);
        setSelectedRisks(["Safe Quality", "Low Risk", "Medium Risk", "High Risk"]);
      }
    } catch (err) {
      console.error("Failed to fetch default data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleResetData = () => {
    setIsCustom(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setIsCustom(true);
        setCurrentPage(1);
        if (result.data.length > 0) {
          setSelectedPointId(result.data[0].id);
        }
        // Initialize status and risk filters for custom dataset
        const statuses = Array.from(new Set<string>(result.data.map((r: WaterPoint) => r.status_clean || "Unknown")));
        setSelectedStatuses(statuses);
        setSelectedRisks(["Safe Quality", "Low Risk", "Medium Risk", "High Risk"]);
      } else {
        setUploadError(result.error || "Upload failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during upload.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  // CSV download function
  const handleDownload = () => {
    if (data.length === 0) return;
    
    // Header names matching input columns
    const headers = [
      "water_point_id", "water_source_clean", "water_source_category", "water_tech_clean",
      "clean_adm1", "clean_adm2", "clean_adm3", "status_clean", "distance_to_primary",
      "distance_to_secondary", "distance_to_tertiary", "distance_to_city", "distance_to_town",
      "local_population", "served_population", "crucialness", "pressure", "staleness_score",
      "latitude", "longitude", "chirps_30_precipitation", "ndvi_30_NDVI", "lst_30_LST_Day_1km",
      "pop_population", "predicted_risk", "risk_score", "risk_label"
    ];

    const rows = data.map(item => [
      item.id,
      item.water_source_clean,
      item.water_source_category,
      item.water_tech_clean,
      item.clean_adm1,
      item.clean_adm2,
      item.clean_adm3,
      item.status_clean,
      item.distance_to_primary,
      item.distance_to_secondary,
      item.distance_to_tertiary,
      item.distance_to_city,
      item.distance_to_town,
      item.local_population,
      item.served_population,
      item.crucialness,
      item.pressure,
      item.staleness_score,
      item.latitude,
      item.longitude,
      item.chirps_30_precipitation,
      item.ndvi_30_NDVI,
      item.lst_30_LST_Day_1km,
      item.pop_population,
      item.predicted_risk,
      item.risk_score,
      item.risk_label
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => typeof val === "string" && val.includes(",") ? `"${val}"` : val).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", isCustom ? "custom_predicted_water_data.csv" : "majicast_water_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab 1: Paginated & Searched data
  const filteredAllData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(
      item =>
        item.id.toLowerCase().includes(query) ||
        item.clean_adm1.toLowerCase().includes(query) ||
        item.clean_adm2.toLowerCase().includes(query) ||
        item.water_source_clean.toLowerCase().includes(query) ||
        item.status_clean.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredAllData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAllData.slice(start, start + itemsPerPage);
  }, [filteredAllData, currentPage]);

  // Tab 2: Functional Status grouping
  const statusGrouping = useMemo(() => {
    const counts: Record<string, number> = {
      "Functional": 0,
      "Non-Functional": 0,
      "Decommissioned": 0,
      "Unknown": 0
    };

    data.forEach(item => {
      const status = (item.status_clean || "").trim().toLowerCase();
      if (status.includes("non-functional") || status.includes("non functional")) {
        counts["Non-Functional"]++;
      } else if (status.includes("functional")) {
        counts["Functional"]++;
      } else if (status.includes("abandoned") || status.includes("decommissioned")) {
        counts["Decommissioned"]++;
      } else {
        counts["Unknown"]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, count: value }));
  }, [data]);

  // Filtered status data table
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      const status = (item.status_clean || "").trim();
      set.add(status || "Unknown");
    });
    return Array.from(set);
  }, [data]);



  const filteredStatusData = useMemo(() => {
    return data.filter(item => selectedStatuses.includes(item.status_clean || "Unknown"));
  }, [data, selectedStatuses]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Tab 3: Risk Analysis grouping (Avg Risk Score by Region/clean_adm1)
  const regionRiskGrouping = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    data.forEach(item => {
      const region = item.clean_adm1 || "Unknown";
      if (!sums[region]) {
        sums[region] = { total: 0, count: 0 };
      }
      sums[region].total += item.risk_score;
      sums[region].count++;
    });

    return Object.entries(sums).map(([name, val]) => ({
      name,
      average: Math.round(val.total / val.count * 10) / 10
    })).sort((a, b) => b.average - a.average);
  }, [data]);

  // Filtered risk level table
  const availableRiskLevels = ["Safe Quality", "Low Risk", "Medium Risk", "High Risk"];
  


  const filteredRiskData = useMemo(() => {
    return data.filter(item => selectedRisks.includes(item.risk_label));
  }, [data, selectedRisks]);

  const handleRiskToggle = (risk: string) => {
    setSelectedRisks(prev =>
      prev.includes(risk) ? prev.filter(r => r !== risk) : [...prev, risk]
    );
  };

  // Tab 4: Quality Trend Simulation
  const selectedPoint = useMemo(() => {
    return data.find(p => p.id === selectedPointId) || null;
  }, [data, selectedPointId]);

  const trendData = useMemo(() => {
    if (!selectedPoint) return [];
    
    const days = 30;
    const points = [];
    const baseQuality = selectedPoint.risk_score;
    
    // Simulate linear trend and Box-Muller random walk noise just like Streamlit code
    // trend runs from -10 to 10 over 30 days
    // quality_trend = clip(base_quality + trend + noise, 0, 100)
    for (let i = 0; i < days; i++) {
      const factor = i / (days - 1);
      const trendVal = -10 + factor * 20; // linear from -10 to 10
      const noise = randomNormal(0, 5); // std dev of 5
      const qualityVal = Math.min(100, Math.max(0, baseQuality + trendVal + noise));
      
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      
      points.push({
        dateStr: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        quality: Math.round(qualityVal * 10) / 10
      });
    }

    return points;
  }, [selectedPoint]);

  const trendStats = useMemo(() => {
    if (trendData.length === 0) return { avg: 0, direction: "Stable" };
    const sum = trendData.reduce((acc, p) => acc + p.quality, 0);
    const avg = sum / trendData.length;
    
    // final day vs initial day trend direction
    const first = trendData[0].quality;
    const last = trendData[trendData.length - 1].quality;
    
    let direction = "Stable";
    if (last > first + 2) direction = "Improving";
    else if (last < first - 2) direction = "Declining";
    
    return {
      avg: Math.round(avg * 10) / 10,
      direction
    };
  }, [trendData]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page Header */}
      <header className="page-header">
        <div className="max-w-6xl mx-auto">
          <h1>Water Point Data Analysis</h1>
          <p>
            Explore national water point sensor records, regional risk distributions, and temporal trends.
          </p>
        </div>
      </header>

      {/* Control Strip & File Uploader */}
      <section className="bg-white border-b border-earth-400/20 py-4 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase text-forest-900 tracking-wider">
              Data Source:
            </span>
            <span
              className={`text-xs px-3 py-1.5 rounded-md font-semibold ${
                isCustom
                  ? "bg-earth-200 text-earth-700 border border-earth-300"
                  : "bg-forest-100 text-forest-800 border border-forest-200"
              }`}
            >
              {isCustom ? "Custom Uploaded Dataset" : "Default Kenya WPDx"}
            </span>

            {isCustom && (
              <button
                onClick={handleResetData}
                className="text-xs font-semibold text-forest-600 hover:text-forest-700 underline"
              >
                Reset to Default
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Custom CSV Upload */}
            <div className="flex items-center gap-2">
              <label htmlFor="csv-upload" className="sr-only">
                Upload CSV File
              </label>
              <input
                id="csv-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-semibold text-forest-800 border border-forest-700/30 px-3 py-2 rounded-md hover:bg-forest-50 transition-colors disabled:opacity-50"
              >
                {uploading ? "Analyzing..." : "Upload CSV"}
              </button>
            </div>

            {/* Download CSV */}
            <button
              onClick={handleDownload}
              disabled={loading || data.length === 0}
              className="btn-primary text-xs py-2 px-4 shadow-none hover:shadow-none"
            >
              Download Active Dataset
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="max-w-6xl mx-auto mt-2 text-xs bg-red-50 border border-red-200 text-red-800 p-2.5 rounded">
            {uploadError}
          </div>
        )}
      </section>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {loading ? (
          <div className="panel flex flex-col items-center justify-center py-20 text-forest-800">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest-700 mb-4"></div>
            <p className="font-semibold text-sm">Loading dataset analytics...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="panel text-center py-16 text-forest-800">
            <p className="font-bold text-lg mb-2">No data available</p>
            <p className="text-sm">Please upload a valid water dataset CSV to analyze.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            
            {/* Tab navigation */}
            <div className="tab-bar">
              <button
                onClick={() => setActiveTab("all")}
                className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
              >
                All Data ({data.length})
              </button>
              <button
                onClick={() => setActiveTab("status")}
                className={`tab-btn ${activeTab === "status" ? "active" : ""}`}
              >
                Functional Status
              </button>
              <button
                onClick={() => setActiveTab("risk")}
                className={`tab-btn ${activeTab === "risk" ? "active" : ""}`}
              >
                Risk Analysis
              </button>
              <button
                onClick={() => setActiveTab("trend")}
                className={`tab-btn ${activeTab === "trend" ? "active" : ""}`}
              >
                Quality Trend
              </button>
            </div>

            {/* TAB 1: ALL DATA */}
            {activeTab === "all" && (
              <div className="panel space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-forest-900 leading-tight">National Water Records</h3>
                    <p className="text-xs text-forest-600 mt-1">Showing all points. Search by ID, region, or source.</p>
                  </div>
                  <div className="w-full sm:w-64">
                    <label htmlFor="search-records" className="sr-only">
                      Search records
                    </label>
                    <input
                      id="search-records"
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="field-input text-xs py-2 px-3 placeholder-forest-700/40"
                    />
                  </div>
                </div>

                {filteredAllData.length === 0 ? (
                  <div className="text-center py-12 text-forest-700 text-sm">
                    No matching records found.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-forest-700/10">
                      <table className="min-w-full divide-y divide-forest-700/10 text-left text-xs bg-white">
                        <thead className="bg-forest-950 text-white font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Water Point ID</th>
                            <th className="px-4 py-3">Region / County</th>
                            <th className="px-4 py-3">Source Category</th>
                            <th className="px-4 py-3">Technology</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Quality Score</th>
                            <th className="px-4 py-3 text-right">Risk Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-forest-700/5 text-forest-900 font-medium">
                          {paginatedData.map((row) => (
                            <tr key={row.id} className="hover:bg-parchment-50 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-forest-800">{row.id}</td>
                              <td className="px-4 py-3">
                                <div>{row.clean_adm1}</div>
                                <div className="text-[10px] text-forest-600 font-normal">{row.clean_adm2}</div>
                              </td>
                              <td className="px-4 py-3">{row.water_source_category}</td>
                              <td className="px-4 py-3 text-forest-700">{row.water_tech_clean}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  row.status_clean.toLowerCase().includes("functional") && !row.status_clean.toLowerCase().includes("non")
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                                }`}>
                                  {row.status_clean}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-forest-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-forest-700 h-1.5 rounded-full"
                                      style={{ width: `${row.risk_score}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-semibold">{row.risk_score}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`badge-base ${
                                  row.risk_label === "Safe Quality" ? "badge-safe" :
                                  row.risk_label === "Low Risk" ? "badge-low" :
                                  row.risk_label === "Medium Risk" ? "badge-medium" : "badge-high"
                                }`}>
                                  {row.risk_label}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-forest-600 font-medium">
                          Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAllData.length)} of {filteredAllData.length} entries
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded bg-white border border-forest-700/20 hover:bg-forest-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                          >
                            Prev
                          </button>
                          <span className="text-xs font-bold text-forest-900 px-2">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded bg-white border border-forest-700/20 hover:bg-forest-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: FUNCTIONAL STATUS */}
            {activeTab === "status" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status distribution chart */}
                <div className="panel lg:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-forest-900">Functional Status Breakdown</h3>
                    <p className="text-xs text-forest-600 mt-1">Water points categorized by operational viability.</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusGrouping} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c4a35a22" />
                        <XAxis dataKey="name" stroke="#1a3a2a" style={{ fontSize: "11px", fontWeight: 600 }} />
                        <YAxis stroke="#1a3a2a" style={{ fontSize: "11px", fontWeight: 600 }} />
                        <ChartTooltip
                          contentStyle={{ background: "#faf8f4", border: "1px solid #c4a35a88", borderRadius: "6px" }}
                          labelStyle={{ color: "#1a3a2a", fontWeight: "bold" }}
                        />
                        <Bar dataKey="count" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Filter and stats */}
                <div className="panel space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-forest-900">
                    Filter by Status
                  </h3>
                  <div className="space-y-2.5">
                    {availableStatuses.map((status) => (
                      <label key={status} className="flex items-center gap-2.5 text-xs font-semibold text-forest-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status)}
                          onChange={() => handleStatusToggle(status)}
                          className="rounded border-forest-300 text-forest-700 focus:ring-forest-600 w-4 h-4"
                        />
                        {status || "Unknown"}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Table */}
                <div className="panel lg:col-span-3 space-y-3">
                  <h4 className="text-base font-bold text-forest-900">Filtered Status Records</h4>
                  <div className="overflow-x-auto rounded-lg border border-forest-700/10 max-h-96">
                    <table className="min-w-full divide-y divide-forest-700/10 text-left text-xs bg-white">
                      <thead className="bg-forest-950 text-white font-semibold sticky top-0">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Region</th>
                          <th className="px-4 py-3">District</th>
                          <th className="px-4 py-3">Source</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-forest-700/5 text-forest-900 font-medium">
                        {filteredStatusData.map((row) => (
                          <tr key={row.id} className="hover:bg-parchment-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                            <td className="px-4 py-3">{row.clean_adm1}</td>
                            <td className="px-4 py-3">{row.clean_adm2}</td>
                            <td className="px-4 py-3 text-forest-700">{row.water_source_clean}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800">
                                {row.status_clean}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: RISK ANALYSIS */}
            {activeTab === "risk" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Region risk chart */}
                <div className="panel lg:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-forest-900">Average Quality Score by Region</h3>
                    <p className="text-xs text-forest-600 mt-1">Average sensory index (0-100) per region. Higher is safer.</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionRiskGrouping} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c4a35a22" />
                        <XAxis dataKey="name" stroke="#1a3a2a" style={{ fontSize: "11px", fontWeight: 600 }} />
                        <YAxis stroke="#1a3a2a" style={{ fontSize: "11px", fontWeight: 600 }} />
                        <ChartTooltip
                          contentStyle={{ background: "#faf8f4", border: "1px solid #c4a35a88", borderRadius: "6px" }}
                          labelStyle={{ color: "#1a3a2a", fontWeight: "bold" }}
                        />
                        <Bar dataKey="average" fill="#8b5e3c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Filter and stats */}
                <div className="panel space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-forest-900">
                    Filter by Risk Level
                  </h3>
                  <div className="space-y-2.5">
                    {availableRiskLevels.map((risk) => (
                      <label key={risk} className="flex items-center gap-2.5 text-xs font-semibold text-forest-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRisks.includes(risk)}
                          onChange={() => handleRiskToggle(risk)}
                          className="rounded border-forest-300 text-forest-700 focus:ring-forest-600 w-4 h-4"
                        />
                        {risk}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Risk Table */}
                <div className="panel lg:col-span-3 space-y-3">
                  <h4 className="text-base font-bold text-forest-900">Filtered Risk Records</h4>
                  <div className="overflow-x-auto rounded-lg border border-forest-700/10 max-h-96">
                    <table className="min-w-full divide-y divide-forest-700/10 text-left text-xs bg-white">
                      <thead className="bg-forest-950 text-white font-semibold sticky top-0">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Region</th>
                          <th className="px-4 py-3">District</th>
                          <th className="px-4 py-3">Source Category</th>
                          <th className="px-4 py-3">Quality Score</th>
                          <th className="px-4 py-3 text-right">Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-forest-700/5 text-forest-900 font-medium">
                        {filteredRiskData.map((row) => (
                          <tr key={row.id} className="hover:bg-parchment-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                            <td className="px-4 py-3">{row.clean_adm1}</td>
                            <td className="px-4 py-3">{row.clean_adm2}</td>
                            <td className="px-4 py-3 text-forest-700">{row.water_source_category}</td>
                            <td className="px-4 py-3 font-bold">{row.risk_score}/100</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`badge-base ${
                                row.risk_label === "Safe Quality" ? "badge-safe" :
                                row.risk_label === "Low Risk" ? "badge-low" :
                                row.risk_label === "Medium Risk" ? "badge-medium" : "badge-high"
                              }`}>
                                {row.risk_label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: QUALITY TREND */}
            {activeTab === "trend" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Trend line chart */}
                <div className="panel lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-forest-900">30-Day Quality Trend</h3>
                      <p className="text-xs text-forest-600 mt-1">Simulated temporal sensor drift monitoring.</p>
                    </div>
                    <div className="w-full sm:w-64">
                      <label htmlFor="water-point-select" className="sr-only">
                        Select Water Point
                      </label>
                      <select
                        id="water-point-select"
                        value={selectedPointId}
                        onChange={(e) => setSelectedPointId(e.target.value)}
                        className="field-input text-xs py-2 px-3"
                      >
                        {data.slice(0, 100).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.clean_adm2 || "Unknown"} — {p.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedPoint ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c4a35a22" />
                          <XAxis dataKey="dateStr" stroke="#1a3a2a" style={{ fontSize: "10px", fontWeight: 600 }} />
                          <YAxis stroke="#1a3a2a" style={{ fontSize: "10px", fontWeight: 600 }} domain={[0, 100]} />
                          <ChartTooltip
                            contentStyle={{ background: "#faf8f4", border: "1px solid #c4a35a88", borderRadius: "6px" }}
                          />
                          <ReferenceLine y={50} stroke="#7a1f1f" strokeDasharray="3 3" label={{ value: "Warning Threshold", fill: "#7a1f1f", fontSize: 10, position: "top" }} />
                          <Line
                            type="monotone"
                            dataKey="quality"
                            stroke="#2d6a4f"
                            strokeWidth={2.5}
                            dot={{ stroke: "#2d6a4f", strokeWidth: 1, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-forest-700 text-sm">
                      Please select a water point to view trend.
                    </div>
                  )}
                </div>

                {/* Trend summary card */}
                {selectedPoint && (
                  <div className="panel space-y-5 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-forest-900 border-b border-forest-100 pb-2">
                        Monitoring Summary
                      </h3>
                      <div>
                        <div className="text-xs text-forest-600 font-medium">Location</div>
                        <div className="text-sm font-bold text-forest-900">
                          {selectedPoint.clean_adm3 ? `${selectedPoint.clean_adm3}, ` : ""}
                          {selectedPoint.clean_adm2}, {selectedPoint.clean_adm1}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-forest-600 font-medium">Base Index</div>
                          <div className="text-lg font-extrabold text-forest-900">
                            {selectedPoint.risk_score} <span className="text-xs font-semibold text-forest-600">/ 100</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-forest-600 font-medium">Avg Trend Index</div>
                          <div className="text-lg font-extrabold text-forest-900">
                            {trendStats.avg} <span className="text-xs font-semibold text-forest-600">/ 100</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-forest-600 font-medium mb-1">Direction Direction</div>
                        <span className={`badge-base ${
                          trendStats.direction === "Improving" ? "badge-safe" :
                          trendStats.direction === "Declining" ? "badge-high" : "badge-low"
                        }`}>
                          {trendStats.direction === "Improving" ? "Improving" :
                           trendStats.direction === "Declining" ? "Declining" : "Stable"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-parchment-50 border border-earth-400/10 p-3.5 rounded text-xs text-forest-800 leading-relaxed font-medium">
                      Simulated 30-day temporal assessment based on the initial XGBoost predictions, adding daily environmental temperature drift and sensor precipitation noise.
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="max-w-6xl mx-auto">
          <p>&copy; 2025 MajiCast. Data sourced from WPDx and other public datasets.</p>
        </div>
      </footer>
    </div>
  );
}
