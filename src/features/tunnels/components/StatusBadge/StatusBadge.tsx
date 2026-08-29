import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleExclamation,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import { TUNNEL_STATUS } from "@/features/tunnels/constants";
import { t } from "@/lang";
import { StatusBadgePropsType } from "./types";

import "@/styles/components/StatusBadge.css";

const STATUS_ICON = {
  [TUNNEL_STATUS.CONNECTED]: faCheckCircle,
  [TUNNEL_STATUS.RECONNECTING]: faRotate,
  [TUNNEL_STATUS.DISCONNECTED]: faCircleExclamation,
} as const;

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
