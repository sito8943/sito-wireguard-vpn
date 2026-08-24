import { Button, IconButton, useDialog } from "@sito/ui";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

import { useVpn } from "./providers/VpnProvider";
import { TunnelCard } from "./components/TunnelCard";
import { ImportDialog, PickedConfFile } from "./components/ImportDialog";
import { DepsBanner } from "./components/DepsBanner";
import { Spinner } from "@/shared/components/elements/Spinner";
import { BUTTON_COLOR, BUTTON_VARIANT } from "@/shared/constants";
import { t } from "@/lang";
import { CONF_EXTENSION } from "./constants";
import { fileStem } from "./utils";

import "@/styles/views/Tunnels.css";

export function Tunnels() {
  const {
    tunnels,
    wgQuickPath,
    loading,
    busyTunnel,
    error,
    recheckDeps,
    importTunnel,
    readConfFile,
    removeTunnel,
    connect,
    disconnect,
    clearError,
  } = useVpn();
  const importDialog = useDialog();

  const pickFile = async (): Promise<PickedConfFile | null> => {
    const path = await openFileDialog({
      multiple: false,
      filters: [{ name: t("confFilter"), extensions: [CONF_EXTENSION] }],
    });
    if (!path) return null;
    const content = await readConfFile(path);
    return { name: fileStem(path), content };
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
          onClick={importDialog.handleOpen}
        />
      </header>

      <DepsBanner visible={!wgQuickPath} onRecheck={recheckDeps} />

      {error ? (
        <aside className="error">
          <p>
            {t("errorGeneric")} {error}
          </p>
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
            onClick={importDialog.handleOpen}
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
              busy={busyTunnel === tunnel.name}
              onConnect={connect}
              onDisconnect={disconnect}
              onDelete={removeTunnel}
            />
          ))}
        </div>
      )}

      {importDialog.open ? (
        <ImportDialog
          open={importDialog.open}
          onClose={importDialog.handleClose}
          busy={busyTunnel !== null}
          onSave={(name, content) => importTunnel({ name, content })}
          onPickFile={pickFile}
        />
      ) : null}
    </section>
  );
}
