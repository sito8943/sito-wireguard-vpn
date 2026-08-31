import { useState } from "react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

import { useVpn } from "./providers/VpnProvider";
import { TunnelCard } from "./components/TunnelCard";
import { PickedConfFile, TunnelDialog } from "./components/TunnelDialog";
import { DepsBanner } from "./components/DepsBanner";
import { Button } from "@/shared/components/elements/Button";
import { IconButton } from "@/shared/components/elements/IconButton";
import { Spinner } from "@/shared/components/elements/Spinner";
import { ConfirmDialog } from "@/shared/components/patterns/ConfirmDialog";
import { BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/constants";
import { t } from "@/lang";
import { TunnelInfo } from "@/shared/models";
import { CONF_EXTENSION, EMPTY_DRAFT, TUNNEL_DIALOG_MODE } from "./constants";
import { TunnelDraft } from "./types";
import { fileStem } from "./utils";

import "@/styles/views/Tunnels.css";

export function Tunnels() {
  const {
    tunnels,
    rates,
    wgQuickPath,
    loading,
    busyTunnel,
    error,
    pendingDnsService,
    recheckDeps,
    saveTunnel,
    readConfFile,
    readTunnel,
    removeTunnel,
    connect,
    disconnect,
    restoreDns,
    clearError,
  } = useVpn();
  const [draft, setDraft] = useState<TunnelDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const pickFile = async (): Promise<PickedConfFile | null> => {
    const path = await openFileDialog({
      multiple: false,
      filters: [{ name: t("confFilter"), extensions: [CONF_EXTENSION] }],
    });
    if (!path) return null;
    const content = await readConfFile(path);
    return { name: fileStem(path), content };
  };

  const openEdit = async (tunnel: TunnelInfo) => {
    const content = await readTunnel(tunnel.name);
    if (content === null) return;
    setDraft({
      mode: TUNNEL_DIALOG_MODE.EDIT,
      name: tunnel.name,
      content,
      connected: tunnel.connected,
      manageDns: tunnel.manageDns,
      dns: tunnel.dns,
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeTunnel(pendingDelete);
    setPendingDelete(null);
  };

  if (loading) {
    return (
      <section className="Tunnels loading">
        <Spinner />
      </section>
    );
  }

  return (
    <section className="Tunnels">
      <header className="header">
        <h1 className="title">{t("appName")}</h1>
        <IconButton
          aria-label={t("addTunnel")}
          icon={<FontAwesomeIcon icon={faPlus} />}
          color={BUTTON_COLOR.PRIMARY}
          onClick={() => setDraft(EMPTY_DRAFT)}
        />
      </header>

      <DepsBanner visible={!wgQuickPath} onRecheck={recheckDeps} />

      {pendingDnsService ? (
        <aside className="dns-pending">
          <p>{t("dnsPendingText", pendingDnsService)}</p>
          <Button
            size={BUTTON_SIZE.SM}
            variant={BUTTON_VARIANT.SUBMIT}
            onClick={restoreDns}
          >
            {t("dnsPendingAction")}
          </Button>
        </aside>
      ) : null}

      {error ? (
        <aside className="error">
          <p>{error}</p>
          <IconButton
            aria-label={t("cancel")}
            icon={<FontAwesomeIcon icon={faXmark} />}
            variant={BUTTON_VARIANT.TEXT}
            color={BUTTON_COLOR.ERROR}
            onClick={clearError}
          />
        </aside>
      ) : null}

      {tunnels.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{t("emptyTitle")}</p>
          <p className="empty-hint">{t("emptyHint")}</p>
          <Button
            color={BUTTON_COLOR.PRIMARY}
            variant={BUTTON_VARIANT.SUBMIT}
            onClick={() => setDraft(EMPTY_DRAFT)}
          >
            <FontAwesomeIcon icon={faPlus} /> {t("addTunnel")}
          </Button>
        </div>
      ) : (
        <div className="list">
          {tunnels.map((tunnel) => (
            <TunnelCard
              key={tunnel.name}
              tunnel={tunnel}
              rate={rates[tunnel.name] ?? null}
              busy={busyTunnel === tunnel.name}
              onConnect={connect}
              onDisconnect={disconnect}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      {draft ? (
        <TunnelDialog
          open
          draft={draft}
          existingNames={tunnels.map((tunnel) => tunnel.name)}
          busy={busyTunnel !== null}
          onClose={() => setDraft(null)}
          onSave={saveTunnel}
          onPickFile={pickFile}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteText", pendingDelete ?? "")}
        confirmText={t("confirmDeleteAction")}
        confirmColor={BUTTON_COLOR.ERROR}
        busy={busyTunnel !== null}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </section>
  );
}
