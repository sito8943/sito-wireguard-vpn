import { Button, IconButton, Spinner, useDialog } from "@sito/ui";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

import { useVpn } from "../../providers/VpnProvider";
import { TunnelCard } from "./components/TunnelCard";
import { ImportDialog } from "./components/ImportDialog";
import { DepsBanner } from "./components/DepsBanner";
import { t } from "../../lang";
import { fileStem } from "./utils";

import "./styles.css";

export function Home() {
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

  const pickFile = async () => {
    const path = await openFileDialog({
      multiple: false,
      filters: [{ name: "WireGuard", extensions: ["conf"] }],
    });
    if (!path) return null;
    const content = await readConfFile(path);
    return { name: fileStem(path), content };
  };

  if (loading) {
    return (
      <section className="home-loading">
        <Spinner />
      </section>
    );
  }

  return (
    <section className="home">
      <header className="home-header">
        <h1 className="home-title">{t("appName")}</h1>
        <IconButton
          aria-label={t("addTunnel")}
          icon={<FontAwesomeIcon icon={faPlus} />}
          color="primary"
          onClick={importDialog.handleOpen}
        />
      </header>

      <DepsBanner visible={!wgQuickPath} onRecheck={recheckDeps} />

      {error ? (
        <aside className="home-error">
          <p>
            {t("errorGeneric")} {error}
          </p>
          <IconButton
            aria-label={t("cancel")}
            icon={<FontAwesomeIcon icon={faXmark} />}
            variant="text"
            color="error"
            onClick={clearError}
          />
        </aside>
      ) : null}

      {tunnels.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-title">{t("emptyTitle")}</p>
          <p className="home-empty-hint">{t("emptyHint")}</p>
          <Button color="primary" variant="submit" onClick={importDialog.handleOpen}>
            <FontAwesomeIcon icon={faPlus} /> {t("addTunnel")}
          </Button>
        </div>
      ) : (
        <div className="home-list">
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

      <ImportDialog
        open={importDialog.open}
        onClose={importDialog.handleClose}
        busy={busyTunnel !== null}
        onSave={(name, content) => importTunnel({ name, content })}
        onPickFile={pickFile}
      />
    </section>
  );
}
