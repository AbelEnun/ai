/**
 * Fannos Flight API Service
 * Handles the complete flight booking flow:
 *   1. Get Guest Token
 *   2. Flight Shopping (already handled by chatbot)
 *   3. Offer Price (verify fare)
 *   4. Flight Hold (book on hold)
 *   5. Get Payment Options
 *   6. Confirm Booking (payment)
 *   7. 3DS Payment Callback
 */

const BASE_URL = import.meta.env.DEV
  ? "/fannos"  // Vite dev proxy handles CORS
  : "http://3.11.26.231/fannos";

// Token management
let guestToken = null;

/**
 * Get or refresh guest token
 */
export async function getGuestToken() {
  if (guestToken) return guestToken;

  const response = await fetch(`${BASE_URL}/api/auth/guest-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to get guest token: ${response.status}`);
  }

  const data = await response.json();
  guestToken = data.guestToken;
  return guestToken;
}

/**
 * Helper to make authenticated API calls
 */
async function authenticatedFetch(url, options = {}) {
  const token = await getGuestToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  // If 401, clear token and retry once
  if (response.status === 401) {
    guestToken = null;
    const newToken = await getGuestToken();
    headers.Authorization = `Bearer ${newToken}`;
    return fetch(url, { ...options, headers });
  }

  return response;
}

/**
 * Step 3: Verify Offer Price
 * Takes the selected flight offer and verifies/prices it
 */
export async function verifyOfferPrice({
  fareId,
  provider,
  itineraryIdList,
  originDestinations,
  travellers,
  offerItems,
  metadata,
}) {
  const body = {
    executionId: fareId,
    provider: provider,
    metadata: metadata || {
      country: "ET",
      currency: "USD",
      locale: "en-US",
      user: "guest@fannos.com",
      traceId: null,
    },
    offerItems: offerItems || [
      {
        offerId: fareId,
        offerItemId: null,
        owner: "CP",
        baggageAllowance: [
          {
            baggageAllowanceId: null,
            typeCode: "Checked Bag",
            totalQuantity: 1,
            description: "2 PC",
          },
        ],
        baseAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: "USD",
      },
    ],
    travellers: travellers || {
      adt: 1,
      chd: 0,
      inf: 0,
      ins: 0,
      unn: 0,
    },
    originDestinations: originDestinations || [],
    fareId: fareId,
    itineraryIdList: itineraryIdList || [],
  };

  const response = await authenticatedFetch(
    `${BASE_URL}/api/flight/offer-price`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Offer price failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Step 4: Hold Booking
 * Places the booking on hold with passenger information
 */
export async function holdBooking({
  executionId,
  fareId,
  provider,
  offerItems,
  customerInfos,
  travellers,
  itineraryIdList,
}) {
  const body = {
    bookingHold: true,
    executionId: executionId,
    offerPriceId: executionId,
    provider: provider,
    offerItems: offerItems || [],
    customerInfos: customerInfos || [],
    travellers: travellers || {
      adt: 1,
      chd: 0,
      inf: 0,
      ins: 0,
      unn: 0,
    },
    verifyRequest: {
      fareId: fareId,
      itineraryIdList: itineraryIdList || [],
    },
  };

  const response = await authenticatedFetch(
    `${BASE_URL}/api/flight/hold`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Hold booking failed: ${response.status} - ${errText}`);
  }

  return await response.json();
}

/**
 * Step 5: Get Payment Options
 * Retrieves available payment methods for the held booking
 */
export async function getPaymentOptions({
  executionId,
  fareId,
  provider,
  offerItems,
  customerInfos,
  travellers,
  itineraryIdList,
}) {
  const body = {
    bookingHold: true,
    executionId: executionId,
    offerPriceId: fareId,
    provider: provider,
    offerItems: offerItems || [],
    customerInfos: customerInfos || [],
    travellers: travellers || {
      adt: 1,
      chd: 0,
      inf: 0,
      ins: 0,
      unn: 0,
    },
    verifyRequest: {
      fareId: fareId,
      itineraryIdList: itineraryIdList || [],
    },
  };

  const response = await authenticatedFetch(
    `${BASE_URL}/api/flight/hold/get-payment-options`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Get payment options failed: ${response.status} - ${errText}`
    );
  }

  return await response.json();
}

/**
 * Step 6: Confirm Booking with Payment
 * Processes the payment and confirms the booking
 */
export async function confirmBooking({
  bookingLocator,
  cardPaymentId,
  cardInfo,
}) {
  const body = {
    bookingLocator: bookingLocator,
    payOption: {
      id: cardPaymentId,
    },
    isCardMethod: true,
    cardInfo: cardInfo,
  };

  const response = await authenticatedFetch(
    `${BASE_URL}/api/flight/hold/confirmpayment`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Confirm booking failed: ${response.status} - ${errText}`
    );
  }

  return await response.json();
}

/**
 * Step 7: 3DS Payment Callback
 * Handles 3D-Secure verification callback
 */
export async function paymentCallback({ status, traceNumber, txnref }) {
  const body = {
    status: status || "0001",
    traceNumber: traceNumber,
    txnref: txnref,
  };

  const response = await authenticatedFetch(
    `${BASE_URL}/api/flight/hold/payment-callback`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Payment callback failed: ${response.status} - ${errText}`
    );
  }

  return await response.json();
}

/**
 * Clear the stored guest token (for logout/reset)
 */
export function clearToken() {
  guestToken = null;
}
