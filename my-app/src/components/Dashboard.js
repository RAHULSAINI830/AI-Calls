// src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FaSync } from 'react-icons/fa';
import Sidebar from './Sidebar';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [calls, setCalls] = useState([]);

  // Fetch profile data (including model_id) once
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios
      .get('http://localhost:5001/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => setProfile(response.data))
      .catch(err => console.error('Profile fetch error:', err));
  }, []);

  // Function to fetch calls data based on profile.model_id
  const fetchCalls = useCallback(() => {
    if (profile && profile.model_id) {
      axios
        .get(`https://api.synthflow.ai/v2/calls?model_id=${profile.model_id}`, {
          headers: {
            accept: 'text/plain',
            Authorization: 'Bearer 1741798049693x839210709547221000'
          }
        })
        .then(response => {
          if (
            response.data.status === 'ok' &&
            response.data.response &&
            response.data.response.calls
          ) {
            setCalls(response.data.response.calls);
          } else {
            setCalls([]);
          }
        })
        .catch(err => console.error('Calls fetch error:', err));
    }
  }, [profile]);

  // Fetch calls once profile is available
  useEffect(() => {
    if (profile && profile.model_id) {
      fetchCalls();
    }
  }, [profile, fetchCalls]);

  // Reload button handler
  const handleReload = () => {
    fetchCalls();
  };

  // Calculate metrics assuming each call object has:
  // - `duration` in seconds, and 
  // - `status` property indicating if it's completed.
  const totalCalls = calls.length;
  const totalDurationSec = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
  const totalMinutes = Math.floor(totalDurationSec / 60);
  const avgCallDuration = totalCalls > 0 ? Math.floor(totalDurationSec / totalCalls) : 0;

  // Calculate number of completed calls.
  // If your API doesn’t include a `status` field, you might assume all calls are completed:
  const completedCalls = calls.filter(call => call.status === 'completed').length;

  // Update the donut chart data to show the ratio of completed calls vs. non-completed.
  const donutData = {
    labels: ['Completed', 'Other'],
    datasets: [
      {
        data: [completedCalls, totalCalls - completedCalls],
        backgroundColor: ['#4CAF50', '#d3d3d3'],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    cutout: '70%', // Thickness of the donut
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-text">
            <h1>Dashboard</h1>
            <p>Welcome, {profile ? profile.username : 'User'}</p>
          </div>
          <button className="reload-btn" onClick={handleReload} title="Reload Data">
            <FaSync size={20} />
          </button>
        </header>
        <section className="call-stats-section">
          <div className="stats-heading">
            <h2>Calls</h2>
            <div className="legend">
              <span className="legend-circle" style={{ backgroundColor: '#4CAF50' }}></span>
              <span className="legend-text">Completed</span>
            </div>
          </div>
          <div className="stats-content">
            <div className="donut-chart">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
            <div className="metrics">
              <div className="metric">
                <p className="metric-label">Total Calls</p>
                <p className="metric-value">{totalCalls}</p>
              </div>
              
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
