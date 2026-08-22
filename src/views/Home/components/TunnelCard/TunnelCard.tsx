import { Button, IconButton } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

import { StatusBadge } from "../../../../components/StatusBadge";
import { t } from "../../../../lang";
import { TunnelCardPropsType } from "./types";

import "./styles.css";

export function TunnelCard({
  tunnel,
  busy,
  onConnect,
  onDisconnect,
  onDelete,
}: TunnelCardPropsType) {
  const toggle = () =>
    tunnel.connected ? onDisconnect(tunnel.name) : onConnect(tunnel.name);

  return (
    <article className="tunnel-card">
      <div className="tunnel-card-head">
        <h2 className="tunnel-card-name">
          <FontAwesomeIcon icon={faShieldHalved} />
          {tunnel.name}
        </h2>
        <StatusBadge connected={tunnel.connected} />
      </div>
      <dl className="tunnel-card-meta">
        {tunnel.address ? (
          <div>
            <dt>IP</dt>
            <dd>{tunnel.address}</dd>
          </div>
        ) : null}
        {tunnel.endpoint ? (
          <div>
            <dt>Endpoint</dt>
            <dd>{tunnel.endpoint}</dd>
          </div>
        ) : null}
      </dl>
      <div className="tunnel-card-actions">
        <Button
          color={tunnel.connected ? "error" : "success"}
          variant="submit"
          size="lg"
          loading={busy}
          loadingLabel={t("working")}
          onClick={toggle}
          className="tunnel-card-toggle"
        >
          {tunnel.connected ? t("disconnect") : t("connect")}
        </Button>
        <IconButton
          aria-label={t("deleteTunnel")}
          icon={<FontAwesomeIcon icon={faTrash} />}
          color="error"
          variant="text"
          disabled={busy || tunnel.connected}
          onClick={() => onDelete(tunnel.name)}
        />
      </div>
    </article>
  );
}
