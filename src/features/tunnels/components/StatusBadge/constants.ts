import {
  faCheckCircle,
  faCircleExclamation,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import { TUNNEL_STATUS } from "@/features/tunnels/constants";

export const STATUS_ICON = {
  [TUNNEL_STATUS.CONNECTED]: faCheckCircle,
  [TUNNEL_STATUS.RECONNECTING]: faRotate,
  [TUNNEL_STATUS.DISCONNECTED]: faCircleExclamation,
} as const;
