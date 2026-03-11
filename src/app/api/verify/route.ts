import { NextRequest, NextResponse } from 'next/server';

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

// Use multiple RPC endpoints as fallback
const RPC_ENDPOINTS = [
  process.env.SOLANA_RPC_URL,
  process.env.HELIUS_RPC_URL,
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
].filter(Boolean) as string[];

// Roles de Holder con IDs directos
const HOLDER_ROLES = [
  { name: 'Camaroncin', id: '1481187002991906947', min: 1_000, max: 900_000 },
  { name: 'Believer', id: '1481092832088424621', min: 1_000_000, max: 3_000_000 },
  { name: 'Ballenita', id: '1481092950191767733', min: 3_000_000, max: 6_000_000 },
  { name: 'Doggyllonario', id: '1481093065396453396', min: 6_000_000, max: 100_000_000 },
];

// Discord API helper
async function discordAPI(endpoint: string, method: string = 'GET'): Promise<any> {
  const url = `https://discord.com/api/v10${endpoint}`;
  
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bot ${DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Discord ${res.status}: ${errorText}`);
  }
  
  return res.json();
}

// Get token balance with RPC fallback
async function getTokenBalance(wallet: string, mint: string): Promise<number> {
  const DOGGY_MINT = 'BS7HxRitaY5ipGfbek1nmatWLbaS9yoWRSEQzCb3pump';
  
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      console.log(`📡 Trying RPC: ${rpcUrl}`);
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'doggy-verify',
          method: 'getTokenAccountsByOwner',
          params: [
            wallet,
            { mint: mint },
            { encoding: 'jsonParsed' }
          ]
        })
      });

      if (!response.ok) {
        console.log(`❌ RPC ${rpcUrl} returned ${response.status}`);
        continue;
      }

      const text = await response.text();
      
      if (!text || text.trim() === '' || text.trim() === '<') {
        console.log(`❌ RPC ${rpcUrl} returned empty/invalid response`);
        continue;
      }

      const data = JSON.parse(text);
      
      if (data.error) {
        console.log(`❌ RPC ${rpcUrl} error:`, data.error);
        continue;
      }
      
      if (data.result && data.result.value && data.result.value.length > 0) {
        const accountData = data.result.value[0].account.data;
        if (accountData && accountData.parsed && accountData.parsed.info) {
          const balance = accountData.parsed.info.tokenAmount.uiAmount;
          console.log(`✅ Got balance from ${rpcUrl}: ${balance}`);
          return balance || 0;
        }
      }
      
      // No tokens found but RPC worked
      return 0;
      
    } catch (error: any) {
      console.log(`❌ RPC ${rpcUrl} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('Todos los RPCs fallaron. Intenta de nuevo en unos momentos.');
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Verify endpoint called');
    
    // Check environment
    if (!DISCORD_TOKEN || !GUILD_ID) {
      console.error('❌ Missing env vars');
      return NextResponse.json({ 
        error: 'Server misconfigured. Contact admin.',
        missing: {
          DISCORD_TOKEN: !DISCORD_TOKEN,
          GUILD_ID: !GUILD_ID,
        }
      }, { status: 500 });
    }

    // Parse body
    const body = await request.json();
    const { wallet, discordId } = body;

    if (!wallet || !discordId) {
      return NextResponse.json({ 
        error: 'Missing wallet or discordId' 
      }, { status: 400 });
    }

    console.log(`🔍 Verifying: ${discordId} - ${wallet}`);

    // Get balance
    const DOGGY_MINT = 'BS7HxRitaY5ipGfbek1nmatWLbaS9yoWRSEQzCb3pump';
    const balance = await getTokenBalance(wallet, DOGGY_MINT);

    console.log(`💎 Balance: ${balance.toLocaleString()} DOGGY`);

    // Find matching role
    let role = null;
    for (const r of HOLDER_ROLES) {
      if (balance >= r.min && balance < r.max) {
        role = r;
        break;
      }
    }

    if (!role) {
      return NextResponse.json({ 
        error: `Necesitas mínimo 1,000 DOGGY. Tienes: ${balance.toLocaleString()} DOGGY`,
        balance 
      }, { status: 400 });
    }

    // Remove old roles
    for (const r of HOLDER_ROLES) {
      try {
        await discordAPI(`/guilds/${GUILD_ID}/members/${discordId}/roles/${r.id}`, 'DELETE');
        console.log(`❌ Removed ${r.name}`);
      } catch (e) {
        // Ignore
      }
    }

    // Add new role
    await discordAPI(`/guilds/${GUILD_ID}/members/${discordId}/roles/${role.id}`, 'PUT');
    console.log(`✅ Assigned ${role.name} to ${discordId}`);

    return NextResponse.json({ 
      success: true,
      role: role.name,
      balance: balance,
      message: `¡Rol ${role.name} asignado!`
    });

  } catch (error: any) {
    console.error('❌ Verify error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal error' 
    }, { status: 500 });
  }
}
