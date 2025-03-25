import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Sidebar from './Sidebar';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaRegCalendarAlt, 
  FaThLarge, 
  FaCalendarDay,
  FaListAlt,
  FaListUl
} from 'react-icons/fa';
import { gapi } from 'gapi-script';
import axios from 'axios';
import './CalendarTab.css';

const localizer = momentLocalizer(moment);

const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToToday = () => toolbar.onNavigate('TODAY');
  const handleViewChange = (view) => toolbar.onView(view);

  return (
    <div className="custom-toolbar">
      <div className="navigation-buttons">
        <button onClick={goToBack} className="toolbar-button" title="Previous">
          <FaChevronLeft />
        </button>
        <button onClick={goToToday} className="toolbar-button" title="Today">
          <FaRegCalendarAlt />
        </button>
        <button onClick={goToNext} className="toolbar-button" title="Next">
          <FaChevronRight />
        </button>
      </div>
      <span className="toolbar-label">{toolbar.label}</span>
      <div className="view-buttons">
        <button
          onClick={() => handleViewChange(Views.MONTH)}
          className={`toolbar-button view-button ${toolbar.view === Views.MONTH ? 'active' : ''}`}
          title="Month View"
        >
          <FaThLarge />
        </button>
        <button
          onClick={() => handleViewChange(Views.WEEK)}
          className={`toolbar-button view-button ${toolbar.view === Views.WEEK ? 'active' : ''}`}
          title="Week View"
        >
          <FaListUl />
        </button>
        <button
          onClick={() => handleViewChange(Views.DAY)}
          className={`toolbar-button view-button ${toolbar.view === Views.DAY ? 'active' : ''}`}
          title="Day View"
        >
          <FaCalendarDay />
        </button>
        <button
          onClick={() => handleViewChange(Views.AGENDA)}
          className={`toolbar-button view-button ${toolbar.view === Views.AGENDA ? 'active' : ''}`}
          title="Agenda View"
        >
          <FaListAlt />
        </button>
      </div>
    </div>
  );
};

const CalendarTab = () => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Placeholder for internal events.
  const internalEvents = [];

  // Transform Google Calendar events into BigCalendar events.
  const transformGoogleEvents = (events) => {
    return events.map(e => {
      const start = e.start.dateTime ? new Date(e.start.dateTime) : new Date(e.start.date);
      let end;
      if (e.end && e.end.dateTime) {
        end = new Date(e.end.dateTime);
      } else if (e.end && e.end.date) {
        end = new Date(e.end.date);
      } else {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      return {
        title: e.summary || 'No Title',
        start,
        end,
      };
    });
  };

  // Merge events.
  const combinedEvents = [
    ...internalEvents,
    ...(Array.isArray(googleEvents) ? transformGoogleEvents(googleEvents) : [])
  ];

  // 1. Fetch configuration from the backend.
  useEffect(() => {
    axios.get('http://localhost:5001/api/google/config')
      .then((response) => {
        setConfig(response.data);
        setConfigLoaded(true);
      })
      .catch((error) => {
        console.error('Error fetching Google config:', error);
      });
  }, []);

  // 2. Initialize gapi when config is loaded.
  useEffect(() => {
    if (config) {
      const initClient = () => {
        gapi.client.init({
          apiKey: config.API_KEY,
          clientId: config.CLIENT_ID,
          discoveryDocs: config.DISCOVERY_DOCS,
          scope: config.SCOPES,
          ux_mode: 'popup',
        })
        .then(() => {
          const authInstance = gapi.auth2.getAuthInstance();
          const signedIn = authInstance ? authInstance.isSignedIn.get() : false;
          setIsGoogleConnected(signedIn);
          if (signedIn) {
            loadGoogleCalendarEvents();
          }
          if(authInstance) {
            authInstance.isSignedIn.listen((isSignedIn) => {
              setIsGoogleConnected(isSignedIn);
              if (isSignedIn) {
                loadGoogleCalendarEvents();
              }
            });
          }
        })
        .catch((error) => {
          console.error('Error initializing GAPI client:', error);
        });
      };
      gapi.load('client:auth2', initClient);
    }
  }, [config]);

  // 3. Sign in and send tokens to backend.
  const handleGoogleSignIn = () => {
    if (!gapi.auth2) {
      console.error("Google Auth library not loaded yet.");
      return;
    }
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
      console.error("Auth instance not available. Check gapi initialization.");
      return;
    }
    authInstance.signIn()
      .then(() => {
        setIsGoogleConnected(true);
        const authResponse = authInstance.currentUser.get().getAuthResponse();
        const googleAccessToken = authResponse.access_token;
        const googleTokenExpiry = new Date(Date.now() + authResponse.expires_in * 1000);
        const googleRefreshToken = "";
        axios.post('http://localhost:5001/api/google/update', {
          googleAccessToken,
          googleRefreshToken,
          googleTokenExpiry,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(response => {
          console.log(response.data.message);
        })
        .catch(error => {
          console.error('Error saving Google tokens:', error);
        });
        loadGoogleCalendarEvents();
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);
      });
  };

  // 4. Load calendar events.
  const loadGoogleCalendarEvents = () => {
    gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: 'startTime',
    })
    .then((response) => {
      const events = response.result.items;
      setGoogleEvents(events);
    })
    .catch((error) => {
      console.error('Error loading Google Calendar events:', error);
    });
  };

  return (
    <div className="calendar-page-container">
      <Sidebar />
      <div className="calendar-main-content">
        <div className="calendar-section">
          <header className="calendar-header">
            <h1>Appointment Calendar</h1>
            <p>View your appointments and sync with your own Google Calendar.</p>
          </header>
          <BigCalendar
            localizer={localizer}
            events={combinedEvents}
            startAccessor="start"
            endAccessor="end"
            date={date}
            view={view}
            onNavigate={(newDate) => setDate(newDate)}
            onView={(newView) => setView(newView)}
            views={{ month: true, week: true, day: true, agenda: true }}
            components={{ toolbar: CustomToolbar }}
            style={{ height: '100%' }}
          />
        </div>
        <div className="tasks-section">
          <h2>My Google Calendar</h2>
          {isGoogleConnected ? (
            googleEvents.length > 0 ? (
              <ul className="google-events-list">
                {googleEvents.map((event) => (
                  <li key={event.id}>
                    <strong>{event.summary || 'No Title'}</strong>
                    <br />
                    {event.start.dateTime
                      ? new Date(event.start.dateTime).toLocaleString()
                      : event.start.date}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming events.</p>
            )
          ) : (
            // Disable the sign-in button until config is loaded.
            <button 
              onClick={handleGoogleSignIn} 
              className="google-signin-button"
              disabled={!configLoaded}
            >
              Connect to Google Calendar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarTab;
