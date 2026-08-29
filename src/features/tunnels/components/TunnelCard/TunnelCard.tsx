import { Button, IconButton } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faShieldHalved,
  faArrowDown,
  faArrowUp,
} from "@fortawesome/free-solid-svg-icons";

import { StatusBadge } from "@/features/tunnels/components/StatusBadge";
import { getTunnelStatus, formatRate } from "@/features/tunnels/utils";
import { BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/constants";
import { t } from "@/lang";
import { TunnelCardPropsType } from "./types";

import "@/styles/components/TunnelCard.css";

export function TunnelCard({
  tunnel,
  rate,
  busy,
  onConnect,
  onDisconnect,
  onDelete,
}: TunnelCardPropsType) {
  const toggle = () =>
    tunnel.connected ? onDisconnect(tunnel.name) : onConnect(tunnel.name);

  return (
    <article className="TunnelCard">
      <div className="head">
        <h2 className="name">
          <FontAwesomeIcon icon={faShieldHalved} />
          {tunnel.name}
        </h2>
        <StatusBadge status={getTunnelStatus(tunnel)} />
      </div>
      <dl className="meta">
        {tunnel.address ? (
          <div>
            <dt>{t("ipLabel")}</dt>
            <dd>{tunnel.address}</dd>
          </div>
        ) : null}
        {tunnel.endpoint ? (
          <div>
            <dt>{t("endpointLabel")}</dt>
            <dd>{tunnel.endpoint}</dd>
          </div>
        ) : null}
      </dl>
      {tunnel.connected && rate ? (
        <div className="traffic">
          <span aria-label={t("download")}>
            <FontAwesomeIcon icon={faArrowDown} /> {formatRate(rate.downBps)}
          </span>
          <span aria-label={t("upload")}>
            <FontAwesomeIcon icon={faArrowUp} /> {formatRate(rate.upBps)}
          </span>
        </div>
      ) : null}
      <div className="actions">
        <Button
          color={tunnel.connected ? BUTTON_COLOR.ERROR : BUTTON_COLOR.SUCCESS}
          variant={BUTTON_VARIANT.SUBMIT}
          size={BUTTON_SIZE.LG}
          loading={busy}
          loadingLabel={t("working")}
          onClick={toggle}
          className="toggle"
        >
          {tunnel.connected ? t("disconnect") : t("connect")}
        </Button>
        <IconButton
          aria-label={t("deleteTunnel")}
          icon={<FontAwesomeIcon icon={faTrash} />}
          color={BUTTON_COLOR.ERROR}
          variant={BUTTON_VARIANT.TEXT}
          disabled={busy || tunnel.connected}
          onClick={() => onDelete(tunnel.name)}
        />
      </div>
    </article>
  );
}
