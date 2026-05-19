import { useState, useEffect } from 'react';
import { auth, provider } from './firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';
import axios from 'axios';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Fetch history
  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.get('http://localhost:5000/api/bmi/history', {
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
  };

  // Submit Data to Backend
  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please log in first!");

    setLoading(true);

    try {
      // 1. Get the JWT token from Firebase
      const token = await user.getIdToken();

      // 2. Send the request with the token in the headers
      const response = await axios.post('http://localhost:5000/api/bmi/calculate', 
        { weight: Number(weight), height: Number(height) },
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      setResult(response.data);
      fetchHistory();
    } catch (error) {
      console.error("Error calculating BMI", error);
      alert("Failed to get AI advice. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

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

      {/* History Display */}
      {user && history.length > 0 && (
        <div className="history-dashboard">
          <h3>Your BMI History</h3>
          <div className="history-grid">
            {history.map((record) => (
              <div key={record._id} className="history-card">
                <div className="history-header">
                  <span className="date">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`status-badge ${record.status.toLowerCase()}`}>
                    {record.status}
                  </span>
                </div>
                <div className="history-metrics">
                  <p><strong>BMI:</strong> {record.bmi}</p>
                  <p><strong>Weight:</strong> {record.weight} kg</p>
                  <p><strong>Height:</strong> {record.height} cm</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;