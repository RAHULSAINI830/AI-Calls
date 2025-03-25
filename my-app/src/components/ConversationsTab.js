// src/components/ConversationsTab.js
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { GiRobotHelmet, GiHumanTarget } from 'react-icons/gi';
import { FaCalendarAlt, FaFilter, FaTimes } from 'react-icons/fa';
import placeholderImage from '../images/Frame 762.png';
import './ConversationsTab.css';
import { useData } from '../DataContext';

/**
 * Helper function to format a timestamp.
 * If the timestamp is 10 digits (seconds), multiply by 1000.
 * Otherwise, assume it is already in milliseconds.
 *
 * @param {number|string} timestamp - The timestamp to format.
 * @param {Object} options - Optional configuration.
 * @param {boolean} options.timeOnly - If true, returns only the time.
 * @returns {string} - Formatted date string.
 */
const formatTimestamp = (timestamp, { timeOnly = false } = {}) => {
  const ts = Number(timestamp);
  const tsStr = ts.toString();
  const date = tsStr.length === 10 ? new Date(ts * 1000) : new Date(ts);
  return timeOnly ? date.toLocaleTimeString() : date.toLocaleString();
};

const ConversationsTab = () => {
  // UI local state for search, filters, etc.
  const [callsSearchTerm, setCallsSearchTerm] = useState('');
  const [transcriptSearchTerm, setTranscriptSearchTerm] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Retrieve global profile and calls from DataContext.
  const { profile, calls } = useData();
  const adminModelId = profile ? profile.model_id : null;

  // Persist selected call in sessionStorage.
  const [selectedCall, setSelectedCall] = useState(() => {
    const stored = sessionStorage.getItem('selectedCall');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (selectedCall) {
      sessionStorage.setItem('selectedCall', JSON.stringify(selectedCall));
    } else {
      sessionStorage.removeItem('selectedCall');
    }
  }, [selectedCall]);

  // Update audio currentTime state.
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [selectedCall]);

  // Filter calls based on search term and date range.
  const filteredCalls = calls
    ? calls.filter(call => {
        let match = true;
        if (callsSearchTerm) {
          match =
            match &&
            call.phone_number_from
              .toLowerCase()
              .includes(callsSearchTerm.toLowerCase());
        }
        if (startDate && endDate) {
          const callDate = new Date(call.start_time);
          const sDate = new Date(startDate);
          const eDate = new Date(endDate);
          // Include the full end day
          eDate.setDate(eDate.getDate() + 1);
          match = match && callDate >= sDate && callDate < eDate;
        }
        return match;
      })
    : [];

  // Handle sort filter presets.
  const handleSortFilterChange = filter => {
    const today = new Date();
    let sDate = '';
    let eDate = '';
    if (filter === '30') {
      sDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      eDate = today;
    } else if (filter === '90') {
      sDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      eDate = today;
    } else if (filter === 'lastMonth') {
      const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      sDate = new Date(year, month, 1);
      eDate = new Date(year, month + 1, 0);
    } else {
      sDate = '';
      eDate = '';
    }
    if (sDate && eDate) {
      const formatDate = date => date.toISOString().split('T')[0];
      setStartDate(formatDate(sDate));
      setEndDate(formatDate(eDate));
    } else {
      setStartDate('');
      setEndDate('');
    }
    setShowSortFilter(false);
  };

  const toggleDateFilter = () => {
    if (showDateFilter) {
      setStartDate('');
      setEndDate('');
    }
    setShowDateFilter(!showDateFilter);
  };

  // Render transcript with keyword highlighting.
  const renderTranscript = () => {
    if (!selectedCall) return null;
    const transcript = selectedCall.transcript || '';
    const lines = transcript.split('\n').filter(line => line.trim() !== '');
    const filteredLines = transcriptSearchTerm
      ? lines.filter(line =>
          line.toLowerCase().includes(transcriptSearchTerm.toLowerCase())
        )
      : lines;
    let activeLineIndex = -1;
    if (audioRef.current && audioRef.current.duration && filteredLines.length > 0) {
      activeLineIndex = Math.floor(
        (currentTime / audioRef.current.duration) * filteredLines.length
      );
    }
    return filteredLines.map((line, index) => {
      const trimmed = line.trim();
      let speaker = 'bot';
      if (trimmed.toLowerCase().startsWith('human:')) {
        speaker = 'human';
      }
      let message = trimmed;
      if (trimmed.toLowerCase().startsWith('human:')) {
        message = trimmed.substring(6).trim();
      } else if (trimmed.toLowerCase().startsWith('bot:')) {
        message = trimmed.substring(4).trim();
      }
      // Highlight search keyword if provided.
      if (transcriptSearchTerm) {
        const regex = new RegExp(`(${transcriptSearchTerm})`, 'gi');
        // Split the message by the keyword and intersperse highlight spans.
        message = message.split(regex).map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="highlight">
              {part}
            </span>
          ) : (
            part
          )
        );
      }
      return (
        <div
          key={index}
          className={`transcript-line ${speaker} ${index === activeLineIndex ? 'active-line' : ''}`}
        >
          <div className="speaker-icon">
            {speaker === 'bot' ? (
              <GiRobotHelmet size={24} color="#1890ff" />
            ) : (
              <GiHumanTarget size={24} color="#ff4d4f" />
            )}
          </div>
          <div className="message-content">
            <div className="message-text">{message}</div>
            <div className="message-timestamp">
              <span className="green-dot"></span>
              <span>{formatTimestamp(selectedCall.start_time, { timeOnly: true })}</span>
            </div>
          </div>
        </div>
      );
    });
  };

  // Show a loading state if calls data is not yet available.
  if (!calls) {
    return (
      <div className="conversations-tab">
        <Sidebar />
        <div className="conversations-main">
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Handle call selection; toggle selection.
  const handleCallSelection = call => {
    if (selectedCall && selectedCall.call_id === call.call_id) {
      setSelectedCall(null);
    } else {
      setSelectedCall(call);
    }
  };

  return (
    <div className="conversations-tab">
      <Sidebar />
      <div className="conversations-main">
        {/* Transcript Panel */}
        <div className="transcript-panel">
          {selectedCall ? (
            <>
              <div className="transcript-header">
                <div className="phone-number">
                  <strong>{selectedCall.phone_number_from}</strong>
                </div>
                <div className="tags-datetime">
                  <span className="call-datetime">
                    {formatTimestamp(selectedCall.start_time)}
                  </span>
                </div>
              </div>
              {selectedCall.recording_url && (
                <div className="audio-player">
                  <audio
                    ref={audioRef}
                    controls
                    style={{ width: '100%' }}
                    src={selectedCall.recording_url}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              <div className="transcript-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search for Keywords."
                  value={transcriptSearchTerm}
                  onChange={e => setTranscriptSearchTerm(e.target.value)}
                />
              </div>
              <div className="transcript-content">{renderTranscript()}</div>
            </>
          ) : (
            <div className="no-selection">
              <img
                src={placeholderImage}
                alt="Please select a conversation"
                className="placeholder-image"
              />
            </div>
          )}
        </div>

        {/* Conversations Panel */}
        <div className="calls-panel">
          <div className="calls-header">
            <h1>Conversations</h1>
            <div className="calls-header-actions">
              <div className="calls-search-bar">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search for Caller Id."
                  value={callsSearchTerm}
                  onChange={e => setCallsSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="date-picker-btn"
                onClick={toggleDateFilter}
                title="Filter by Date"
              >
                <FaCalendarAlt />
              </button>
              <button
                className="sort-btn"
                onClick={() => setShowSortFilter(!showSortFilter)}
                title="Preset Date Filters"
              >
                <FaFilter />
              </button>
              {showSortFilter && (
                <div className="sort-dropdown">
                  <button onClick={() => handleSortFilterChange('30')}>
                    Last 30 Days
                  </button>
                  <button onClick={() => handleSortFilterChange('90')}>
                    Last 90 Days
                  </button>
                  <button onClick={() => handleSortFilterChange('lastMonth')}>
                    Last Month
                  </button>
                  <button onClick={() => handleSortFilterChange('')}>
                    Clear
                  </button>
                </div>
              )}
            </div>
            {showDateFilter && (
              <div className="date-filter">
                <div className="date-input">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <button
                  className="icon-btn close-btn"
                  onClick={() => setShowDateFilter(false)}
                  title="Close Date Filter"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
          <div className="calls-list">
            {filteredCalls.length ? (
              filteredCalls.map(call => (
                <div
                  key={call.call_id}
                  className={`call-card ${
                    selectedCall && selectedCall.call_id === call.call_id
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => handleCallSelection(call)}
                >
                  <div className="audio-btn">
                    {selectedCall && selectedCall.call_id === call.call_id ? (
                      <i className="fas fa-pause"></i>
                    ) : (
                      <i className="fas fa-play"></i>
                    )}
                  </div>
                  <div className="call-info">
                    <div className="call-number">
                      <strong>{call.phone_number_from}</strong>
                    </div>
                    <div className="call-timestamp">
                      {formatTimestamp(call.start_time)}
                    </div>
                    <div className="call-summary">
                      {call.transcript
                        ? call.transcript.substring(0, 50) +
                          (call.transcript.length > 50 ? '...' : '')
                        : 'No transcript available.'}
                    </div>
                  </div>
                  <div className="call-checkbox">
                    <input type="checkbox" />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', padding: '20px' }}>
                {adminModelId
                  ? 'No conversations found for your model ID.'
                  : 'No model ID set for this admin.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsTab;
