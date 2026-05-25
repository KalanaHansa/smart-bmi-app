import { useState, useEffect } from 'react';
import { auth, provider } from './firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';
import axios from 'axios';
import './App.css';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [units, setUnits] = useState('metric'); 
  
  const [weight, setWeight] = useState('70'); // kg or lbs
  const [height, setHeight] = useState('170'); // cm in metric
  const [heightFt, setHeightFt] = useState('5'); // ft in imperial
  const [heightIn, setHeightIn] = useState('7'); // in in imperial

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('calc');
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // Set auth state observer on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch history
  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.get(`${BASE_URL}/api/bmi/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [user]);

  // Handle Google Login
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error("Login Failed", error);
      alert("Failed to log in with Google.");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setResult(null);
    setHistory([]);
  };

  // Unit Converter logic
  const handleUnitToggle = (targetUnit) => {
    if (targetUnit === units) return;

    if (targetUnit === 'imperial') {
      // Metric -> Imperial
      if (weight) {
        const lbs = Math.round(Number(weight) * 2.20462);
        setWeight(lbs.toString());
      }
      if (height) {
        const totalInches = Number(height) / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        setHeightFt(ft.toString());
        setHeightIn(inches.toString());
      }
    } else {
      // Imperial -> Metric
      if (weight) {
        const kg = Math.round((Number(weight) / 2.20462) * 10) / 10;
        setWeight(kg.toString());
      }
      const ftVal = Number(heightFt) || 0;
      const inVal = Number(heightIn) || 0;
      if (ftVal || inVal) {
        const totalInches = (ftVal * 12) + inVal;
        const cm = Math.round(totalInches * 2.54);
        setHeight(cm.toString());
      }
    }
    setUnits(targetUnit);
  };

  // Retrieve metric values for database saving and math
  const getMetricValues = () => {
    let wKg = 0;
    let hCm = 0;

    if (units === 'metric') {
      wKg = Number(weight) || 0;
      hCm = Number(height) || 0;
    } else {
      wKg = (Number(weight) || 0) / 2.20462;
      const ftVal = Number(heightFt) || 0;
      const inVal = Number(heightIn) || 0;
      const totalInches = (ftVal * 12) + inVal;
      hCm = totalInches * 2.54;
    }
    return { wKg: Math.round(wKg * 10) / 10, hCm: Math.round(hCm) };
  };

  // Live client-side calculation
  const { wKg, hCm } = getMetricValues();
  const liveBmi = wKg && hCm ? parseFloat((wKg / ((hCm / 100) * (hCm / 100))).toFixed(1)) : null;

  let liveStatus = '';
  if (liveBmi) {
    if (liveBmi < 18.5) liveStatus = 'Underweight';
    else if (liveBmi >= 18.5 && liveBmi < 25) liveStatus = 'Normal';
    else if (liveBmi >= 25 && liveBmi < 30) liveStatus = 'Overweight';
    else liveStatus = 'Obese';
  }

  // Submit to Backend
  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please log in first!");

    setLoading(true);
    const { wKg: subWeight, hCm: subHeight } = getMetricValues();

    try {
      const token = await user.getIdToken();
      const response = await axios.post(`${BASE_URL}/api/bmi/calculate`, 
        { weight: Number(subWeight), height: Number(subHeight) },
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setResult(response.data);
      fetchHistory();
      setActiveTab('calc');
    } catch (error) {
      console.error("Error calculating BMI", error);
      alert("Failed to get AI advice. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Convert custom coordinates for SVG Needle rotation
  const getGaugeRotation = (bmiValue) => {
    const minBmi = 10;
    const maxBmi = 40;
    const clampedBmi = Math.max(minBmi, Math.min(maxBmi, bmiValue || 18.5));
    const percentage = (clampedBmi - minBmi) / (maxBmi - minBmi);
    return -90 + (percentage * 180); 
  };

  // Custom weight history SVG chart
  const renderHistoryChart = () => {
    if (!history || history.length === 0) return null;

    const chartData = [...history].slice(0, 7).reverse(); 
    if (chartData.length < 2) {
      return (
        <div className="chart-empty-state">
          <p>Add another BMI entry to view your weight and health trend graph!</p>
        </div>
      );
    }

    const svgWidth = 500;
    const svgHeight = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const bmis = chartData.map(d => d.bmi);
    const minB = Math.max(5, Math.min(...bmis) - 2);
    const maxB = Math.max(...bmis) + 2;
    const rangeB = maxB - minB || 1;

    const points = chartData.map((d, index) => {
      const x = paddingLeft + (index / (chartData.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((d.bmi - minB) / rangeB) * chartHeight;
      return { 
        x, 
        y, 
        bmi: d.bmi, 
        date: new Date(d.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    return (
      <div className="chart-card">
        <h4>BMI Progress Trend</h4>
        <div className="chart-container">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" className="bmi-trend-chart">
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.5, 1].map((ratio, i) => {
              const y = paddingTop + ratio * chartHeight;
              const val = (maxB - ratio * rangeB).toFixed(1);
              return (
                <g key={i} className="chart-gridline">
                  <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="var(--card-border)" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fontWeight="500" fill="var(--text-muted)">{val}</text>
                </g>
              );
            })}

            {/* Area under the line */}
            <path d={areaPath} fill="url(#chart-area-grad)" />

            {/* Path line */}
            <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Nodes */}
            {points.map((p, i) => (
              <g key={i} className="chart-point-group">
                <circle cx={p.x} cy={p.y} r="5" fill="var(--card-bg)" stroke="var(--primary)" strokeWidth="3" />
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-main)" className="chart-val-label">{p.bmi}</text>
                <text x={p.x} y={svgHeight - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">{p.date}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const displayBmi = result ? result.bmi : liveBmi;
  const displayStatus = result ? result.status : liveStatus;

  // Simple statistics calculations
  const avgBmi = history.length > 0 ? (history.reduce((acc, curr) => acc + curr.bmi, 0) / history.length).toFixed(1) : null;
  const oldestRecord = history.length > 0 ? history[history.length - 1] : null;
  const newestRecord = history.length > 0 ? history[0] : null;
  
  let progressText = "";
  let progressClass = "";
  if (oldestRecord && newestRecord) {
    const diff = newestRecord.weight - oldestRecord.weight;
    if (diff < 0) {
      progressText = `${Math.abs(diff).toFixed(1)} ${units === 'metric' ? 'kg' : 'lbs'} weight reduction`;
      progressClass = "success-text";
    } else if (diff > 0) {
      progressText = `${diff.toFixed(1)} ${units === 'metric' ? 'kg' : 'lbs'} weight gain`;
      progressClass = "warning-text";
    } else {
      progressText = "Stable weight";
      progressClass = "muted-text";
    }
  }

  return (
    <div className="container">
      <h1>SMART BMI CALCULATER</h1>

      {/* Authentication UI */}
      {!user ? (
        <button onClick={handleLogin} className="login-btn">
          Sign in with Google
        </button>
      ) : (
        <div className="user-section">
          <p>Welcome, <strong>{user.displayName}</strong>!</p>
          <button onClick={handleLogout} className="logout-btn">Log Out</button>

          {/* BMI Input Form */}
          <form onSubmit={handleCalculate} className="bmi-form">
            <div className="input-group">
              <label>Weight (kg):</label>
              <input 
                type="number" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                required 
                min="10"
              />
            </div>
            <div className="input-group">
              <label>Height (cm):</label>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
                required 
                min="50"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Analyzing via AI..." : "Calculate BMI & Get AI Health Tips"}
            </button>
          </form>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="results-card">
          <h2>Your BMI: {result.bmi}</h2>
          <h3 className={`status ${result.status.toLowerCase()}`}>Status: {result.status}</h3>
          
          <div className="ai-advice">
            <h4>AI Health Plan:</h4>
            <p>{result.aiAdvice}</p>
          </div>
        </div>
      )}

              {/* Graphical line chart representation */}
              {renderHistoryChart()}

              {/* Expandable Scrollable History Logs List */}
              <div className="dashboard-card history-dashboard-card">
                <h3>BMI Entry History ({history.length})</h3>
                
                {history.length === 0 ? (
                  <div className="empty-history-state">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <p>No health logs saved yet. Submit your metrics to begin tracking your weight journey!</p>
                  </div>
                ) : (
                  <div className="history-timeline">
                    {history.map((record) => {
                      const isExpanded = expandedRecordId === record._id;
                      
                      // Convert units dynamically on the fly
                      let displayWeight = record.weight;
                      let displayHeightStr = `${record.height} cm`;
                      
                      if (units === 'imperial') {
                        displayWeight = Math.round(record.weight * 2.20462);
                        const inchesTotal = record.height / 2.54;
                        const ft = Math.floor(inchesTotal / 12);
                        const inches = Math.round(inchesTotal % 12);
                        displayHeightStr = `${ft}' ${inches}"`;
                      } else {
                        displayWeight = record.weight;
                      }

                      return (
                        <div 
                          key={record._id} 
                          className={`history-card-item ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => setExpandedRecordId(isExpanded ? null : record._id)}
                        >
                          <div className="history-card-header">
                            <div className="history-title-block">
                              <span className="history-date">
                                {new Date(record.createdAt).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric' 
                                })}
                              </span>
                              <span className="history-time">
                                {new Date(record.createdAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <span className={`status-badge ${record.status.toLowerCase()}`}>
                              {record.status}
                            </span>
                          </div>

                          <div className="history-card-metrics">
                            <div className="metric-box">
                              <span className="m-label">BMI</span>
                              <span className="m-val">{record.bmi}</span>
                            </div>
                            <div className="metric-box">
                              <span className="m-label">Weight</span>
                              <span className="m-val">{displayWeight} {units === 'metric' ? 'kg' : 'lbs'}</span>
                            </div>
                            <div className="metric-box">
                              <span className="m-label">Height</span>
                              <span className="m-val">{displayHeightStr}</span>
                            </div>
                          </div>

                          <div className="advice-toggle-indicator">
                            {isExpanded ? 'Collapse Advice ▲' : 'Show AI Advice ▼'}
                          </div>

                          {isExpanded && record.aiAdvice && (
                            <div className="history-card-advice" onClick={(e) => e.stopPropagation()}>
                              <div className="advice-label">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Saved Advice
                              </div>
                              <p>{record.aiAdvice}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
      
      {/* Sleek Modern Footer */}
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} SmartAI BMI Tracker. Intelligent Health & Nutrition companion.</p>
        <div className="footer-links">
          <span>AI Assisted Health Plan</span>
          <span className="footer-dot">•</span>
          <span>Privacy Secured</span>
          <span className="footer-dot">•</span>
          <span>Google Cloud Verified</span>
        </div>
      </footer>
    </div>
  );
}

export default App;