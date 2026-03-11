import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';

const DOGGY_TOKEN_MINT = 'BS7HxRitaY5ipGfbek1nmatWLbaS9yoWRSEQzCb3pump';

// Simple in-memory store (resets on each deploy, but verification is quick)
const verifications: Record<string, any> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, wallet, discordId } = body;

    if (!code || !wallet) {
      return NextResponse.json({ error: 'Missing code or wallet' }, { status: 400 });
    }

    // Verify holdings
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const walletPubkey = new PublicKey(wallet);
    const tokenMint = new PublicKey(DOGGY_TOKEN_MINT);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: tokenMint }
    );

    let holdings = 0;
    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed.info;
      holdings += parseFloat(info.tokenAmount.uiAmount || '0');
    }

    // Generate confirmation code
    const confirmCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Store verification (in-memory for now)
    verifications[confirmCode] = {
      originalCode: code,
      wallet,
      discordId,
      holdings,
      timestamp: Date.now(),
    };

    // Determine role
    let role = '';
    if (holdings >= 1_000 && holdings < 100_000) {
      role = 'DoggyHolder';
    } else if (holdings >= 100_000 && holdings < 500_000) {
      role = 'DoggyOG';
    } else if (holdings >= 500_000) {
      role = 'DoggyMaxi';
    }

    return NextResponse.json({
      success: true,
      holdings,
      role,
      confirmCode,
      message: role 
        ? `✅ ¡Verificación exitosa! Tu código de confirmación es: **${confirmCode}**`
        : '❌ No tienes suficientes DOGGY para obtener un rol. Mínimo: 1,000 DOGGY',
    });

  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const confirmCode = searchParams.get('confirmCode');
  
  if (confirmCode && verifications[confirmCode]) {
    return NextResponse.json(verifications[confirmCode]);
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
