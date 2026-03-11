import { Connection, PublicKey } from "@solana/web3.js";

const DOGGY_TOKEN_MINT = "BS7HxRitaY5ipGfbek1nmatWLbaS9yoWRSEQzCb3pump";
const BURN_ADDRESS = "Burn111111111111111111111111111111111111111";

export interface TokenVerification {
  holding: number;
  burned: number;
  isHolder: boolean;
  hasBurned: boolean;
}

export async function verifyTokenHoldings(
  walletAddress: string
): Promise<TokenVerification> {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const walletPubkey = new PublicKey(walletAddress);
  const tokenMint = new PublicKey(DOGGY_TOKEN_MINT);

  try {
    // Get token accounts for the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: tokenMint }
    );

    let holding = 0;
    
    // Sum up all token accounts for this mint
    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed.info;
      holding += parseFloat(info.tokenAmount.uiAmount || "0");
    }

    // For now, burn verification is disabled (requires complex transaction parsing)
    // This can be enhanced later
    const burned = 0;

    return {
      holding,
      burned,
      isHolder: holding > 0,
      hasBurned: burned > 0,
    };
  } catch (error) {
    console.error("Error verifying tokens:", error);
    return {
      holding: 0,
      burned: 0,
      isHolder: false,
      hasBurned: false,
    };
  }
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toFixed(2);
}
