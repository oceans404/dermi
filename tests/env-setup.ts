// Runs before any test file imports — clears payment env vars
// so x402 middleware is skipped during tests.
delete process.env.EVM_ADDRESS;
delete process.env.STELLAR_ADDRESS;
delete process.env.EVM_MAINNET_ADDRESS;
delete process.env.STELLAR_MAINNET_ADDRESS;
delete process.env.OZ_FACILITATOR_URL;
delete process.env.OZ_API_KEY;
