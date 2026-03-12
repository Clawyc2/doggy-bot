import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface WalletEntry {
  discordId: string;
  wallet: string;
  lastVerified: string;
}

const REGISTRY_FILE = path.join('/tmp', 'wallet-registry.json');

function loadRegistry(): WalletEntry[] {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return [];
    }
    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading wallet registry:', error);
    return [];
  }
}

function saveRegistry(registry: WalletEntry[]): void {
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  } catch (error) {
    console.error('Error saving wallet registry:', error);
  }
}

// Register wallet when user verifies
export async function POST(request: NextRequest) {
  try {
    const { discordId, wallet } = await request.json();
    
    if (!discordId || !wallet) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing discordId or wallet' 
      }, { status: 400 });
    }
    
    const registry = loadRegistry();
    
    // Remove old entry for this discord user
    const filtered = registry.filter(entry => entry.discordId !== discordId);
    
    // Add new entry
    filtered.push({
      discordId,
      wallet,
      lastVerified: new Date().toISOString(),
    });
    
    saveRegistry(filtered);
    
    console.log(`✅ Wallet registered: ${discordId} -> ${wallet}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Wallet registered'
    });
    
  } catch (error: any) {
    console.error('Error registering wallet:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// Get all wallets (for snapshot)
export async function GET() {
  try {
    const registry = loadRegistry();
    return NextResponse.json({ 
      success: true,
      wallets: registry 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
