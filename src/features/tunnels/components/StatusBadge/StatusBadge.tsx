import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TUNNEL_STATUS } from "@/features/tunnels/constants";
import { t } from "@/lang";
import { STATUS_ICON } from "./constants";
import { StatusBadgePropsType } from "./types";

import "@/styles/components/StatusBadge.css";

export function StatusBadge({ status }: StatusBadgePropsType) {
  return (
    <span className={`StatusBadge ${status}`}>
      <FontAwesomeIcon icon={STATUS_ICON[status]} />
      {status === TUNNEL_STATUS.CONNECTED && t("connected")}
      {status === TUNNEL_STATUS.RECONNECTING && t("reconnecting")}
      {status === TUNNEL_STATUS.DISCONNECTED && t("disconnected")}
    </span>
  );
}
