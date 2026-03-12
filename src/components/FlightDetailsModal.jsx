/**
 * FlightDetailsModal Component
 * Shows detailed flight information in a modal overlay
 * Now integrates with BookingModal for real booking flow
 */
import { useState } from "react";
import BookingModal from "./BookingModal";

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

const formatDate = (isoString) => {
    if (!isoString) return "--";
    try {
        return new Date(isoString).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return "--";
    }
};

const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

const formatStops = (stops) => {
    if (stops === 0) return "Direct Flight";
    return `${stops} stop${stops > 1 ? "s" : ""}`;
};

const FlightLegDetails = ({ flight, title, isReturn = false }) => {
    if (!flight?.itinerary?.segments?.length) return null;

    const segment = flight.itinerary.segments[0];
    const depTime = formatTime(segment.departure?.at);
    const arrTime = formatTime(segment.arrival?.at);
    const depDate = formatDate(segment.departure?.at);
    const arrDate = formatDate(segment.arrival?.at);
    const directionIcon = isReturn ? "←" : "→";

    return (
        <div className="modal-flight-leg">
            <div className="modal-leg-header">
                <span className="modal-leg-icon">{directionIcon}</span>
                <h3>{title}</h3>
            </div>

            <div className="modal-flight-route">
                <div className="modal-airport-info">
                    <div className="modal-airport-code">{segment.departure?.iata}</div>
                    <div className="modal-time-main">{depTime}</div>
                    <div className="modal-date">{depDate}</div>
                </div>

                <div className="modal-flight-timeline">
                    <div className="timeline-line"></div>
                    <div className="timeline-duration">
                        <span>{formatDuration(flight.durationMinutes)}</span>
                        <span className="timeline-stops">{formatStops(flight.stops)}</span>
                    </div>
                </div>

                <div className="modal-airport-info">
                    <div className="modal-airport-code">{segment.arrival?.iata}</div>
                    <div className="modal-time-main">{arrTime}</div>
                    <div className="modal-date">{arrDate}</div>
                </div>
            </div>

            <div className="modal-flight-details-grid">
                <div className="detail-item">
                    <span className="detail-label">Flight Number</span>
                    <span className="detail-value">{segment.flightNumber || "—"}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Aircraft</span>
                    <span className="detail-value">{segment.aircraft || "—"}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Carrier</span>
                    <span className="detail-value">{segment.carrier || flight.airline || "—"}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">{formatDuration(flight.durationMinutes)}</span>
                </div>
            </div>
        </div>
    );
};

const FlightDetailsModal = ({ flight, isOpen, onClose }) => {
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    if (!isOpen || !flight) return null;

    const isRoundTrip = flight.type === "round_trip";
    const price = flight.price;

    const handleBooking = () => {
        setIsBookingOpen(true);
    };

    const handleBookingClose = () => {
        setIsBookingOpen(false);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // If booking modal is open, show that instead
    if (isBookingOpen) {
        return (
            <BookingModal
                flight={flight}
                isOpen={true}
                onClose={() => {
                    handleBookingClose();
                    onClose();
                }}
            />
        );
    }

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="modal-content">
                {/* Modal Header */}
                <div className="modal-header">
                    <h2>Flight Details</h2>
                    <button
                        className="modal-close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {isRoundTrip && flight.outbound && flight.returnFlight ? (
                        <>
                            <FlightLegDetails
                                flight={flight.outbound}
                                title="Outbound Flight"
                                isReturn={false}
                            />
                            <div className="modal-leg-divider"></div>
                            <FlightLegDetails
                                flight={flight.returnFlight}
                                title="Return Flight"
                                isReturn={true}
                            />
                        </>
                    ) : (
                        <FlightLegDetails flight={flight} title="Flight Information" isReturn={false} />
                    )}

                    {/* Price Summary */}
                    <div className="modal-price-summary">
                        <div className="summary-row">
                            <span>Trip Type</span>
                            <span>{isRoundTrip ? "Round Trip" : "One Way"}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total Price</span>
                            <span className="price-large">
                                €{price?.amount?.toLocaleString() || "—"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button className="btn-primary" onClick={handleBooking}>
                        Book This Flight →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlightDetailsModal;
