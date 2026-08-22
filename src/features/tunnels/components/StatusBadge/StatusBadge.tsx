import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import { t } from "../../../../lang";
import { StatusBadgePropsType } from "./types";

import "../../../../styles/components/StatusBadge.css";

export function StatusBadge({ connected }: StatusBadgePropsType) {
  return (
    <span className={`StatusBadge ${connected ? "on" : "off"}`}>
      <FontAwesomeIcon icon={connected ? faCheckCircle : faCircleExclamation} />
      {connected ? t("connected") : t("disconnected")}
    </span>
  );
}
