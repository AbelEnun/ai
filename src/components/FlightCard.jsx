/**
 * FlightCard Component - Kayak AI Style
 * Displays flight information with pricing and save functionality
 */

// -------------------------
// Utility Functions
// -------------------------

/**
 * Format ISO datetime string to readable time
 * @param {string} isoString - ISO datetime string
 * @returns {string} Formatted time (e.g., "2:30 pm")
 */
const formatTime = (isoString) => {
    if (!isoString) return "--";
    try {
        return new Date(isoString)
            .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            .toLowerCase();
    } catch {
        return "--";
    }
};

/**
 * Format duration in minutes to readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

/**
 * Format stops count to readable text
 * @param {number} stops - Number of stops
 * @returns {string} Formatted stops text
 */
const formatStops = (stops) => {
    if (stops === 0) return "direct";
    return `${stops} stop${stops > 1 ? "s" : ""}`;
};

// -------------------------
// CompactFlightRow Component
// -------------------------
const CompactFlightRow = ({ flight, label, isReturn = false }) => {
    if (!flight?.itinerary?.segments?.length) return null;

    const segment = flight.itinerary.segments[0];
    const depTime = formatTime(segment.departure?.at);
    const arrTime = formatTime(segment.arrival?.at);

    // Direction arrow based on flight type
    const directionIcon = isReturn ? "← " : "→ ";

    return (
        <div className="compact-flight-row">
            {label && (
                <div className="trip-leg-label">
                    <span>{directionIcon}</span>
                    <span>{label}</span>
                </div>
            )}

            <div className="time-range">
                {depTime} – {arrTime}
            </div>

            <div className="flight-meta-details">
                <span className="meta-route">
                    {segment.departure?.iata} – {segment.arrival?.iata}
                </span>
                <span className="meta-separator" aria-hidden="true">•</span>
                <span>{formatDuration(flight.durationMinutes)}</span>
                <span className="meta-separator" aria-hidden="true">•</span>
                <span>{formatStops(flight.stops)}</span>
            </div>
        </div>
    );
};

// -------------------------
// Main FlightCard Component
// -------------------------
const FlightCard = ({ flight, isSaved = false, onToggleSave, minPrice, onCardClick }) => {
    const isRoundTrip = flight.type === "round_trip";
    const price = flight.price;
    const isCheapest = minPrice && price?.amount === minPrice;

    // Determine airline name and code
    const airlineName = isRoundTrip
        ? flight.outbound?.airline || "Multiple Airlines"
        : flight.airline || "Unknown Airline";

    const airlineCode =
        airlineName && airlineName.length >= 2
            ? airlineName.slice(0, 2).toUpperCase()
            : "✈";

    const handleSaveClick = (e) => {
        e.stopPropagation();
        if (onToggleSave) {
            onToggleSave();
        }
    };

    const handleCardClick = () => {
        if (onCardClick) {
            onCardClick(flight);
        }
    };

    return (
        <article
            className={`flight-card-container ${isRoundTrip ? "round-trip" : ""}`}
            aria-label={`Flight from ${airlineName}, ${price?.amount ? `$${price.amount.toLocaleString()}` : 'Price unavailable'}`}
            onClick={handleCardClick}
            style={{ cursor: 'pointer' }}
        >
            {/* Flight Information */}
            <div className="flight-info-main">
                {/* Airline Header */}
                <div className="flight-card-header">
                    <div className="airline-logo-small" aria-hidden="true">
                        {airlineCode}
                    </div>
                    <span className="airline-name-text">{airlineName}</span>
                </div>

                {/* Flight Details */}
                <div className="flight-rows-container">
                    {isRoundTrip && flight.outbound && flight.returnFlight ? (
                        <>
                            <CompactFlightRow flight={flight.outbound} label="Outbound" isReturn={false} />
                            <div className="trip-divider" role="separator" aria-hidden="true" />
                            <CompactFlightRow flight={flight.returnFlight} label="Return" isReturn={true} />
                        </>
                    ) : (
                        <CompactFlightRow flight={flight} />
                    )}
                </div>
            </div>

            {/* Price and Save Section */}
            <div className="price-section-right">
                <div className="price-container">
                    {/* Cheapest Badge Above Price */}
                    {isCheapest && (
                        <div className="badge-cheapest-top" aria-label="Cheapest option">
                            CHEAPEST
                        </div>
                    )}

                    <span className="price-text" aria-label={`Price: ${price?.amount ? `$${price.amount.toLocaleString()}` : 'unavailable'}`}>
                        ${price?.amount?.toLocaleString() || "--"}
                    </span>
                    <span className="class-text">
                        {isRoundTrip ? "Round trip" : "One way"}
                    </span>
                </div>

                <button
                    className={`heart-icon-btn ${isSaved ? "saved" : ""}`}
                    onClick={handleSaveClick}
                    aria-label={isSaved ? "Remove from saved flights" : "Save this flight"}
                    aria-pressed={isSaved}
                    type="button"
                >
                    <span aria-hidden="true">{isSaved ? "❤️" : "🤍"}</span>
                </button>
            </div>
        </article>
    );
};

export default FlightCard;
