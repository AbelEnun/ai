import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_URL =
  "https://gckdcfk4p0.execute-api.us-east-1.amazonaws.com/dev/search";

function App() {
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      text: "Hello! I'm your Flight Assistant. I can help you search for flights, compare options, and find the best travel deals. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [flightResults, setFlightResults] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  }, [messages]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDuration = (duration) => {
    // Remove PT prefix and format duration
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    
    const hours = match[1] ? match[1].replace('H', '') : '0';
    const minutes = match[2] ? match[2].replace('M', '') : '0';
    
    return `${hours}h ${minutes}m`;
  };

  const FlightCard = ({ flight, index, title }) => {
    const itinerary = flight.itineraries?.[0];
    const segments = itinerary?.segments || [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    return (
      <div className="flight-card">
        <div className="flight-header">
          <h4>{title} Option {index + 1}</h4>
          <div className="flight-price">
            {flight.price?.total} {flight.price?.currency}
          </div>
        </div>
        
        <div className="flight-summary">
          <div className="route-info">
            <div className="airport">
              <div className="code">{firstSegment?.departure?.iataCode}</div>
              <div className="time">{formatTime(firstSegment?.departure?.at)}</div>
              <div className="date">{formatDate(firstSegment?.departure?.at)}</div>
            </div>
            
            <div className="duration-info">
              <div className="duration">{formatDuration(itinerary?.duration)}</div>
              <div className="stops">
                {segments.length === 1 ? "Non-stop" : `${segments.length - 1} stop${segments.length - 1 > 1 ? 's' : ''}`}
              </div>
              <div className="route-line"></div>
            </div>
            
            <div className="airport">
              <div className="code">{lastSegment?.arrival?.iataCode}</div>
              <div className="time">{formatTime(lastSegment?.arrival?.at)}</div>
              <div className="date">{formatDate(lastSegment?.arrival?.at)}</div>
            </div>
          </div>
        </div>
        
        <div className="flight-details">
          {segments.map((segment, idx) => (
            <div key={idx} className="segment">
              <div className="segment-header">
                <span className="carrier">{segment.carrierCode}{segment.number}</span>
                <span className="aircraft">{segment.aircraft?.code || '—'}</span>
              </div>
              <div className="segment-route">
                <div className="segment-point">
                  <div className="point-time">{formatTime(segment.departure.at)}</div>
                  <div className="point-code">{segment.departure.iataCode}</div>
                </div>
                <div className="segment-duration">
                  {formatDuration(segment.duration)}
                </div>
                <div className="segment-point arrival">
                  <div className="point-time">{formatTime(segment.arrival.at)}</div>
                  <div className="point-code">{segment.arrival.iataCode}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const query = input;
    setInput("");
    setLoading(true);
    setFlightResults(null);

    const userMessage = {
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    
    const thinkingMessage = {
      role: "assistant",
      text: "Searching for available flights...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isThinking: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: query })
      });

      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;

      // Remove thinking message
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      setLoading(false);

      if (data.type === "chat") {
        const responseMessage = {
          role: "assistant",
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, responseMessage]);
        return;
      }

      if (data.type === "results") {
        setFlightResults(data);
        
        const responseMessage = {
          role: "assistant",
          text: `Found ${data.outbound.length} flight options${data.tripType === 'round_trip' ? ` with ${data.return.length} return options` : ''}. Here are the best matches:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFlightResults: true
        };
        
        setMessages(prev => [...prev, responseMessage]);
        return;
      }

      // Fallback
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: "I apologize, but I couldn't process your request. Please try rephrasing your search criteria.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      setLoading(false);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: "I apologize for the inconvenience. There was an issue connecting to our flight search service. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Flight Assistant</h1>
          <p className="subtitle">AI-powered flight search and recommendations</p>
        </div>
      </header>

      <main className="main-content">
        <div className="chat-section">
          <div className="chat-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <div className="message-header">
                  <span className="message-role">
                    {msg.role === 'assistant' ? 'Flight Assistant' : 'You'}
                  </span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-content">
                  {msg.text}
                </div>
              </div>
            ))}
            
            {flightResults && (
              <div className="flight-results-section">
                <div className="results-header">
                  <h3>Available Flights</h3>
                  <span className="results-count">
                    {flightResults.outbound.length} options
                  </span>
                </div>
                
                <div className="flights-container">
                  <div className="outbound-flights">
                    <h4 className="flight-group-title">
                      {flightResults.tripType === 'round_trip' ? '🛫 Outbound Flights' : '✈ Available Flights'}
                    </h4>
                    {flightResults.outbound.map((flight, index) => (
                      <FlightCard
                        key={index}
                        flight={flight}
                        index={index}
                        title={flightResults.tripType === 'round_trip' ? 'Outbound' : 'Flight'}
                      />
                    ))}
                  </div>
                  
                  {flightResults.tripType === 'round_trip' && flightResults.return && (
                    <div className="return-flights">
                      <h4 className="flight-group-title">🛬 Return Flights</h4>
                      {flightResults.return.map((flight, index) => (
                        <FlightCard
                          key={index}
                          flight={flight}
                          index={index}
                          title="Return"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <input
                ref={inputRef}
                value={input}
                placeholder="Try: 'Flights from New York to London next Friday' or 'Find the cheapest flight to Tokyo in March'"
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()}
                className="send-button"
              >
                {loading ? (
                  <span className="loading-indicator">Searching...</span>
                ) : (
                  <span>Search Flights</span>
                )}
              </button>
            </div>
            <div className="input-hints">
              <span className="hint">Press Enter to send</span>
              <span className="hint">•</span>
              <span className="hint">Be specific for better results</span>
            </div>
          </div>
        </div>
        
        <div className="info-panel">
          <h3>Search Tips</h3>
          <ul className="tips-list">
            <li>Include specific dates for more accurate results</li>
            <li>Specify preferences like 'non-stop', 'cheapest', or 'morning flights'</li>
            <li>Mention your departure city first, then destination</li>
            <li>For round trips, include both departure and return dates</li>
          </ul>
          
          <div className="quick-actions">
            <h4>Quick Searches</h4>
            <div className="action-buttons">
              <button 
                onClick={() => setInput("Cheapest flights to Paris next month")}
                className="action-button"
              >
                Paris deals
              </button>
              <button 
                onClick={() => setInput("Non-stop flights from LA to Tokyo")}
                className="action-button"
              >
                Tokyo non-stop
              </button>
              <button 
                onClick={() => setInput("Weekend trip to Chicago from NYC")}
                className="action-button"
              >
                Weekend getaways
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;