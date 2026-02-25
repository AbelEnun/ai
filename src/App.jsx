import { useState, useRef, useMemo, useEffect } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import SearchInput from "./components/SearchInput";
import Filters from "./components/Filters";
import FlightCard from "./components/FlightCard";
import FlightDetailsModal from "./components/FlightDetailsModal";

const API_URL = "https://gckdcfk4p0.execute-api.us-east-1.amazonaws.com/dev/search";

// --- Helper Functions ---
const mapOfferToFlight = (offer, journeyType = "outbound") => {
  // Handle both formats: from FlightAgent lambda (with price) and from chatbot (with totalPrice)
  const priceAmount = offer.price || offer.totalPrice || 0;
  const currency = offer.currency || "USD";
  const durationMinutes = offer.durationMinutes || 0;
  const durationISO = offer.durationISO || `PT${Math.floor(durationMinutes / 60)}H${durationMinutes % 60}M`;

  // Extract flight number if available
  let flightNumber = "—";
  if (offer.flightNumber) {
    flightNumber = offer.flightNumber;
  } else if (offer.itineraryIds && offer.itineraryIds.length > 0) {
    // Try to extract from itineraryIds if available
    flightNumber = offer.itineraryIds[0]?.slice(-4) || "—";
  }

  return {
    id: offer.offerId || offer.id || Math.random().toString(),
    itinerary: {
      segments: [
        {
          departure: {
            iata: offer.origin || offer.departureAirport,
            at: offer.departureTime
          },
          arrival: {
            iata: offer.destination || offer.arrivalAirport,
            at: offer.arrivalTime
          },
          carrier: offer.airline,
          flightNumber: flightNumber,
          aircraft: offer.aircraft || "—",
          duration: durationISO,
        },
      ],
      totalDuration: durationISO,
    },
    price: {
      amount: priceAmount,
      currency: currency
    },
    airline: offer.airline || "Unknown Airline",
    stops: offer.stops || 0,
    durationMinutes: durationMinutes,
    journeyType: journeyType,
    cached: offer.cached || offer.provider === "cached",
    // 🔥 NEW: Round trip fields
    trip_type: offer.trip_type || "one_way",
    return_date: offer.return_date,
    returnDepartureTime: offer.returnDepartureTime || offer.returnDeparture,
    outboundDeparture: offer.outboundDeparture || offer.departureTime,
    // Keep original for reference
    _raw: offer
  };
};

export default function App() {
  const sessionId = useRef(null);

  // Initialize Session
  if (!sessionId.current) {
    const stored = localStorage.getItem("flight_session_id");
    if (stored) sessionId.current = stored;
    else {
      sessionId.current = `sess-${crypto.randomUUID()}`;
      localStorage.setItem("flight_session_id", sessionId.current);
    }
  }

  // --- Global State ---
  const [recentPlans, setRecentPlans] = useState([]);

  // --- Session State ---
  const [chatHistory, setChatHistory] = useState([]);
  const [savedFlights, setSavedFlights] = useState([]);
  const [activeTab, setActiveTab] = useState('planning');
  const [isLoading, setIsLoading] = useState(false);
  const [errorObj, setErrorObj] = useState(null);

  const [filters, setFilters] = useState({ maxStops: 'all', maxPrice: 'all' });
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('flo_dark_mode') === 'true';
  });

  // Persist dark mode and apply class on toggle
  const handleToggleDark = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('flo_dark_mode', String(next));
      return next;
    });
  };


  // Load Global Plans
  useEffect(() => {
    try {
      const stored = localStorage.getItem("flo_recent_plans");
      if (stored) setRecentPlans(JSON.parse(stored));
    } catch (e) { console.error(e); }
  }, []);

  // Load Session Data
  useEffect(() => {
    const sessId = sessionId.current;
    const storedSession = localStorage.getItem(`flo_sess_${sessId}`);
    if (storedSession) {
      try {
        const data = JSON.parse(storedSession);
        if (data.chatHistory) setChatHistory(data.chatHistory);
        if (data.savedFlights) setSavedFlights(data.savedFlights);
        if (data.filters) setFilters(data.filters);
      } catch (e) { console.error(e); }
    }
  }, []);

  /* Removed bottomRef and isAtBottomRef */
  const chatContainerRef = useRef(null);
  const prevActiveTabRef = useRef(null);
  const prevSessionIdRef = useRef(sessionId.current);

  /* handleScroll removed as it's handled inside useEffect now */

  // Robust Auto-scroll — always go to bottom when entering planning or loading a session
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) {
      prevActiveTabRef.current = activeTab;
      prevSessionIdRef.current = sessionId.current;
      return;
    }

    const lastMsg = chatHistory[chatHistory.length - 1];

    const switchedToPlanning = activeTab === 'planning' && prevActiveTabRef.current !== 'planning';
    const sessionChanged = activeTab === 'planning' && sessionId.current !== prevSessionIdRef.current;

    if (switchedToPlanning || sessionChanged) {
      // Force scroll to bottom when user navigates into planning or a new session is loaded
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      });
    } else {
      // Preserve previous smart auto-scroll behaviour
      if (lastMsg?.role === 'user' || isLoading) {
        requestAnimationFrame(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
      } else {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        if (isNearBottom) {
          requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          });
        }
      }
    }

    prevActiveTabRef.current = activeTab;
    prevSessionIdRef.current = sessionId.current;
  }, [chatHistory, isLoading, activeTab]);

  // Add touch event handling
  useEffect(() => {
    const handleTouchMove = (e) => {
      // Prevent pull-to-refresh when at top of chat
      if (chatContainerRef.current && chatContainerRef.current.scrollTop <= 0) {
        e.preventDefault();
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, []);

  // Add viewport height fix for mobile browsers
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);

    return () => window.removeEventListener('resize', setVh);
  }, []);

  // Keep the visual theme consistent by applying the `dark` class
  // to the root HTML element when dark mode is active. This ensures
  // CSS variables under `.dark` affect the whole page and prevents
  // white gaps/strips when toggling themes.
  useEffect(() => {
    try {
      if (isDarkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch (e) {
      console.error('Failed to toggle root dark class', e);
    }
  }, [isDarkMode]);

  // Save Session Helper
  const saveSessionState = (newData) => {
    const sessId = sessionId.current;
    const currentData = JSON.parse(localStorage.getItem(`flo_sess_${sessId}`) || '{}');
    const updated = { ...currentData, ...newData };
    localStorage.setItem(`flo_sess_${sessId}`, JSON.stringify(updated));
  };

  const updatePlanHistory = (origin, destination) => {
    const label = `${origin} → ${destination}`;
    const today = new Date().toLocaleDateString("en-US", { month: 'short', day: 'numeric' });

    setRecentPlans(prev => {
      const id = sessionId.current;
      const others = prev.filter(p => p.id !== id);
      const newEntry = { id, route: label, date: today, timestamp: Date.now() };
      const updated = [newEntry, ...others].slice(0, 10);
      localStorage.setItem("flo_recent_plans", JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleSave = (flight) => {
    setSavedFlights(prev => {
      const exists = prev.find(f => f.id === flight.id);
      const newSaved = exists ? prev.filter(f => f.id !== flight.id) : [...prev, flight];
      saveSessionState({ savedFlights: newSaved });
      return newSaved;
    });
  };

  const handleCardClick = (flight) => {
    setSelectedFlight(flight);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFlight(null);
  };

  const handleResetSession = () => {
    // Generate new session ID without reloading
    const oldSessId = sessionId.current;
    const newSessId = `sess-${crypto.randomUUID()}`;
    sessionId.current = newSessId;
    localStorage.setItem("flight_session_id", newSessId);
    // Clear State instantly
    setChatHistory([]);
    setSavedFlights([]);
    setFilters({ maxStops: 'all', maxPrice: 'all' });
    setErrorObj(null);
  };

  const handleLoadSession = (planId) => {
    if (planId === sessionId.current) return;
    // Load the session data from localStorage without reloading
    const storedSession = localStorage.getItem(`flo_sess_${planId}`);
    if (storedSession) {
      try {
        const data = JSON.parse(storedSession);
        sessionId.current = planId;
        localStorage.setItem("flight_session_id", planId);
        setChatHistory(data.chatHistory || []);
        setSavedFlights(data.savedFlights || []);
        setFilters(data.filters || { maxStops: 'all', maxPrice: 'all' });
        setErrorObj(null);
        setActiveTab('planning');
      } catch (e) { console.error(e); }
    }
  };

  const handleDeletePlan = (planId, e) => {
    e.stopPropagation();
    setRecentPlans(prev => {
      const updated = prev.filter(p => p.id !== planId);
      localStorage.setItem("flo_recent_plans", JSON.stringify(updated));
      return updated;
    });
    // Also remove the session data
    localStorage.removeItem(`flo_sess_${planId}`);
  };

  const handleSearch = async (query) => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);

    // Add User Message
    const userMsg = { role: 'user', text: query, id: Date.now() };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    saveSessionState({ chatHistory: updatedHistory });

    try {
      // Use the new Lambda endpoint format
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          sessionId: sessionId.current
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Parse the body if it's a string
      let body = data;
      if (data.body && typeof data.body === "string") {
        try {
          body = JSON.parse(data.body);
        } catch (e) {
          console.error("Failed to parse body:", e);
          body = data;
        }
      }

      console.log("API Response:", body); // Debug log

      if (body.type === "chat") {
        // Handle chat-only response
        const botMsg = {
          role: 'bot',
          id: Date.now() + 1,
          results: [],
          meta: {},
          message: body.message || "I couldn't find any flights."
        };
        const newHistory = [...updatedHistory, botMsg];
        setChatHistory(newHistory);
        saveSessionState({ chatHistory: newHistory });

      } else if (body.type === "results") {
        // Handle flight results
  const params = body.params || {};
  const offers = body.offers || [];

  // Extract origin and destination from params or first offer
  const origin = params.origin || (offers.length > 0 ? offers[0].origin : null);
  const destination = params.destination || (offers.length > 0 ? offers[0].destination : null);

  if (origin && destination) {
    updatePlanHistory(origin, destination);
  }

  let finalResults = [];

  if (Array.isArray(offers) && offers.length > 0) {
    // 🔥 NEW: Check if offers are already formatted as round trips
    const hasRoundTrips = offers.some(o => o.trip_type === "round_trip");
    
    if (hasRoundTrips) {
      // Backend already formatted round trips properly
      finalResults = offers.map(offer => {
        const mapped = mapOfferToFlight(offer);
        
        if (offer.trip_type === "round_trip") {
          return {
            ...mapped,
            id: offer.offerId || offer.id,
            type: "round_trip",
            outbound: {
              ...mapped,
              departureTime: offer.outboundDeparture || offer.departureTime,
              journeyType: "outbound"
            },
            returnFlight: {
              ...mapped,
              departureTime: offer.returnDepartureTime || offer.returnDeparture,
              journeyType: "return"
            },
            price: {
              amount: offer.price || offer.totalPrice || 0,
              currency: offer.currency || "USD"
            },
            stops: offer.stops || 0,
            durationMinutes: offer.durationMinutes || 0,
            airline: offer.airline || "Unknown"
          };
        }
        return mapped;
      });
    } else {
      // Fallback: Group offers by offerId to pair round-trip legs (original logic)
      const groupedByOffer = offers.reduce((acc, offer) => {
        const key = offer.offerId || offer.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(offer);
        return acc;
      }, {});

      finalResults = Object.values(groupedByOffer).map(group => {
        // If we have two legs with the same offerId, treat as round trip
        if (group.length === 2) {
          const outboundLeg = group.find(o => o.journeyType === "outbound") || group[0];
          const returnLeg = group.find(o => o.journeyType === "return") || group[1];

          return {
            id: outboundLeg.offerId || outboundLeg.id,
            type: "round_trip",
            outbound: mapOfferToFlight(outboundLeg, "outbound"),
            returnFlight: mapOfferToFlight(returnLeg, "return"),
            price: {
              amount: outboundLeg.price || outboundLeg.totalPrice || 0,
              currency: outboundLeg.currency || "USD"
            },
            stops: Math.max(outboundLeg.stops || 0, returnLeg.stops || 0),
            durationMinutes: (outboundLeg.durationMinutes || 0) + (returnLeg.durationMinutes || 0),
            airline: outboundLeg.airline === returnLeg.airline ? outboundLeg.airline : "Multiple Airlines"
          };
        }

        // Fallback for one-way or other types
        const single = group[0];
        const mapped = mapOfferToFlight(single);
        return {
          ...mapped,
          id: single.offerId || single.id,
          type: "one_way"
        };
      });
    }
  }

  // Add Bot Message with results
  const botMsg = {
    role: 'bot',
    id: Date.now() + 1,
    results: finalResults,
    meta: {
      ...params,
      // 🔥 Ensure round trip metadata is passed
      trip_type: params.trip_type,
      return_date: params.return_date
    },
    message: body.message // Use Lambda's formatted message directly
  };

  const newHistory = [...updatedHistory, botMsg];
  setChatHistory(newHistory);
  saveSessionState({ chatHistory: newHistory });

      } else {
        // Handle error or unknown response type
        const botMsg = {
          role: 'bot',
          id: Date.now() + 1,
          results: [],
          meta: {},
          message: body.error || body.message || "I couldn't find any flights."
        };
        const newHistory = [...updatedHistory, botMsg];
        setChatHistory(newHistory);
        saveSessionState({ chatHistory: newHistory });
      }

    } catch (err) {
      console.error("Search error:", err);
      const errorMsg = {
        role: 'bot',
        id: Date.now() + 1,
        results: [],
        message: "Something went wrong. Please try again."
      };
      const newHistory = [...updatedHistory, errorMsg];
      setChatHistory(newHistory);
      saveSessionState({ chatHistory: newHistory });
      setErrorObj(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="user-message-container">
          <div className="user-avatar-small">👤</div>
          <div className="user-message-bubble">
            {msg.text}
          </div>
        </div>
      );
    } else {
      return (
        <BotMessageBubble
          key={msg.id}
          msg={msg}
          savedFlights={savedFlights}
          onToggleSave={handleToggleSave}
          onCardClick={handleCardClick}
        />
      );
    }
  };

  return (
    <div className={`app-layout${isDarkMode ? ' dark' : ''}`}>
      {sidebarVisible && (
        <Sidebar
          onReset={handleResetSession}
          plans={recentPlans}
          onLoadPlan={handleLoadSession}
          onDeletePlan={handleDeletePlan}
          currentPlanId={sessionId.current}
          onToggleSidebar={() => setSidebarVisible(false)}
        />
      )}

      <main className="main-content">
        {/* Show hamburger only when sidebar is hidden */}
        {!sidebarVisible && (
          <>
            <button
              className="hamburger-btn-floating"
              onClick={() => setSidebarVisible(true)}
              aria-label="Show sidebar"
            >
              <div className="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>

            {/* floating new-plan icon when sidebar is hidden */}
            <button
              className="new-plan-btn new-plan-floating"
              onClick={handleResetSession}
              aria-label="Start a new travel plan"
              title="New plan"
            >
              <svg className="plus-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span>Start a new plan</span>
            </button>
          </>
        )}
        <div className="tabs-header">
          <div className="pill-toggle">
            <button
              className={`pill-btn ${activeTab === 'planning' ? 'active' : ''}`}
              onClick={() => setActiveTab('planning')}
            >
              Planning
            </button>
            <button
              className={`pill-btn ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              Saved
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            className="theme-toggle-btn"
            onClick={handleToggleDark}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            <div className={`theme-toggle-track${isDarkMode ? ' on' : ''}`}>
              <div className="theme-toggle-thumb" />
            </div>
            {isDarkMode ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>

        <div
          className="chat-stream"
          ref={chatContainerRef}
        >
          {activeTab === 'planning' ? (
            chatHistory.length === 0 ? (
              <div className="hero-center">
                <h1 className="hero-title">Where to next?</h1>
                <p className="hero-subtitle">Tell me your travel plans and I'll find the perfect flights for you</p>

                <div className="suggestions-label">Start with a suggestion</div>
                <div className="suggestion-cards-grid">
                  <button
                    className="suggestion-card"
                    onClick={() => handleSearch("Find flights from Addis Ababa to Dubai tomorrow cheapest")}
                  >
                    <div className="suggestion-icon-wrapper urgency">
                      <span className="suggestion-icon">⚡</span>
                    </div>
                    <div className="suggestion-content">
                      <span className="suggestion-title">Last Minute Deal</span>
                      <span className="suggestion-desc">Cheapest to Dubai tomorrow</span>
                    </div>
                  </button>

                  <button
                    className="suggestion-card"
                    onClick={() => handleSearch("Flights from London to Paris next Monday")}
                  >
                    <div className="suggestion-icon-wrapper planning">
                      <span className="suggestion-icon">🗓️</span>
                    </div>
                    <div className="suggestion-content">
                      <span className="suggestion-title">Plan Ahead</span>
                      <span className="suggestion-desc">London to Paris next week</span>
                    </div>
                  </button>

                  <button
                    className="suggestion-card"
                    onClick={() => handleSearch("Round trip from Nairobi to Jeddah next week")}
                  >
                    <div className="suggestion-icon-wrapper roundtrip">
                      <span className="suggestion-icon">🔄</span>
                    </div>
                    <div className="suggestion-content">
                      <span className="suggestion-title">Round Trip</span>
                      <span className="suggestion-desc">Nairobi to Jeddah return</span>
                    </div>
                  </button>

                  <button
                    className="suggestion-card"
                    onClick={() => handleSearch("Cheapest flights to anywhere next month")}
                  >
                    <div className="suggestion-icon-wrapper explore">
                      <span className="suggestion-icon">🌍</span>
                    </div>
                    <div className="suggestion-content">
                      <span className="suggestion-title">Explore</span>
                      <span className="suggestion-desc">Cheapest to anywhere</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map(renderMessage)}
                {isLoading && (
                  <div className="bot-message">
                    <div className="bot-header">
                      <div className="bot-avatar">✨</div>
                      <div className="loading-container">
                        <span className="loading-dots">
                          <span className="dot">.</span>
                          <span className="dot">.</span>
                          <span className="dot">.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Scroll anchor removed, using container scroll */}
              </>
            )
          ) : (
            <div className="results-card-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
              {savedFlights.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No saved flights yet. Search for flights and click the bookmark icon to save them.
                </div>
              )}
              {savedFlights.map((item, i) => (
                <FlightCard
                  key={`saved-${i}`}
                  flight={item}
                  isSaved={true}
                  onToggleSave={() => handleToggleSave(item)}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="input-area-fixed">
          <div className="input-container-inner">
            <SearchInput
              onSearch={handleSearch}
              isLoading={isLoading}
              placeholder={chatHistory.length === 0 ? "Try: 'Flights from Addis Ababa to Dubai tomorrow cheapest'" : "Ask follow up or refine your search..."}
            />
            {/* Error display removed as requested */}
          </div>
        </div>
      </main>

      {/* Flight Details Modal */}
      <FlightDetailsModal
        flight={selectedFlight}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

// --- Filter Helper ---
const applyFilters = (results, filterType, filters) => {
  let output = [...results];

  // 1. Apply user filters
  if (filters) {
    if (filters.maxStops !== 'all') {
      output = output.filter(r => {
        const stops = r.type === 'round_trip'
          ? Math.max(r.outbound?.stops || 0, r.returnFlight?.stops || 0)
          : r.stops || 0;
        return stops <= filters.maxStops;
      });
    }
    if (filters.maxPrice !== 'all') {
      output = output.filter(r => {
        const price = r.type === 'round_trip' 
          ? r.price?.amount || 0
          : r.price?.amount || 0;
        return price <= filters.maxPrice;
      });
    }
  }

  // 2. Apply sorting with round trip awareness
  switch (filterType) {
    case 'default':
      // keep backend order, do nothing
      break;
    case 'cheapest':
      output.sort((a, b) => (a.price?.amount || Infinity) - (b.price?.amount || Infinity));
      break;
    case 'fastest':
      output.sort((a, b) => {
        const durationA = a.type === 'round_trip' 
          ? (a.outbound?.durationMinutes || 0) + (a.returnFlight?.durationMinutes || 0)
          : a.durationMinutes || Infinity;
        const durationB = b.type === 'round_trip'
          ? (b.outbound?.durationMinutes || 0) + (b.returnFlight?.durationMinutes || 0)
          : b.durationMinutes || Infinity;
        return durationA - durationB;
      });
      break;
    case 'best':
      {
        // Weighted score: price (60%) + duration (40%)
        const getScore = (item) => {
          const price = item.price?.amount || 0;
          const duration = item.type === 'round_trip'
            ? (item.outbound?.durationMinutes || 0) + (item.returnFlight?.durationMinutes || 0)
            : item.durationMinutes || 0;
          return (price * 0.6) + (duration * 0.4);
        };
        output.sort((a, b) => getScore(a) - getScore(b));
      }
      break;
    default:
      // should not happen, but keep original order
      break;
  }

  return output;
};

// Sub-component for Bot Message to handle "Show more" state locally
const BotMessageBubble = ({ msg, savedFlights, onToggleSave, onCardClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [sortType, setSortType] = useState('default');
  const [localFilters, setLocalFilters] = useState({ maxStops: 'all', maxPrice: 'all' });

  if (!msg.results || msg.results.length === 0) {
    return (
      <div className="bot-message">
        <div className="bot-header">
          <div className="bot-avatar">✨</div>
          <span>{msg.message}</span>
        </div>
      </div>
    );
  }

  // Extract only the conversational header from the message
  const getConversationalHeader = (message) => {
    if (!message) return "Here are your flights:";

    // Take everything before the first numbered item or emoji flight listing
    const lines = message.split('\n');
    let header = [];

    for (const line of lines) {
      // Stop at flight listings
      if (line.match(/^\d+\./) || line.includes('**') || line.includes('💰') || line.includes('🛫')) {
        break;
      }
      if (line.trim()) {
        header.push(line.trim());
      }
    }

    return header.length > 0 ? header.join(' ') : "Here are your flights:";
  };

  // Apply Local Sort/Filter
  const processedResults = useMemo(() => {
    return applyFilters(msg.results, sortType, localFilters);
  }, [msg.results, sortType, localFilters]);

  const visibleResults = expanded ? processedResults : processedResults.slice(0, 3);
  const hiddenCount = processedResults.length - visibleResults.length;

  // Calculate min values for highlighting
  const minPrice = useMemo(() => {
    return Math.min(...msg.results.map(r => r.price?.amount || Infinity));
  }, [msg.results]);

  const minDuration = useMemo(() => {
    return Math.min(...msg.results.map(r => r.durationMinutes || Infinity));
  }, [msg.results]);

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bot-message">
      {/* Header */}
      <div className="bot-header">
        <div className="bot-avatar">✨</div>
        <div className="bot-message-content">
          <span>{getConversationalHeader(msg.message)}</span>
          {msg.meta && Object.keys(msg.meta).length > 0 && (
  <div className="meta-tags">
    {msg.meta.origin && msg.meta.destination && (
      <span className="meta-tag">
        {msg.meta.origin} → {msg.meta.destination}
      </span>
    )}
    {msg.meta.departure_date && (
      <span className="meta-tag">
        📅 {msg.meta.departure_date}
      </span>
    )}
    {/* 🔥 Improved round trip display */}
    {msg.meta.trip_type === 'round_trip' && (
      <>
        {msg.meta.return_date && (
          <span className="meta-tag">
            🔄 Return: {msg.meta.return_date}
          </span>
        )}
        <span className="meta-tag">
          ✈️ Round Trip
        </span>
      </>
    )}
    {msg.meta.is_filtered_results && (
      <span className="meta-tag">
        🔍 Filtered Results
      </span>
    )}
  </div>
)}
        </div>
      </div>

      {/* Filters UI - Only show if we have results */}
      {processedResults.length > 0 && (
        <div className="inline-filters-container">
          <Filters
            filters={localFilters}
            onFilterChange={handleFilterChange}
            sortType={sortType}
            onSortChange={setSortType}
            minPrice={0}
            maxPrice={Math.max(...msg.results.map(r => r.price?.amount || 0))}
          />
        </div>
      )}

      {/* Results Card */}
      <div className="results-card-container">
        <div className="results-content-inner">
          {visibleResults.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No flights match these filters. Try adjusting your filter settings.
            </div>
          ) : (
            visibleResults.map((item, i) => (
              <FlightCard
                key={`${msg.id}-${item.id}-${i}`}
                flight={item}
                isSaved={savedFlights.some(f => f.id === item.id)}
                onToggleSave={() => onToggleSave(item)}
                onCardClick={onCardClick}
                minPrice={minPrice}
                minDuration={minDuration}
              />
            ))
          )}
        </div>

        {!expanded && hiddenCount > 0 && (
          <button className="show-more-btn" onClick={() => setExpanded(true)}>
            Show {hiddenCount} more flight{hiddenCount !== 1 ? 's' : ''} <span>▼</span>
          </button>
        )}
        {expanded && processedResults.length > 3 && (
          <button className="show-more-btn" onClick={() => setExpanded(false)}>
            Show less <span>▲</span>
          </button>
        )}
      </div>
    </div>
  );
};