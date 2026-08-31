import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TunnelInfo, TunnelRate } from "@/features/tunnels/models/tunnel";
import {
  SaveTunnelInput,
  TunnelManager,
} from "@/features/tunnels/managers/TunnelManager";
import { ERROR_CODE } from "@/features/tunnels/constants";
import { translateError } from "@/features/tunnels/utils";
import { VpnContext } from "./context";
import { MS_PER_SECOND, STATUS_POLL_INTERVAL_MS } from "./constants";
import { TrafficSample, VpnContextValue } from "./types";

export function VpnProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef(new TunnelManager());
  const samplesRef = useRef<Record<string, TrafficSample>>({});
  // Espejo de `tunnels` para leer el estado actual dentro de los callbacks sin
  // recrearlos (y sin reiniciar el intervalo de polling) en cada refresh.
  const tunnelsRef = useRef<TunnelInfo[]>([]);
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [rates, setRates] = useState<Record<string, TunnelRate>>({});
  const [wgQuickPath, setWgQuickPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTunnel, setBusyTunnel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await managerRef.current.list();
      const now = Date.now();
      const nextRates: Record<string, TunnelRate> = {};
      const nextSamples: Record<string, TrafficSample> = {};
      for (const tunnel of list) {
        if (
          !tunnel.connected ||
          tunnel.rxBytes === null ||
          tunnel.txBytes === null
        ) {
          continue;
        }
        const prev = samplesRef.current[tunnel.name];
        if (prev) {
          const seconds = (now - prev.at) / MS_PER_SECOND;
          if (seconds > 0) {
            nextRates[tunnel.name] = {
              downBps: Math.max(0, (tunnel.rxBytes - prev.rx) / seconds),
              upBps: Math.max(0, (tunnel.txBytes - prev.tx) / seconds),
            };
          }
        }
        nextSamples[tunnel.name] = {
          rx: tunnel.rxBytes,
          tx: tunnel.txBytes,
          at: now,
        };
      }
      samplesRef.current = nextSamples;
      tunnelsRef.current = list;
      setRates(nextRates);
      setTunnels(list);
    } catch (e) {
      setError(translateError(String(e)));
    }
  }, []);

  const recheckDeps = useCallback(async () => {
    try {
      setWgQuickPath(await managerRef.current.checkDeps());
    } catch (e) {
      setError(translateError(String(e)));
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([recheckDeps(), refresh()]);
      setLoading(false);
    })();
  }, [recheckDeps, refresh]);

  useEffect(() => {
    const id = setInterval(refresh, STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const runBusy = useCallback(
    async (name: string, action: () => Promise<unknown>): Promise<boolean> => {
      setBusyTunnel(name);
      setError(null);
      try {
        await action();
        await refresh();
        return true;
      } catch (e) {
        const code = String(e);
        // Cerrar el prompt de contraseña es una decisión del usuario, no un fallo.
        if (code !== ERROR_CODE.USER_CANCELED) setError(translateError(code));
        return false;
      } finally {
        setBusyTunnel(null);
      }
    },
    [refresh],
  );

  const saveTunnel = useCallback(
    (input: SaveTunnelInput) =>
      runBusy(input.name, async () => {
        await managerRef.current.save(input);
        const previous = input.previousName;
        if (!previous) return;
        // wg-quick sigue usando la copia vieja de /etc/wireguard: hay que bajar
        // el túnel y volver a subirlo para que la edición surta efecto.
        const wasConnected = tunnelsRef.current.some(
          (tunnel) => tunnel.name === previous && tunnel.connected,
        );
        if (wasConnected) {
          await managerRef.current.reconnect(input.name, previous);
        }
      }),
    [runBusy],
  );

  const readConfFile = useCallback(
    (path: string) => managerRef.current.readConfFile(path),
    [],
  );

  const readTunnel = useCallback(async (name: string) => {
    try {
      return await managerRef.current.read(name);
    } catch (e) {
      setError(translateError(String(e)));
      return null;
    }
  }, []);

  const removeTunnel = useCallback(
    (name: string) => runBusy(name, () => managerRef.current.remove(name)),
    [runBusy],
  );

  const connect = useCallback(
    (name: string) => runBusy(name, () => managerRef.current.connect(name)),
    [runBusy],
  );

  const disconnect = useCallback(
    (name: string) => runBusy(name, () => managerRef.current.disconnect(name)),
    [runBusy],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<VpnContextValue>(
    () => ({
      tunnels,
      rates,
      wgQuickPath,
      loading,
      busyTunnel,
      error,
      refresh,
      recheckDeps,
      saveTunnel,
      readConfFile,
      readTunnel,
      removeTunnel,
      connect,
      disconnect,
      clearError,
    }),
    [
      tunnels,
      rates,
      wgQuickPath,
      loading,
      busyTunnel,
      error,
      refresh,
      recheckDeps,
      saveTunnel,
      readConfFile,
      readTunnel,
      removeTunnel,
      connect,
      disconnect,
      clearError,
    ],
  );

  return <VpnContext.Provider value={value}>{children}</VpnContext.Provider>;
}
