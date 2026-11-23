---
name: test-data
description: 'Create and clean up the data a Toolshop UI test needs: factory fixtures (products, catalogues, customers), builders with the run tag and a search word, cleanup newest first, HTTP 409 retention after orders, and the rules of the shared public database. Use when a test needs data or a new factory.'
---

# Test data

## Critical

- **Every test owns its data**, created through the API by fixtures. Never seeded products, ids or counts,
  never the shared demo customers.
- **Every record carries the run tag** `qa-<RUN_ID>` (names, slugs, emails) so the teardown sweep can find it.
- **Every factory registers its cleanup** right after creating (`cleanup.add`), so it runs even when the test fails.
- **Search with the builder's `searchWord`**, never the run tag (MySQL full-text treats `-` as "exclude").
- **Searchable before use**: products a test will search for go through `searchable(word, count)` (built into
  `createdProduct` and `createdCatalogue`), because the index can trail a new product in CI.
- **Products need `stock`** (else "Out of stock") and **prices between 1 and 99** (the sort's default price filter).
- **Orders are permanent**: a customer, product, category or brand an invoice references answers **409**. Tests that
  place orders use `shopper: 'new-customer'`; cleanup records the 409 as `retained`, the hourly reset removes it.
- Builders live in `src/data/`, factories in `src/fixtures/data.fixtures.ts`; specs never call the API.

## Procedure

1. Reuse a fixture if one fits: `createdProduct`, `createdCatalogue` (3 products, distinct prices, one search word),
   `createProduct({ brand, category, overrides })`, `createCustomer()`, `shopper` option.
2. New data type: a builder in `src/data/<thing>.builder.ts` (faker values, run tag, valid for both API dialects),
   a client method in `src/api/clients/`, a zod schema in `src/api/schemas/` (ids through `IdSchema`).
3. A factory fixture: create, `expect(res, 'test data setup: create <thing>').toBeOK()`, parse, `cleanup.add`, return.
4. Assert the UI against the factory's return value (`product.price`, `brand.name`), never against what the page shows.
5. Run the spec and check the teardown log: `Sweep removed 0` (or only `kept ... (HTTP 409)` after orders).

## References

- `AGENTS.md` "Toolshop facts" (database resets, caching, the with-bugs API dialect).
