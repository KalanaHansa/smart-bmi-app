import { useState, useEffect } from 'react';
import { auth, provider } from './firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';
import axios from 'axios';
import './App.css';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [units, setUnits] = useState('metric'); // 'metric' or 'imperial'
  
  // Input states (initialized to healthy averages for immediate visualization)
  const [weight, setWeight] = useState('70'); // kg or lbs
  const [height, setHeight] = useState('170'); // cm in metric
  const [heightFt, setHeightFt] = useState('5'); // ft in imperial
  const [heightIn, setHeightIn] = useState('7'); // in in imperial

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' or 'history' (for mobile responsive tabs)
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
      // On mobile, keep the user on calculator view to review AI health tips
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
    return -90 + (percentage * 180); // Maps 10-40 BMI onto -90deg to +90deg
  };

  // Custom weight history SVG chart
  const renderHistoryChart = () => {
    if (!history || history.length === 0) return null;

    const chartData = [...history].slice(0, 7).reverse(); // oldest first, limit to 7 data points
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
      {/* Onboarding Screen if not authenticated */}
      {!user ? (
        <div className="onboarding-card">
          <div className="onboarding-header">
            <div className="logo-glow"></div>
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" width="36" height="36" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1>Smart BMI Tracker</h1>
            <p>Calculate your BMI, visualize fitness progression, and receive personalized AI wellness and nutrition plans instantly.</p>
          </div>
          
          <button onClick={handleLogin} className="login-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ display: 'block' }}>
              <path fill="currentColor" d="M23.49 12.275c0-.795-.071-1.558-.204-2.292H12.24v4.335h6.305a5.39 5.39 0 0 1-2.337 3.535v2.937h3.774c2.207-2.032 3.483-5.025 3.483-8.515zm-11.25 11.21c3.102 0 5.706-1.028 7.608-2.793l-3.774-2.937c-1.047.7-2.387 1.115-3.834 1.115-2.95 0-5.447-1.992-6.337-4.667H2.035v3.033A11.235 11.235 0 0 0 12.24 23.485zm-6.337-9.21a6.746 6.746 0 0 1 0-4.31V6.932H2.035a11.242 11.242 0 0 0 0 10.51l3.868-2.967zm6.337-9.94c1.687 0 3.201.58 4.393 1.714l3.295-3.295C17.94 1.18 15.341.5 12.24.5A11.235 11.235 0 0 0 2.035 6.932l3.868 2.967c.89-2.675 3.387-4.667 6.337-4.667z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      ) : (
        <>
          {/* Header Dashboard section */}
          <div className="header-section">
            <div className="brand-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span>Smart BMI</span>
            </div>
            
            <div className="header-actions">
              <div className="user-profile">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="user-avatar" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="user-meta">
                  <span className="user-name">{user.displayName}</span>
                  <span className="user-status">Welcome!</span>
                </div>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Log Out">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Unit Toggle and Mobile Tabs Switcher */}
          <div className="nav-controls">
            <div className="unit-toggle">
              <button 
                type="button"
                className={units === 'metric' ? 'active' : ''} 
                onClick={() => handleUnitToggle('metric')}
              >
                Metric (kg/cm)
              </button>
              <button 
                type="button"
                className={units === 'imperial' ? 'active' : ''} 
                onClick={() => handleUnitToggle('imperial')}
              >
                Imperial (lbs/in)
              </button>
            </div>

            {/* Mobile-only tab headers */}
            <div className="mobile-tabs">
              <button 
                type="button" 
                className={activeTab === 'calc' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('calc')}
              >
                Calculator
              </button>
              <button 
                type="button" 
                className={activeTab === 'history' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('history')}
              >
                Progress ({history.length})
              </button>
            </div>
          </div>

          {/* Main Content Flat Rows Dashboard */}
          
          {/* ROW 1: CALCULATOR & GAUGES */}
          <div className={`dashboard-row row-calc-gauge ${activeTab !== 'calc' ? 'mobile-hidden' : ''}`}>
            
            {/* Calculator Card */}
            <div className="dashboard-card calc-card">
              <h3>Compute BMI</h3>
              
              <form onSubmit={handleCalculate} className="bmi-form">
                
                {/* Weight Input Range Slider and Input */}
                <div className="input-group">
                  <div className="input-header">
                    <label>Weight</label>
                    <span className="input-val-badge">
                      {weight || '0'} {units === 'metric' ? 'kg' : 'lbs'}
                    </span>
                  </div>
                  
                  <div className="input-slider-row">
                    <input 
                      type="range"
                      min={units === 'metric' ? '30' : '65'}
                      max={units === 'metric' ? '180' : '400'}
                      step={units === 'metric' ? '0.5' : '1'}
                      value={weight || (units === 'metric' ? '70' : '154')}
                      onChange={(e) => setWeight(e.target.value)}
                      className="bmi-range-slider"
                    />
                    <input 
                      type="number" 
                      value={weight} 
                      onChange={(e) => setWeight(e.target.value)} 
                      required 
                      min="1"
                      placeholder="Weight"
                      className="bmi-numeric-input"
                    />
                  </div>
                </div>

                {/* Height Input Metric or Imperial Sliders */}
                <div className="input-group">
                  <div className="input-header">
                    <label>Height</label>
                    <span className="input-val-badge">
                      {units === 'metric' ? (
                        `${height || '0'} cm`
                      ) : (
                        `${heightFt || '0'} ft ${heightIn || '0'} in`
                      )}
                    </span>
                  </div>

                  {units === 'metric' ? (
                    <div className="input-slider-row">
                      <input 
                        type="range"
                        min="100"
                        max="230"
                        step="1"
                        value={height || '170'}
                        onChange={(e) => setHeight(e.target.value)}
                        className="bmi-range-slider"
                      />
                      <input 
                        type="number" 
                        value={height} 
                        onChange={(e) => setHeight(e.target.value)} 
                        required 
                        min="30"
                        placeholder="Height"
                        className="bmi-numeric-input"
                      />
                    </div>
                  ) : (
                    <div className="imperial-height-row">
                      <div className="imperial-subgroup">
                        <label className="sub-label">Feet</label>
                        <div className="input-slider-row">
                          <input 
                            type="range"
                            min="3"
                            max="8"
                            step="1"
                            value={heightFt || '5'}
                            onChange={(e) => setHeightFt(e.target.value)}
                            className="bmi-range-slider"
                          />
                          <input 
                            type="number"
                            value={heightFt}
                            onChange={(e) => setHeightFt(e.target.value)}
                            min="1"
                            max="9"
                            required
                            className="bmi-numeric-input"
                          />
                        </div>
                      </div>
                      
                      <div className="imperial-subgroup">
                        <label className="sub-label">Inches</label>
                        <div className="input-slider-row">
                          <input 
                            type="range"
                            min="0"
                            max="11"
                            step="1"
                            value={heightIn || '7'}
                            onChange={(e) => setHeightIn(e.target.value)}
                            className="bmi-range-slider"
                          />
                          <input 
                            type="number"
                            value={heightIn}
                            onChange={(e) => setHeightIn(e.target.value)}
                            min="0"
                            max="11"
                            required
                            className="bmi-numeric-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="calculate-btn">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing Health Profile...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                      </svg>
                      Get AI Personalized Advice
                    </>
                  )}           
                </button>
              </form>
            </div>

            {/* Dynamic Arc Gauge displaying Real-time or Calculated BMI */}
            <div className="dashboard-card gauge-card-wrapper">
              <h3>{result ? "Calculated BMI" : "Real-time Estimation"}</h3>
              
              <div className="gauge-container">
                <svg viewBox="0 0 200 120" className="bmi-gauge">
                  <defs>
                    <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#60a5fa" />    {/* Underweight */}
                      <stop offset="28%" stopColor="#60a5fa" />
                      <stop offset="35%" stopColor="#34d399" />   {/* Normal */}
                      <stop offset="50%" stopColor="#34d399" />
                      <stop offset="60%" stopColor="#fbbf24" />   {/* Overweight */}
                      <stop offset="75%" stopColor="#fbbf24" />
                      <stop offset="85%" stopColor="#f87171" />   {/* Obese */}
                      <stop offset="100%" stopColor="#f87171" />
                    </linearGradient>
                  </defs>
                  
                  {/* Background track arc */}
                  <path 
                    d="M 25 100 A 75 75 0 0 1 175 100" 
                    fill="none" 
                    stroke="var(--card-border)" 
                    strokeWidth="14" 
                    strokeLinecap="round" 
                  />
                  
                  {/* Gradient overlay arc */}
                  <path 
                    d="M 25 100 A 75 75 0 0 1 175 100" 
                    fill="none" 
                    stroke="url(#gauge-grad)" 
                    strokeWidth="14" 
                    strokeLinecap="round" 
                  />

                  {/* Gauge needle */}
                  {displayBmi && (
                    <g 
                      transform={`translate(100, 100) rotate(${getGaugeRotation(displayBmi)})`} 
                      className="gauge-needle-group"
                    >
                      <path d="M 0 5 L 0 -82" stroke="var(--text-main)" strokeWidth="3" strokeLinecap="round" />
                      <polygon points="-5,0 5,0 0,-15" fill="var(--text-main)" />
                      <circle cx="0" cy="0" r="9" fill="var(--primary)" stroke="var(--text-inverse)" strokeWidth="2.5" />
                      <circle cx="0" cy="0" r="3.5" fill="var(--text-inverse)" />
                    </g>
                  )}
                </svg>

                <div className="gauge-text-overlay">
                  <span className="gauge-bmi-num">{displayBmi || '--.-'}</span>
                  {displayStatus && (
                    <span className={`gauge-bmi-status ${displayStatus.toLowerCase()}`}>
                      {displayStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Legend bar tags */}
              <div className="gauge-legend">
                <span className="legend-item uw">
                  <span className="legend-dot"></span> &lt; 18.5 Under
                </span>
                <span className="legend-item n">
                  <span className="legend-dot"></span> 18.5 - 25 Healthy
                </span>
                <span className="legend-item ow">
                  <span className="legend-dot"></span> 25 - 30 Over
                </span>
                <span className="legend-item ob">
                  <span className="legend-dot"></span> 30+ Obese
                </span>
              </div>
            </div>

          </div>

          {/* ROW 2: LATEST AI ADVICE REPORT DISPLAY */}
          {result && (
            <div className={`dashboard-row row-ai-advice ${activeTab !== 'calc' ? 'mobile-hidden' : ''}`}>
              <div className="dashboard-card ai-report-card">
                <div className="ai-report-header">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ai-spark-icon">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <h4>AI Personalized Health Tips</h4>
                </div>
                <div className="ai-advice-body">
                  <p>{result.aiAdvice}</p>
                </div>
                <div className="ai-advice-disclaimer">
                  ⚠️ AI advice is intended for informational and motivational support. Please consult a health practitioner for official clinical guidelines.
                </div>
              </div>
            </div>
          )}

          {/* ROW 3: PROGRESS & GRAPH (Stats Grid and SVG Chart) */}
          {history.length > 0 && (
            <div className={`dashboard-row row-progress ${activeTab !== 'history' ? 'mobile-hidden' : ''}`}>
              
              {/* Quick Stats Column */}
              <div className="stats-section">
                <div className="stat-mini-card">
                  <span className="stat-label">Average BMI</span>
                  <span className="stat-value">{avgBmi}</span>
                  <span className="stat-sub">Across all entries</span>
                </div>
                <div className="stat-mini-card">
                  <span className="stat-label">Latest Log</span>
                  <span className="stat-value">
                    {newestRecord ? newestRecord.weight : '--'} 
                    <span className="stat-unit">{units === 'metric' ? ' kg' : ' lbs'}</span>
                  </span>
                  <span className="stat-sub">
                    {newestRecord ? new Date(newestRecord.createdAt).toLocaleDateString() : 'No entries'}
                  </span>
                </div>
                <div className="stat-mini-card">
                  <span className="stat-label">Weight Delta</span>
                  <span className={`stat-value ${progressClass}`}>
                    {progressText ? progressText.split(' ')[0] : 'Stable'} 
                    {progressText && <span className="stat-unit"> {units === 'metric' ? 'kg' : 'lbs'}</span>}
                  </span>
                  <span className="stat-sub">{progressText ? (progressText.includes('reduction') ? 'Reduced weight' : 'Added weight') : 'No change'}</span>
                </div>
              </div>

              {/* Chart Column */}
              <div className="chart-section">
                {renderHistoryChart()}
              </div>

            </div>
          )}

          {/* ROW 4: HISTORY TIMELINE LOGS LIST */}
          <div className={`dashboard-row row-history ${activeTab !== 'history' ? 'mobile-hidden' : ''}`}>
            
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

          </div>
        </>
      )}
    </div>
  );
}

export default App;