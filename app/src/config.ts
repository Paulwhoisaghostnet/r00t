/**
 * Nimrod's Tezos wallet (r00t experiment).
 * Funded with 20 XTZ for startup; once signer is live, agent can sign via backend. Payments to this address go to the human as intermediary.
 */
export const NIMROD_WALLET = 'tz1MrLSKWNZjY7ugAUUstDaAASuZVNXEuxQ7';

/** Human's wallet – pay-the-human (XTZ turned over to human as intermediary). */
export const HUMAN_WALLET = 'tz1cgZ6PWKoER3gvW3jGKPHgBkRnpj8XzLm2';

/** Min XTZ (mutez) for paid export; payment must go to HUMAN_WALLET. */
export const EXPORT_PRICE_MUTEZ = 500_000;
