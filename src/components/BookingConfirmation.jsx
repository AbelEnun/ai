/**
 * BookingConfirmation Component
 * Shows the booking success/failure result after payment
 */

const BookingConfirmation = ({ bookingData, onClose, isSuccess }) => {
  return (
    <div className="booking-form-container">
      <div className="booking-step-header">
        <div className="step-indicator">
          <div className="step-dot completed">✓</div>
          <div className="step-line completed"></div>
          <div className="step-dot completed">✓</div>
          <div className="step-line completed"></div>
          <div className="step-dot completed">✓</div>
        </div>
      </div>

      {isSuccess ? (
        <div className="confirmation-card success">
          <div className="confirmation-icon-wrapper success">
            <span className="confirmation-icon">✈️</span>
          </div>
          <h2 className="confirmation-title">Booking Confirmed!</h2>
          <p className="confirmation-subtitle">
            Your flight has been successfully booked. You will receive a
            confirmation email shortly.
          </p>

          {bookingData && (
            <div className="confirmation-details">
              {bookingData.bookingLocator && (
                <div className="confirmation-detail-row">
                  <span className="detail-label">Booking Reference</span>
                  <span className="detail-value booking-ref">
                    {bookingData.bookingLocator}
                  </span>
                </div>
              )}
              {bookingData.pnr && (
                <div className="confirmation-detail-row">
                  <span className="detail-label">PNR</span>
                  <span className="detail-value booking-ref">
                    {bookingData.pnr}
                  </span>
                </div>
              )}
              {bookingData.status && (
                <div className="confirmation-detail-row">
                  <span className="detail-label">Status</span>
                  <span className="detail-value status-confirmed">
                    {bookingData.status}
                  </span>
                </div>
              )}
              {bookingData.totalAmount && (
                <div className="confirmation-detail-row">
                  <span className="detail-label">Amount Paid</span>
                  <span className="detail-value">
                    {bookingData.currency === "USD" ? "€" : bookingData.currency || "€"}{" "}
                    {bookingData.totalAmount?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="confirmation-actions">
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>

          <div className="confirmation-note">
            <span>📧</span>
            <span>
              A confirmation email with your e-ticket and itinerary details will
              be sent to your registered email address.
            </span>
          </div>
        </div>
      ) : (
        <div className="confirmation-card error">
          <div className="confirmation-icon-wrapper error">
            <span className="confirmation-icon">⚠️</span>
          </div>
          <h2 className="confirmation-title">Booking Issue</h2>
          <p className="confirmation-subtitle">
            {bookingData?.error ||
              "There was an issue processing your booking. Please try again or contact support."}
          </p>

          {bookingData?.bookingLocator && (
            <div className="confirmation-details">
              <div className="confirmation-detail-row">
                <span className="detail-label">Booking Reference</span>
                <span className="detail-value booking-ref">
                  {bookingData.bookingLocator}
                </span>
              </div>
            </div>
          )}

          <div className="confirmation-actions">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmation;
