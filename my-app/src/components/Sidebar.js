import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  GiHouse,
  GiVideoCamera,
  GiChatBubble,
  GiCog,
  GiPlug,
  GiChart,
  GiCalendar,
} from 'react-icons/gi';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  // Fetch user profile from backend on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get('http://localhost:5001/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data) {
          setProfile(response.data);
          localStorage.setItem('username', response.data.username);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error.response ? error.response.data : error.message);
      }
    };
    fetchUserProfile();
  }, []);

  // Use the username from profile, or fallback to empty string
  const userName = profile?.username || '';
  // Determine tagline based on admin flag; if admin true, show "Admin", otherwise "User"
  const tagline = profile ? (profile.admin ? "Admin" : "User") : "Your tagline here";

  // Generate a letter avatar from the username
  const initialLetter = useMemo(() => {
    return userName ? userName.charAt(0).toUpperCase() : 'U';
  }, [userName]);

  // Define navigation items with icons from react-icons/gi; Calendar is now enabled.
  const navItems = [
    { name: 'Dashboard', icon: <GiHouse size={20} />, enabled: true },
    { name: 'Live', icon: <GiVideoCamera size={20} />, enabled: false },
    { name: 'Conversations', icon: <GiChatBubble size={20} />, enabled: true },
    { name: 'Integration', icon: <GiPlug size={20} />, enabled: false },
    { name: 'Google Analytics', icon: <GiChart size={20} />, enabled: false },
    { name: 'Calendar', icon: <GiCalendar size={20} />, enabled: true },
    { name: 'Settings', icon: <GiCog size={20} />, enabled: true },
  ];

  // Derive active tab from the current route
  let activeItemFromRoute = '';
  if (location.pathname.includes('dashboard')) {
    activeItemFromRoute = 'Dashboard';
  } else if (location.pathname.includes('conversations')) {
    activeItemFromRoute = 'Conversations';
  } else if (location.pathname.includes('settings')) {
    activeItemFromRoute = 'Settings';
  } else if (location.pathname.includes('calendar')) {
    activeItemFromRoute = 'Calendar';
  }

  // Navigation click handler
  const handleNavClick = (item) => {
    if (item.enabled) {
      if (item.name === 'Dashboard') {
        navigate('/dashboard');
      } else if (item.name === 'Conversations') {
        navigate('/conversations');
      } else if (item.name === 'Settings') {
        navigate('/settings');
      } else if (item.name === 'Calendar') {
        navigate('/calendar');
      }
    } else {
      alert(`${item.name} feature is coming soon!`);
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
    window.location.reload();
  };

  return (
    <div className="sidebar">
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="avatar">
            {initialLetter}
          </div>
        </div>
        <div className="profile-details">
          <div className="profile-title">{userName || 'User'}</div>
          <div className="profile-subtitle">{tagline}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-section">
        {navItems.map((item) => (
          <div
            key={item.name}
            className={`nav-item ${activeItemFromRoute === item.name ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
            {!item.enabled && <span className="coming-soon">Coming Soon</span>}
          </div>
        ))}
      </nav>

      {/* Divider and Logout Button at the Bottom */}
      <div className="divider"></div>
      <div className="logout-button" onClick={handleLogout}>
        <i className="fas fa-sign-out-alt"></i>
        <span className="logout-text">Logout</span>
      </div>
    </div>
  );
};

export default Sidebar;
