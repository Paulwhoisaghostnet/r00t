/** Dev-only: when '1', app acts as if NIMROD_WALLET is connected (no Beacon). For Ghostnet self-test. */
export const NIMROD_TEST_MODE = import.meta.env.VITE_NIMROD_TEST === '1';

/** Current Tezos network. Set VITE_NETWORK=ghostnet at build time for testnet. */
export const NETWORK = (import.meta.env.VITE_NETWORK === 'ghostnet' ? 'ghostnet' : 'mainnet') as 'mainnet' | 'ghostnet';

/** TzKT API base URL for the current network. */
export const TZKT_BASE_URL =
  NETWORK === 'ghostnet' ? 'https://api.ghostnet.tzkt.io/v1' : 'https://api.tzkt.io/v1';

/**
 * Nimrod's Tezos wallet (r00t experiment).
 * Funded with 20 XTZ for startup; once signer is live, agent can sign via backend. Payments to this address go to the human as intermediary.
 */
export const NIMROD_WALLET = 'tz1MrLSKWNZjY7ugAUUstDaAASuZVNXEuxQ7';

/** Human's wallet – pay-the-human (XTZ turned over to human as intermediary). */
export const HUMAN_WALLET = 'tz1cgZ6PWKoER3gvW3jGKPHgBkRnpj8XzLm2';

/** Min XTZ (mutez) for paid export; payment must go to NIMROD_WALLET. Nimrod keeps a register; pays human in 1 monthly lump. */
export const EXPORT_PRICE_MUTEZ = 500_000;

/** Trader tree upgraded module: price (mutez) for 30 days' access; payment to NIMROD_WALLET. */
export const TRADER_TREE_UPGRADED_PRICE_MUTEZ = 1_000_000; // 1 XTZ
export const TRADER_TREE_UPGRADED_DAYS = 30;
