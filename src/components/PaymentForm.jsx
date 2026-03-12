import { useState } from "react";

/**
 * PaymentForm Component
 * Collects card payment details for flight booking confirmation
 */

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const PaymentForm = ({
  onSubmit,
  onBack,
  isLoading,
  totalAmount,
  currency,
  bookingLocator,
  paymentOptions,
}) => {
  const [cardInfo, setCardInfo] = useState({
    cardHolder: "",
    cardNumber: "",
    expireMonth: "",
    expireYear: "",
    cvv: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setCardInfo((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!cardInfo.cardHolder.trim())
      newErrors.cardHolder = "Cardholder name is required";
    const cleanNumber = cardInfo.cardNumber.replace(/\s/g, "");
    if (!cleanNumber || cleanNumber.length < 13)
      newErrors.cardNumber = "Valid card number is required";
    if (!cardInfo.expireMonth) newErrors.expireMonth = "Required";
    if (!cardInfo.expireYear) newErrors.expireYear = "Required";
    if (!cardInfo.cvv || cardInfo.cvv.length < 3)
      newErrors.cvv = "Valid CVV is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        cardHolder: cardInfo.cardHolder.toUpperCase(),
        cardNumber: cardInfo.cardNumber.replace(/\s/g, ""),
        expireMonth: cardInfo.expireMonth,
        expireYear: cardInfo.expireYear,
        cvv: cardInfo.cvv,
      });
    }
  };

  // Detect card type from number
  const getCardType = (number) => {
    const clean = number.replace(/\s/g, "");
    if (/^4/.test(clean)) return "visa";
    if (/^5[1-5]/.test(clean)) return "mastercard";
    if (/^3[47]/.test(clean)) return "amex";
    if (/^6/.test(clean)) return "discover";
    return null;
  };

  const cardType = getCardType(cardInfo.cardNumber);

  const cardIcons = {
    visa: "💳 Visa",
    mastercard: "💳 Mastercard",
    amex: "💳 Amex",
    discover: "💳 Discover",
  };

  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const currentYear = new Date().getFullYear() % 100;
  const years = Array.from({ length: 10 }, (_, i) =>
    String(currentYear + i)
  );

  return (
    <div className="booking-form-container">
      <div className="booking-step-header">
        <div className="step-indicator">
          <div className="step-dot completed">✓</div>
          <div className="step-line completed"></div>
          <div className="step-dot active">2</div>
          <div className="step-line"></div>
          <div className="step-dot">3</div>
        </div>
        <h2 className="booking-step-title">Payment</h2>
        <p className="booking-step-subtitle">
          Secure payment — your card details are encrypted
        </p>
      </div>

      {/* Price Summary */}
      <div className="payment-summary-card">
        <div className="payment-summary-row">
          <span>Booking Reference</span>
          <span className="booking-ref-value">{bookingLocator || "—"}</span>
        </div>
        <div className="payment-summary-divider"></div>
        <div className="payment-summary-row total">
          <span>Total Amount</span>
          <span className="payment-total-amount">
            {currency === "USD" ? "€" : currency || "€"} {totalAmount?.toLocaleString() || "—"}
          </span>
        </div>
      </div>

      {/* Available Payment Methods */}
      {paymentOptions?.cards && paymentOptions.cards.length > 0 && (
        <div className="payment-methods-info">
          <span className="payment-methods-label">Accepted Cards</span>
          <div className="payment-methods-icons">
            {paymentOptions.cards.map((card, i) => (
              <span key={i} className="payment-method-badge">
                💳 {card.name || `Card ${i + 1}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="card-visual">
          <div className="card-visual-bg">
            <div className="card-chip"></div>
            <div className="card-number-display">
              {cardInfo.cardNumber || "•••• •••• •••• ••••"}
            </div>
            <div className="card-bottom-row">
              <div className="card-holder-display">
                {cardInfo.cardHolder || "CARDHOLDER NAME"}
              </div>
              <div className="card-expiry-display">
                {cardInfo.expireMonth || "MM"}/{cardInfo.expireYear || "YY"}
              </div>
            </div>
            {cardType && (
              <div className="card-type-badge">{cardIcons[cardType]}</div>
            )}
          </div>
        </div>

        <div className="form-grid payment-grid">
          {/* Cardholder Name */}
          <div className="form-group full-width">
            <label className="form-label">Cardholder Name *</label>
            <input
              type="text"
              className={`form-input ${errors.cardHolder ? "error" : ""}`}
              placeholder="e.g. JOHN DOE"
              value={cardInfo.cardHolder}
              onChange={(e) => handleChange("cardHolder", e.target.value)}
            />
            {errors.cardHolder && (
              <span className="form-error">{errors.cardHolder}</span>
            )}
          </div>

          {/* Card Number */}
          <div className="form-group full-width">
            <label className="form-label">
              Card Number *
              {cardType && (
                <span className="card-type-inline">{cardIcons[cardType]}</span>
              )}
            </label>
            <input
              type="text"
              className={`form-input ${errors.cardNumber ? "error" : ""}`}
              placeholder="1234 5678 9012 3456"
              value={cardInfo.cardNumber}
              onChange={(e) =>
                handleChange("cardNumber", formatCardNumber(e.target.value))
              }
              maxLength={19}
            />
            {errors.cardNumber && (
              <span className="form-error">{errors.cardNumber}</span>
            )}
          </div>

          {/* Expiry Month */}
          <div className="form-group">
            <label className="form-label">Month *</label>
            <select
              className={`form-select ${errors.expireMonth ? "error" : ""}`}
              value={cardInfo.expireMonth}
              onChange={(e) => handleChange("expireMonth", e.target.value)}
            >
              <option value="">MM</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.expireMonth && (
              <span className="form-error">{errors.expireMonth}</span>
            )}
          </div>

          {/* Expiry Year */}
          <div className="form-group">
            <label className="form-label">Year *</label>
            <select
              className={`form-select ${errors.expireYear ? "error" : ""}`}
              value={cardInfo.expireYear}
              onChange={(e) => handleChange("expireYear", e.target.value)}
            >
              <option value="">YY</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {errors.expireYear && (
              <span className="form-error">{errors.expireYear}</span>
            )}
          </div>

          {/* CVV */}
          <div className="form-group">
            <label className="form-label">CVV *</label>
            <input
              type="password"
              className={`form-input ${errors.cvv ? "error" : ""}`}
              placeholder="•••"
              maxLength={4}
              value={cardInfo.cvv}
              onChange={(e) =>
                handleChange("cvv", e.target.value.replace(/\D/g, ""))
              }
            />
            {errors.cvv && (
              <span className="form-error">{errors.cvv}</span>
            )}
          </div>
        </div>

        <div className="secure-payment-notice">
          <span className="lock-icon">🔒</span>
          <span>
            Your payment information is secured with 256-bit SSL encryption
          </span>
        </div>

        <div className="booking-form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </button>
          <button type="submit" className="btn-primary btn-pay" disabled={isLoading}>
            {isLoading ? (
              <span className="btn-loading">
                <span className="spinner"></span> Processing Payment...
              </span>
            ) : (
              `Pay ${currency === "USD" ? "€" : currency || "€"}${totalAmount?.toLocaleString() || ""} →`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
