import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const RPC_URL = process.env.SOLANA_RPC_URL;
  
  console.log('🔍 Debug check requested');
  
  // Test Discord API
  let discordTest = '❌ Not tested';
  if (DISCORD_TOKEN) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
        headers: {
          'Authorization': `Bot ${DISCORD_TOKEN}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        discordTest = `✅ Connected to: ${data.name}`;
      } else {
        const error = await res.text();
        discordTest = `❌ Error: ${res.status} - ${error}`;
      }
    } catch (e: any) {
      discordTest = `❌ Error: ${e.message}`;
    }
  }
  
  // Test Solana RPC
  let rpcTest = '❌ Not tested';
  const testWallet = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'; // Random wallet for test
  const DOGGY_MINT = 'BS7HxRitaY5ipGfbek1nmatWLbaS9yoWRSEQzCb3pump';
  
  if (RPC_URL) {
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test',
          method: 'getHealth',
          params: []
        })
      });
      
      const text = await response.text();
      
      if (text && text.trim() !== '') {
        const data = JSON.parse(text);
        rpcTest = `✅ RPC responding: ${data.result || 'ok'}`;
      } else {
        rpcTest = '❌ Empty response from RPC';
      }
    } catch (e: any) {
      rpcTest = `❌ Error: ${e.message}`;
    }
  }
  
  return NextResponse.json({
    environment: {
      DISCORD_TOKEN: DISCORD_TOKEN ? `✅ ${DISCORD_TOKEN.substring(0, 15)}...` : '❌ Missing',
      GUILD_ID: GUILD_ID || '❌ Missing',
      SOLANA_RPC_URL: RPC_URL || '❌ Missing',
    },
    tests: {
      discord: discordTest,
      rpc: rpcTest,
    },
    timestamp: new Date().toISOString(),
  });
}
