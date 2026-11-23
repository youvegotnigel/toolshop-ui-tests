/**
 * What a shopper types on the address step. The Toolshop looks the postcode up and fills in street,
 * city and state itself, so only these three fields are entered.
 */
export type AddressEntry = { countryCode: string; postalCode: string; houseNumber: string };

/** A customer's saved address, as POST /users/register stores it. */
export type SavedAddress = {
  street: string;
  house_number: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
};

/** Every test customer registers with this address, so checkout pre-fills it (a returning customer). */
export const SAVED_ADDRESS: SavedAddress = {
  street: 'Invalidenstrasse',
  house_number: '12',
  city: 'Berlin',
  state: 'Berlin',
  country: 'DE',
  postal_code: '10115',
};

/** Payment methods by their option value. */
export const PAYMENT = {
  creditCard: 'credit-card',
  cashOnDelivery: 'cash-on-delivery',
  bankTransfer: 'bank-transfer',
} as const;
export type PaymentMethod = (typeof PAYMENT)[keyof typeof PAYMENT];

/** What the card form accepts: 0000-0000-0000-0000, a future MM/YYYY, 3 or 4 digits, letters only. */
export type CardDetails = { number: string; expiry: string; cvv: string; holder: string };

/** A test card the Toolshop's payment check accepts. It is not a real card number. */
export const buildCard = (now = new Date()): CardDetails => ({
  number: '4111-1111-1111-1111',
  expiry: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear() + 2)}`,
  cvv: '123',
  holder: 'QA Automation',
});
