import { useState } from "react";

/**
 * PassengerForm Component
 * Collects passenger information required for flight booking
 */
const PassengerForm = ({ onSubmit, onBack, isLoading, travellers }) => {
  const adtCount = travellers?.adt || 1;
  const chdCount = travellers?.chd || 0;
  const infCount = travellers?.inf || 0;

  const createEmptyPassenger = (paxType, index) => ({
    paxId: `PAX${index + 1}`,
    paxType,
    title: paxType === "CHD" || paxType === "INF" ? "" : "Mr",
    firstName: "",
    lastName: "",
    middleName: "",
    gender: "MALE",
    birthDate: "",
    phoneNo: "",
    email: "",
    country: "",
    passPort: "",
    notify: true,
    accountNumber: "",
    depBarcodeImage: "",
    retBarcodeImage: "",
    depBarcodeCid: "",
    retBarcodeCid: "",
  });

  // Initialize passengers based on traveller counts
  const initialPassengers = [];
  let paxIndex = 0;
  for (let i = 0; i < adtCount; i++) {
    initialPassengers.push(createEmptyPassenger("ADT", paxIndex++));
  }
  for (let i = 0; i < chdCount; i++) {
    initialPassengers.push(createEmptyPassenger("CHD", paxIndex++));
  }
  for (let i = 0; i < infCount; i++) {
    initialPassengers.push(createEmptyPassenger("INF", paxIndex++));
  }

  const [passengers, setPassengers] = useState(initialPassengers);
  const [errors, setErrors] = useState({});

  const handleChange = (paxIndex, field, value) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[paxIndex] = { ...updated[paxIndex], [field]: value };
      return updated;
    });
    // Clear error for this field
    setErrors((prev) => {
      const key = `${paxIndex}-${field}`;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const validate = () => {
    const newErrors = {};
    passengers.forEach((pax, i) => {
      if (!pax.firstName.trim())
        newErrors[`${i}-firstName`] = "First name is required";
      if (!pax.lastName.trim())
        newErrors[`${i}-lastName`] = "Last name is required";
      if (!pax.birthDate) newErrors[`${i}-birthDate`] = "Date of birth is required";
      if (!pax.gender) newErrors[`${i}-gender`] = "Gender is required";
      if (!pax.email.trim() && pax.paxType === "ADT")
        newErrors[`${i}-email`] = "Email is required";
      if (!pax.phoneNo.trim() && pax.paxType === "ADT")
        newErrors[`${i}-phoneNo`] = "Phone number is required";
      if (!pax.passPort.trim())
        newErrors[`${i}-passPort`] = "Passport number is required";
      if (!pax.country.trim())
        newErrors[`${i}-country`] = "Country code is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(passengers);
    }
  };

  const getPaxLabel = (pax) => {
    switch (pax.paxType) {
      case "ADT":
        return "Adult";
      case "CHD":
        return "Child";
      case "INF":
        return "Infant";
      default:
        return "Passenger";
    }
  };

  return (
    <div className="booking-form-container">
      <div className="booking-step-header">
        <div className="step-indicator">
          <div className="step-dot active">1</div>
          <div className="step-line"></div>
          <div className="step-dot">2</div>
          <div className="step-line"></div>
          <div className="step-dot">3</div>
        </div>
        <h2 className="booking-step-title">Passenger Details</h2>
        <p className="booking-step-subtitle">
          Enter the details of {passengers.length > 1 ? "all passengers" : "the passenger"} as they appear on the passport
        </p>
      </div>

      <form onSubmit={handleSubmit} className="passenger-form">
        {passengers.map((pax, i) => (
          <div key={pax.paxId} className="passenger-card">
            <div className="passenger-card-header">
              <span className="passenger-badge">{getPaxLabel(pax)} {i + 1}</span>
              <span className="pax-id-badge">{pax.paxId}</span>
            </div>

            <div className="form-grid">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Title</label>
                <select
                  className="form-select"
                  value={pax.title}
                  onChange={(e) => handleChange(i, "title", e.target.value)}
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Miss">Miss</option>
                  <option value="">N/A</option>
                </select>
              </div>

              {/* Gender */}
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select
                  className={`form-select ${errors[`${i}-gender`] ? "error" : ""}`}
                  value={pax.gender}
                  onChange={(e) => handleChange(i, "gender", e.target.value)}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
                {errors[`${i}-gender`] && (
                  <span className="form-error">{errors[`${i}-gender`]}</span>
                )}
              </div>

              {/* First Name */}
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className={`form-input ${errors[`${i}-firstName`] ? "error" : ""}`}
                  placeholder="e.g. John"
                  value={pax.firstName}
                  onChange={(e) => handleChange(i, "firstName", e.target.value)}
                />
                {errors[`${i}-firstName`] && (
                  <span className="form-error">{errors[`${i}-firstName`]}</span>
                )}
              </div>

              {/* Middle Name */}
              <div className="form-group">
                <label className="form-label">Middle Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional"
                  value={pax.middleName}
                  onChange={(e) => handleChange(i, "middleName", e.target.value)}
                />
              </div>

              {/* Last Name */}
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className={`form-input ${errors[`${i}-lastName`] ? "error" : ""}`}
                  placeholder="e.g. Doe"
                  value={pax.lastName}
                  onChange={(e) => handleChange(i, "lastName", e.target.value)}
                />
                {errors[`${i}-lastName`] && (
                  <span className="form-error">{errors[`${i}-lastName`]}</span>
                )}
              </div>

              {/* Date of Birth */}
              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  className={`form-input ${errors[`${i}-birthDate`] ? "error" : ""}`}
                  value={pax.birthDate}
                  onChange={(e) => handleChange(i, "birthDate", e.target.value)}
                />
                {errors[`${i}-birthDate`] && (
                  <span className="form-error">{errors[`${i}-birthDate`]}</span>
                )}
              </div>

              {/* Email (for adults) */}
              {pax.paxType === "ADT" && (
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className={`form-input ${errors[`${i}-email`] ? "error" : ""}`}
                    placeholder="e.g. john@example.com"
                    value={pax.email}
                    onChange={(e) => handleChange(i, "email", e.target.value)}
                  />
                  {errors[`${i}-email`] && (
                    <span className="form-error">{errors[`${i}-email`]}</span>
                  )}
                </div>
              )}

              {/* Phone (for adults) */}
              {pax.paxType === "ADT" && (
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className={`form-input ${errors[`${i}-phoneNo`] ? "error" : ""}`}
                    placeholder="e.g. +251912345678"
                    value={pax.phoneNo}
                    onChange={(e) => handleChange(i, "phoneNo", e.target.value)}
                  />
                  {errors[`${i}-phoneNo`] && (
                    <span className="form-error">{errors[`${i}-phoneNo`]}</span>
                  )}
                </div>
              )}

              {/* Passport Number */}
              <div className="form-group">
                <label className="form-label">Passport Number *</label>
                <input
                  type="text"
                  className={`form-input ${errors[`${i}-passPort`] ? "error" : ""}`}
                  placeholder="e.g. AB1234567"
                  value={pax.passPort}
                  onChange={(e) => handleChange(i, "passPort", e.target.value)}
                />
                {errors[`${i}-passPort`] && (
                  <span className="form-error">{errors[`${i}-passPort`]}</span>
                )}
              </div>

              {/* Country Code */}
              <div className="form-group">
                <label className="form-label">Country Code *</label>
                <input
                  type="text"
                  className={`form-input ${errors[`${i}-country`] ? "error" : ""}`}
                  placeholder="e.g. ET, US, AE"
                  maxLength={2}
                  value={pax.country}
                  onChange={(e) =>
                    handleChange(i, "country", e.target.value.toUpperCase())
                  }
                />
                {errors[`${i}-country`] && (
                  <span className="form-error">{errors[`${i}-country`]}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="booking-form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? (
              <span className="btn-loading">
                <span className="spinner"></span> Verifying...
              </span>
            ) : (
              "Continue to Payment →"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PassengerForm;
