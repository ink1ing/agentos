// Wallet adapters. Demo uses MockWallet. Production: Trust Wallet AgentKit / viem EIP-3009.
import crypto from "node:crypto";

export class MockWallet {
  constructor(from = process.env.AGENT_WALLET || "0xAGENTWALLET00000000000000000000000000demo") {
    this.from = from;
    this.kind = "mock";
  }
  sign({ challenge, email }) {
    const payload = {
      nonce: challenge.nonce,
      from: this.from,
      amountCents: Math.round(Number(challenge.maxAmountRequired) * 100),
      email: email || "",
      signature: crypto.randomBytes(65).toString("hex"),
    };
    return Buffer.from(
      JSON.stringify({
        x402Version: 2,
        scheme: "exact",
        network: challenge.network,
        asset: challenge.asset,
        payload,
      })
    ).toString("base64");
  }
}

export function defaultWallet() {
  return new MockWallet();
}
