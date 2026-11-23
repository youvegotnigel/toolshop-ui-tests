/**
 * What a shopper types on the address step. The Toolshop looks the postcode up and fills in street,
 * city and state itself, so only these three fields are entered.
 */
export type AddressEntry = { country: string; countryCode: string; postalCode: string; houseNumber: string };

export const GERMAN_ADDRESS: AddressEntry = {
  country: 'Germany',
  countryCode: 'DE',
  postalCode: '10115',
  houseNumber: '12',
};

/** Payment methods that need no extra details. The value is the option's value attribute. */
export const PAYMENT = { cashOnDelivery: 'cash-on-delivery', bankTransfer: 'bank-transfer' } as const;
export type PaymentMethod = (typeof PAYMENT)[keyof typeof PAYMENT];
