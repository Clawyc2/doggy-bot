"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { verifyTokenHoldings, formatTokenAmount, TokenVerification } from "@/lib/tokenVerification";

export default function VerifyPage() {
  const { publicKey, signMessage, connected } = useWallet();
  const [verification, setVerification] = useState<TokenVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  
  // Get code and discord from URL
  const [code, setCode] = useState<string>('');
  const [discordId, setDiscordId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get('code') || '');
    setDiscordId(params.get('discord') || '');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!publicKey) {
      setError("Wallet no conectada");
      return;
    }

    if (!code) {
      setError("Código de verificación no encontrado. Inicia el proceso desde Discord.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify holdings locally first
      const holdingsResult = await verifyTokenHoldings(publicKey.toBase58());
      setVerification(holdingsResult);

      if (!holdingsResult.isHolder) {
        setError("No tienes suficientes DOGGY para obtener un rol. Mínimo: 1,000 DOGGY");
        setLoading(false);
        return;
      }

      // Send to API
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          wallet: publicKey.toBase58(),
          discordId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        setConfirmCode(result.confirmCode);
        setAssignedRole(result.role);
      } else {
        setError(result.message || result.error || 'Error en la verificación');
      }

    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Error al verificar");
    } finally {
      setLoading(false);
    }
  }, [publicKey, code, discordId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🐕 Verificación Doggy
          </h1>
          <p className="text-gray-400 text-lg">
            Verifica tus holdings de $DOGGY para desbloquear roles en Discord
          </p>
        </div>

        {/* Success State */}
        {success && (
          <div className="space-y-4">
            <div className="bg-green-900/20 backdrop-blur-sm rounded-2xl p-8 border border-green-700 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-4">¡Verificación Exitosa!</h2>
              <p className="text-gray-300 mb-6">
                Tu wallet ha sido verificada y calificas para el rol:
              </p>
              <div className="text-4xl font-bold text-doggy-primary mb-6">
                @{assignedRole}
              </div>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <p className="text-gray-400 text-sm mb-2">Tu código de confirmación:</p>
                <div className="text-4xl font-mono font-bold text-white tracking-wider">
                  {confirmCode}
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-left">
                <p className="text-blue-400 font-bold mb-2">📋 Siguientes pasos:</p>
                <ol className="text-gray-300 space-y-2">
                  <li>1. Copia el código de arriba</li>
                  <li>2. Vuelve a Discord</li>
                  <li>3. Usa el comando: <code className="bg-gray-800 px-2 py-1 rounded">/confirmar {confirmCode}</code></li>
                  <li>4. ¡Listo! Recibirás tu rol automáticamente</li>
                </ol>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(confirmCode);
                  alert('¡Código copiado!');
                }}
                className="px-8 py-3 bg-doggy-primary hover:bg-doggy-accent text-white font-bold rounded-lg transition"
              >
                📋 Copiar Código
              </button>
            </div>
          </div>
        )}

        {/* Wallet Connection */}
        {!success && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-6 relative z-50">
            <div className="flex justify-center mb-6">
              <WalletMultiButton />
            </div>

            {publicKey && (
              <div className="text-center text-gray-400 text-sm">
                Conectado: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
              </div>
            )}
          </div>
        )}

        {/* Verify Button */}
        {connected && !success && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-6">
            <div className="text-center">
              <p className="text-gray-300 mb-6">
                Tu wallet está conectada. Haz click en "Verificar" para revisar tus holdings.
              </p>
              
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Este proceso solo leerá tu balance de DOGGY. No se realizarán transacciones ni se solicitarán permisos de gasto.
                </p>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || !code}
                className="px-8 py-3 bg-doggy-primary hover:bg-doggy-accent text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verificando..." : !code ? "Código no encontrado" : "🔍 Verificar Holdings"}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-doggy-primary mx-auto mb-4"></div>
            <p className="text-white">Verificando tus holdings de DOGGY...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 backdrop-blur-sm rounded-2xl p-8 border border-red-700 text-center mb-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={handleVerify}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Instructions for non-connected users */}
        {!connected && !success && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              Cómo funciona
            </h3>
            <ol className="text-gray-300 space-y-3">
              <li className="flex items-start">
                <span className="bg-doggy-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                Conecta tu wallet de Solana
              </li>
              <li className="flex items-start">
                <span className="bg-doggy-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                Verificamos tus holdings de DOGGY
              </li>
              <li className="flex items-start">
                <span className="bg-doggy-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                Recibes un código de confirmación
              </li>
              <li className="flex items-start">
                <span className="bg-doggy-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                Úsalo en Discord para obtener tu rol
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 text-gray-500 text-sm">
        Creado con ❤️ por Clawy •{" "}
        <a
          href="https://solscan.io/token/BS7HxRitaY5ipGfbek1nmatWLbaS9yoWRSEQzCb3pump"
          target="_blank"
          rel="noopener noreferrer"
          className="text-doggy-primary hover:underline"
        >
          Ver DOGGY en Solscan
        </a>
      </div>
    </div>
  );
}
