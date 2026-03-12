import { useState, useCallback } from "react";
import PassengerForm from "./PassengerForm";
import PaymentForm from "./PaymentForm";
import BookingConfirmation from "./BookingConfirmation";
import {
  verifyOfferPrice,
  holdBooking,
  getPaymentOptions,
  confirmBooking,
} from "../api/flightApi";

/**
 * BookingModal Component
 * Orchestrates the full booking flow:
 *   Step 1: Passenger Details
 *   Step 2: Payment
 *   Step 3: Confirmation
 */

const STEPS = {
  PASSENGERS: "passengers",
  PAYMENT: "payment",
  CONFIRMATION: "confirmation",
};

const BookingModal = ({ flight, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.PASSENGERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State accumulated through the flow
  const [bookingState, setBookingState] = useState({
    fareId: null,
    executionId: null,
    provider: null,
    itineraryIdList: [],
    offerItems: [],
    customerInfos: [],
    travellers: { adt: 1, chd: 0, inf: 0, ins: 0, unn: 0 },
    bookingLocator: null,
    cardPaymentId: null,
    paymentOptions: null,
    totalAmount: null,
    currency: null,
    confirmationData: null,
  });

  if (!isOpen || !flight) return null;

  // Extract raw data from the flight object
  const rawFlight = flight._raw || flight;
  const isRoundTrip = flight.type === "round_trip";

  /**
   * Build origin/destination list from the flight data
   */
  const buildOriginDestinations = () => {
    const destinations = [];

    if (isRoundTrip && flight.outbound && flight.returnFlight) {
      const outSeg = flight.outbound?.itinerary?.segments?.[0];
      const retSeg = flight.returnFlight?.itinerary?.segments?.[0];

      if (outSeg) {
        destinations.push({
          departure: {
            airportCode: outSeg.departure?.iata,
            date: outSeg.departure?.at?.split("T")[0],
          },
          arrival: {
            airportCode: outSeg.arrival?.iata,
          },
        });
      }
      if (retSeg) {
        destinations.push({
          departure: {
            airportCode: retSeg.departure?.iata,
            date: retSeg.departure?.at?.split("T")[0],
          },
          arrival: {
            airportCode: retSeg.arrival?.iata,
          },
        });
      }
    } else {
      const seg = flight.itinerary?.segments?.[0];
      if (seg) {
        destinations.push({
          departure: {
            airportCode: seg.departure?.iata,
            date: seg.departure?.at?.split("T")[0],
          },
          arrival: {
            airportCode: seg.arrival?.iata,
          },
        });
      }
    }

    return destinations;
  };

  /**
   * Step 1 → 2: Handle passenger form submission
   * Calls: Offer Price → Hold Booking → Get Payment Options
   */
  const handlePassengerSubmit = useCallback(
    async (passengers) => {
      setIsLoading(true);
      setError(null);

      try {
        const fareId =
          rawFlight.offerId || rawFlight.id || flight.id;
        const provider = rawFlight.provider || "";
        const itineraryIdList =
          rawFlight.itineraryIds || rawFlight.itineraryIdList || [];
        const originDestinations = buildOriginDestinations();

        // Build offer items from flight data
        const offerItems = [
          {
            offerId: fareId,
            offerItemId: null,
            owner: rawFlight.owner || rawFlight.airline?.slice(0, 2) || "CP",
            baggageAllowance:
              rawFlight.baggageAllowance || [],
            baseAmount: rawFlight.baseAmount || flight.price?.amount || 0,
            taxAmount: rawFlight.taxAmount || 0,
            totalAmount:
              rawFlight.totalAmount ||
              rawFlight.totalPrice ||
              flight.price?.amount ||
              0,
            currency:
              rawFlight.currency || flight.price?.currency || "USD",
            passengerId: passengers.map((p) => p.paxId),
            paxRefID: passengers.map((p) => p.paxId),
            serviceDefinition: rawFlight.serviceDefinition || [],
          },
        ];

        const travellers = {
          adt: passengers.filter((p) => p.paxType === "ADT").length || 1,
          chd: passengers.filter((p) => p.paxType === "CHD").length,
          inf: passengers.filter((p) => p.paxType === "INF").length,
          ins: 0,
          unn: 0,
        };

        // --- Step 3: Offer Price ---
        console.log("🔄 Step 3: Verifying offer price...");
        const priceResult = await verifyOfferPrice({
          fareId,
          provider,
          itineraryIdList,
          originDestinations,
          travellers,
          offerItems,
        });
        console.log("✅ Offer price result:", priceResult);

        const executionId =
          priceResult?.data?.executionId || priceResult?.executionId || fareId;
        const updatedFareId =
          priceResult?.data?.id || priceResult?.id || fareId;

        // Update offer items with execution ID
        const updatedOfferItems = offerItems.map((item) => ({
          ...item,
          offerId: executionId,
        }));

        // --- Step 4: Hold Booking ---
        console.log("🔄 Step 4: Placing booking on hold...");
        const holdResult = await holdBooking({
          executionId,
          fareId: updatedFareId,
          provider,
          offerItems: updatedOfferItems,
          customerInfos: passengers,
          travellers,
          itineraryIdList,
        });
        console.log("✅ Hold result:", holdResult);

        // --- Step 5: Get Payment Options ---
        console.log("🔄 Step 5: Getting payment options...");
        const paymentResult = await getPaymentOptions({
          executionId,
          fareId: updatedFareId,
          provider,
          offerItems: updatedOfferItems,
          customerInfos: passengers,
          travellers,
          itineraryIdList,
        });
        console.log("✅ Payment options:", paymentResult);

        const bookingLocator =
          paymentResult?.data?.id ||
          holdResult?.data?.id ||
          holdResult?.bookingLocator ||
          null;

        const paymentOptions = paymentResult?.data?.paymentOptions || null;
        let cardPaymentId = null;
        if (
          paymentOptions?.cards &&
          Array.isArray(paymentOptions.cards) &&
          paymentOptions.cards.length > 0
        ) {
          cardPaymentId = paymentOptions.cards[0].id;
        }

        const totalAmount =
          paymentResult?.data?.totalAmount ||
          priceResult?.data?.totalAmount ||
          flight.price?.amount ||
          0;
        const currency =
          paymentResult?.data?.currency ||
          priceResult?.data?.currency ||
          flight.price?.currency ||
          "USD";

        setBookingState((prev) => ({
          ...prev,
          fareId: updatedFareId,
          executionId,
          provider,
          itineraryIdList,
          offerItems: updatedOfferItems,
          customerInfos: passengers,
          travellers,
          bookingLocator,
          cardPaymentId,
          paymentOptions,
          totalAmount,
          currency,
        }));

        setCurrentStep(STEPS.PAYMENT);
      } catch (err) {
        console.error("Booking flow error:", err);
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [flight, rawFlight]
  );

  /**
   * Step 2 → 3: Handle payment submission
   * Calls: Confirm Booking
   */
  const handlePaymentSubmit = useCallback(
    async (cardInfo) => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("🔄 Step 6: Confirming booking with payment...");
        const result = await confirmBooking({
          bookingLocator: bookingState.bookingLocator,
          cardPaymentId: bookingState.cardPaymentId,
          cardInfo,
        });
        console.log("✅ Booking confirmed:", result);

        setBookingState((prev) => ({
          ...prev,
          confirmationData: {
            ...result?.data,
            bookingLocator: bookingState.bookingLocator,
            totalAmount: bookingState.totalAmount,
            currency: bookingState.currency,
          },
        }));

        setCurrentStep(STEPS.CONFIRMATION);
      } catch (err) {
        console.error("Payment error:", err);
        // Still show confirmation with error
        setBookingState((prev) => ({
          ...prev,
          confirmationData: {
            error: err.message,
            bookingLocator: bookingState.bookingLocator,
          },
        }));
        setCurrentStep(STEPS.CONFIRMATION);
      } finally {
        setIsLoading(false);
      }
    },
    [bookingState]
  );

  /**
   * Handle modal close — reset state
   */
  const handleClose = () => {
    setCurrentStep(STEPS.PASSENGERS);
    setBookingState({
      fareId: null,
      executionId: null,
      provider: null,
      itineraryIdList: [],
      offerItems: [],
      customerInfos: [],
      travellers: { adt: 1, chd: 0, inf: 0, ins: 0, unn: 0 },
      bookingLocator: null,
      cardPaymentId: null,
      paymentOptions: null,
      totalAmount: null,
      currency: null,
      confirmationData: null,
    });
    setError(null);
    setIsLoading(false);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      handleClose();
    }
  };

  // Flight summary for sidebar
  const flightSummary = () => {
    if (isRoundTrip && flight.outbound && flight.returnFlight) {
      const outSeg = flight.outbound?.itinerary?.segments?.[0];
      const retSeg = flight.returnFlight?.itinerary?.segments?.[0];
      return {
        route: `${outSeg?.departure?.iata || "—"} ↔ ${outSeg?.arrival?.iata || "—"}`,
        airline: flight.airline || flight.outbound?.airline || "—",
        price: `${flight.price?.currency === "USD" ? "€" : flight.price?.currency || "€"}${flight.price?.amount?.toLocaleString() || "—"}`,
        type: "Round Trip",
      };
    } else {
      const seg = flight.itinerary?.segments?.[0];
      return {
        route: `${seg?.departure?.iata || "—"} → ${seg?.arrival?.iata || "—"}`,
        airline: flight.airline || "—",
        price: `${flight.price?.currency === "USD" ? "€" : flight.price?.currency || "€"}${flight.price?.amount?.toLocaleString() || "—"}`,
        type: "One Way",
      };
    }
  };

  const summary = flightSummary();

  return (
    <div className="modal-overlay booking-modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content booking-modal-content">
        {/* Header */}
        <div className="modal-header booking-modal-header">
          <div className="booking-header-info">
            <h2>Book Flight</h2>
            <div className="booking-header-summary">
              <span className="booking-route">{summary.route}</span>
              <span className="booking-meta-sep">•</span>
              <span>{summary.airline}</span>
              <span className="booking-meta-sep">•</span>
              <span className="booking-price-badge">{summary.price}</span>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="booking-error-banner">
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Body */}
        <div className="modal-body booking-modal-body">
          {currentStep === STEPS.PASSENGERS && (
            <PassengerForm
              onSubmit={handlePassengerSubmit}
              onBack={handleClose}
              isLoading={isLoading}
              travellers={bookingState.travellers}
            />
          )}

          {currentStep === STEPS.PAYMENT && (
            <PaymentForm
              onSubmit={handlePaymentSubmit}
              onBack={() => {
                setCurrentStep(STEPS.PASSENGERS);
                setError(null);
              }}
              isLoading={isLoading}
              totalAmount={bookingState.totalAmount}
              currency={bookingState.currency}
              bookingLocator={bookingState.bookingLocator}
              paymentOptions={bookingState.paymentOptions}
            />
          )}

          {currentStep === STEPS.CONFIRMATION && (
            <BookingConfirmation
              bookingData={bookingState.confirmationData}
              onClose={handleClose}
              isSuccess={!bookingState.confirmationData?.error}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
