/** Data for the data-driven sort test: the option label a shopper picks and the order it promises. */
export type SortOption = { label: string; value: string; order: 'ascending' | 'descending' };

export const PRICE_SORTS: readonly SortOption[] = [
  { label: 'Price (Low - High)', value: 'price,asc', order: 'ascending' },
  { label: 'Price (High - Low)', value: 'price,desc', order: 'descending' },
];
