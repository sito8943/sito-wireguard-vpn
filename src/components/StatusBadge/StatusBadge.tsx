import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

import { t } from "../../lang";
import { StatusBadgePropsType } from "./types";

import "./styles.css";

export function StatusBadge({ connected }: StatusBadgePropsType) {
  return (
    <span className={`status-badge ${connected ? "on" : "off"}`}>
      <FontAwesomeIcon icon={connected ? faCheckCircle : faCircleExclamation} />
      {connected ? t("connected") : t("disconnected")}
    </span>
  );
}
