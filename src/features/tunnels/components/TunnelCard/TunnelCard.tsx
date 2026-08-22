import {
  Button,
  BUTTON_COLOR_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  IconButton,
} from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

import { StatusBadge } from "../StatusBadge";
import { t } from "../../../../lang";
import { TunnelCardPropsType } from "./types";

import "../../../../styles/components/TunnelCard.css";

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
    <article className="TunnelCard">
      <div className="head">
        <h2 className="name">
          <FontAwesomeIcon icon={faShieldHalved} />
          {tunnel.name}
        </h2>
        <StatusBadge connected={tunnel.connected} />
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
      <div className="actions">
        <Button
          color={
            tunnel.connected
              ? BUTTON_COLOR_VARIANTS.ERROR
              : BUTTON_COLOR_VARIANTS.SUCCESS
          }
          variant={BUTTON_VARIANTS.SUBMIT}
          size={BUTTON_SIZES.LG}
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
          color={BUTTON_COLOR_VARIANTS.ERROR}
          variant={BUTTON_VARIANTS.TEXT}
          disabled={busy || tunnel.connected}
          onClick={() => onDelete(tunnel.name)}
        />
      </div>
    </article>
  );
}
