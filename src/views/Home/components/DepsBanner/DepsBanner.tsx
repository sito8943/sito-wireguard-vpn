import { useState } from "react";
import { Button } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWarning, faCopy, faRotateLeft } from "@fortawesome/free-solid-svg-icons";

import { t } from "../../../../lang";
import { BREW_INSTALL_COMMAND } from "./constants";
import { DepsBannerPropsType } from "./types";

import "./styles.css";

export function DepsBanner({ visible, onRecheck }: DepsBannerPropsType) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(BREW_INSTALL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="deps-banner">
      <p className="deps-banner-text">
        <FontAwesomeIcon icon={faWarning} /> {t("depsMissing")}
      </p>
      <code className="deps-banner-code">{BREW_INSTALL_COMMAND}</code>
      <div className="deps-banner-actions">
        <Button size="sm" variant="outlined" onClick={copy}>
          <FontAwesomeIcon icon={faCopy} />{" "}
          {copied ? t("depsCopied") : t("depsCopy")}
        </Button>
        <Button size="sm" variant="text" onClick={onRecheck}>
          <FontAwesomeIcon icon={faRotateLeft} /> {t("depsRecheck")}
        </Button>
      </div>
    </aside>
  );
}
