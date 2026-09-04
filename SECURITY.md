# Security

## Demo vs production

This repository is a hackathon prototype. Default `FACILITATOR=mock` **does not move funds**. Do not point a production wallet at mock mode.

## Confirmation gate

MCP `buy_product` requires a one-time `confirmToken` from `quote_product`. Tokens expire (~120s) and cannot be reused. The agent must show the quote (product, amount, asset, network) and wait for explicit human approval.

## x402 replay

Payment nonces are single-use. A replayed `X-PAYMENT` header is rejected.

## Limits

Default per-transaction cap is `$10` (`MAX_AMOUNT_CENTS=1000`), below the Agent OS x402 daily limit of `$20`. Raise this only after you understand the wallet that will sign.

## B402 credentials

When `FACILITATOR=binance`, keep `B402_PRIVATE_KEY` out of git, logs, and screenshots. Rotate the RSA key if it leaks. `B402Client.fromEnv()` (and our hand-rolled client) throws if only some of the four env vars are set.

## Reporting

Open a GitHub issue or email the maintainer. Do not file a public issue with live keys or customer PII.
