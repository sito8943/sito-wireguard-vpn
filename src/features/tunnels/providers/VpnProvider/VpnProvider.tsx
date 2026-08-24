import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TunnelInfo } from "@/features/tunnels/models/tunnel";
import {
  SaveTunnelInput,
  TunnelManager,
} from "@/features/tunnels/managers/TunnelManager";
import { VpnContext } from "./context";
import { STATUS_POLL_INTERVAL_MS } from "./constants";
import { VpnContextValue } from "./types";

export function VpnProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef(new TunnelManager());
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [wgQuickPath, setWgQuickPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTunnel, setBusyTunnel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTunnels(await managerRef.current.list());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const recheckDeps = useCallback(async () => {
    try {
      setWgQuickPath(await managerRef.current.checkDeps());
    } catch (e) {
      setError(String(e));
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
    async (name: string, action: () => Promise<TunnelInfo | void>) => {
      setBusyTunnel(name);
      setError(null);
      try {
        await action();
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusyTunnel(null);
      }
    },
    [refresh],
  );

  const importTunnel = useCallback(
    (input: SaveTunnelInput) =>
      runBusy(input.name, () => managerRef.current.save(input)),
    [runBusy],
  );

  const readConfFile = useCallback(
    (path: string) => managerRef.current.readConfFile(path),
    [],
  );

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
      wgQuickPath,
      loading,
      busyTunnel,
      error,
      refresh,
      recheckDeps,
      importTunnel,
      readConfFile,
      removeTunnel,
      connect,
      disconnect,
      clearError,
    }),
    [
      tunnels,
      wgQuickPath,
      loading,
      busyTunnel,
      error,
      refresh,
      recheckDeps,
      importTunnel,
      readConfFile,
      removeTunnel,
      connect,
      disconnect,
      clearError,
    ],
  );

  return <VpnContext.Provider value={value}>{children}</VpnContext.Provider>;
}
