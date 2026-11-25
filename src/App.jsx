
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Brain, Activity, Layers, Target, MessageSquare,
  ChartColumn, FlaskConical, ChevronDown
} from "lucide-react";

const models = [
  { id: "base", name: "Base Model", subtitle: "Original Qwen2.5-0.5B", color: "#94a3b8" },
  { id: "beta01", name: "DPO Beta 0.1", subtitle: "Aligned model", color: "#a78bfa" },
  { id: "beta02", name: "DPO Beta 0.2", subtitle: "Aligned model", color: "#38bdf8" }
];

export default function App() {
  const [comparison, setComparison] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [comparisonResponse, summaryResponse] = await Promise.all([
          fetch("/data/model_comparison.json"),
          fetch("/data/performance_summary.csv")
        ]);

        if (!comparisonResponse.ok || !summaryResponse.ok) {
          throw new Error("Could not load experiment files. Check public/data.");
        }

        const comparisonData = await comparisonResponse.json();
        const summaryText = await summaryResponse.text();

        const summaryRows = summaryText.trim().split(/\r?\n/);
        const headers = summaryRows[0].split(",").map(x => x.trim());

        const parsedSummary = summaryRows.slice(1).map(row => {
          const values = row.split(",").map(x => x.trim());
          return Object.fromEntries(
            headers.map((header, i) => [
              header,
              Number.isFinite(Number(values[i])) && values[i] !== ""
                ? Number(values[i])
                : values[i]
            ])
          );
        });

        setComparison(Array.isArray(comparisonData)
          ? comparisonData
          : comparisonData.prompts || comparisonData.results || []);

        setSummary(parsedSummary);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const current = comparison[selectedPrompt] || {};

  const getResponse = (id) => {
    const aliases = {
      base: ["base", "base_model", "original"],
      beta01: ["dpo_beta_01", "beta_01", "beta01"],
      beta02: ["dpo_beta_02", "beta_02", "beta02"]
    };

    for (const key of aliases[id]) {
      if (typeof current[key] === "string") return current[key];
      if (current[key]?.response) return current[key].response;
      if (current[key]?.output) return current[key].output;
    }
    return "Response not found. Please check your JSON data structure.";
  };

  const chartData = useMemo(() => {
    const metrics = [
      "Helpfulness",
      "Relevance",
      "Clarity",
      "Instruction Following",
      "Factual Accuracy"
    ];

    return metrics.map(metric => {
      const row = { metric };
      models.forEach(model => {
        const found = summary.find(item =>
          String(item.Model || item.model || "").toLowerCase().replace(/[\s_-]/g, "")
          === model.name.toLowerCase().replace(/[\s_-]/g, "")
        );
        row[model.name] = found ? Number(found[metric]) : 0;
      });
      return row;
    });
  }, [summary]);

  if (loading) return <div className="loading">Loading DPO Lab dashboard...</div>;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><Brain size={28} /> <span>DPO LAB</span></div>
        <p className="side-label">WORKSPACE</p>

        <button className={activeTab === "overview" ? "nav active" : "nav"}
          onClick={() => setActiveTab("overview")}>
          <Activity size={18}/> Overview
        </button>
        <button className={activeTab === "comparison" ? "nav active" : "nav"}
          onClick={() => setActiveTab("comparison")}>
          <Layers size={18}/> Model Comparison
        </button>
        <button className={activeTab === "analytics" ? "nav active" : "nav"}
          onClick={() => setActiveTab("analytics")}>
          <ChartColumn size={18}/> Analytics
        </button>
        <button className={activeTab === "experiment" ? "nav active" : "nav"}
          onClick={() => setActiveTab("experiment")}>
          <FlaskConical size={18}/> Experiment
        </button>

        <div className="sidebar-bottom">
          <span className="status-dot"/> Experiment data dashboard
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="eyebrow">RESEARCH WORKSPACE / DPO ALIGNMENT</span>
            <h1>Model Evaluation Dashboard</h1></div>
          <div className="live-status"><span className="status-dot"/> Results loaded</div>
        </header>

        {error && <div className="error">{error}</div>}

        {activeTab === "overview" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">EXPERIMENT OVERVIEW</span>
                <h2>Understanding the impact of<br/>Direct Preference Optimization</h2>
                <p>Explore how DPO alignment compares with the original Qwen base model.</p>
              </div>
              <Brain size={76} className="welcome-icon"/>
            </section>

            <section className="model-grid">
              {models.map(model => (
                <article className="model-card" key={model.id}>
                  <div className="card-top"><span className="model-dot"
                    style={{background:model.color}}/>
                    <span>{model.id === "base" ? "BASELINE" : "DPO MODEL"}</span>
                  </div>
                  <h3>{model.name}</h3>
                  <p>{model.subtitle}</p>
                  <div className="card-bottom">Qwen2.5-0.5B architecture</div>
                </article>
              ))}
            </section>

            <section className="section-heading">
              <div><span className="eyebrow">PERFORMANCE</span><h2>Evaluation Metrics</h2></div>
              <button className="outline-button" onClick={() => setActiveTab("analytics")}>View analytics →</button>
            </section>
            <PerformanceChart data={chartData}/>

            <section className="section-heading">
              <div><span className="eyebrow">RESPONSE ANALYSIS</span><h2>Explore Model Responses</h2></div>
            </section>
            <PromptExplorer
              comparison={comparison}
              selectedPrompt={selectedPrompt}
              setSelectedPrompt={setSelectedPrompt}
              getResponse={getResponse}
              current={current}
            />
          </>
        )}

        {activeTab === "comparison" && (
          <>
            <section className="section-heading"><div>
              <span className="eyebrow">SIDE-BY-SIDE ANALYSIS</span>
              <h2>Model Response Comparison</h2>
              <p>Choose a saved prompt to compare the three model outputs.</p>
            </div></section>
            <PromptExplorer comparison={comparison}
              selectedPrompt={selectedPrompt}
              setSelectedPrompt={setSelectedPrompt}
              getResponse={getResponse} current={current}/>
          </>
        )}

        {activeTab === "analytics" && (
          <>
            <section className="section-heading"><div>
              <span className="eyebrow">QUANTITATIVE EVALUATION</span>
              <h2>Performance Analytics</h2>
              <p>Average human evaluation scores on a 1–5 scale.</p>
            </div></section>
            <PerformanceChart data={chartData}/>
            <div className="metric-note">Scores are based on the evaluation data saved from your experiments.</div>
          </>
        )}

        {activeTab === "experiment" && (
          <>
            <section className="section-heading"><div>
              <span className="eyebrow">RESEARCH DETAILS</span>
              <h2>Experiment Information</h2>
            </div></section>
            <div className="experiment-card">
              <h3><FlaskConical size={20}/> DPO Alignment Experiment</h3>
              <p><b>Base model:</b> Qwen/Qwen2.5-0.5B</p>
              <p><b>Alignment method:</b> Direct Preference Optimization (DPO)</p>
              <p><b>Experiment variants:</b> Beta 0.1 and Beta 0.2</p>
              <p><b>Evaluation:</b> Helpfulness, Relevance, Clarity, Instruction Following and Factual Accuracy</p>
              <p><b>Data source:</b> Saved model responses and evaluation results from Google Colab.</p>
            </div>
          </>
        )}

        <footer>DPO LAB · MODEL ALIGNMENT RESEARCH · QWEN2.5-0.5B</footer>
      </main>
    </div>
  );
}

function PerformanceChart({ data }) {
  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{top:15,right:15,left:0,bottom:10}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#263149"/>
          <XAxis dataKey="metric" stroke="#9aa8c1" tick={{fontSize:11}}/>
          <YAxis domain={[0,5]} stroke="#9aa8c1"/>
          <Tooltip contentStyle={{background:"#151f35",border:"1px solid #33415d",borderRadius:10}}/>
          <Legend/>
          <Bar dataKey="Base Model" fill="#94a3b8" radius={[5,5,0,0]}/>
          <Bar dataKey="DPO Beta 0.1" fill="#a78bfa" radius={[5,5,0,0]}/>
          <Bar dataKey="DPO Beta 0.2" fill="#38bdf8" radius={[5,5,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PromptExplorer({comparison, selectedPrompt, setSelectedPrompt, getResponse, current}) {
  return (
    <>
      <div className="prompt-select">
        <label htmlFor="prompt">SELECT EXPERIMENT PROMPT</label>
        <select id="prompt" value={selectedPrompt}
          onChange={e => setSelectedPrompt(Number(e.target.value))}>
          {comparison.map((item,i) => (
            <option value={i} key={i}>
              {item.prompt || item.question || `Prompt ${i+1}`}
            </option>
          ))}
        </select>
      </div>

      <div className="prompt-box">
        <span className="eyebrow">INPUT PROMPT</span>
        <p>{current.prompt || current.question || "No prompt data available."}</p>
      </div>

      <div className="response-grid">
        {models.map(model => (
          <article className="response-card" key={model.id}>
            <div className="response-heading">
              <span className="model-dot" style={{background:model.color}}/>
              <h3>{model.name}</h3>
            </div>
            <p>{getResponse(model.id)}</p>
          </article>
        ))}
      </div>
    </>
  );
}
