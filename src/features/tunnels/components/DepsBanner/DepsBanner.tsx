import { useState } from "react";
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWarning,
  faCopy,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

import { t } from "../../../../lang";
import { BREW_INSTALL_COMMAND, COPY_FEEDBACK_MS } from "./constants";
import { DepsBannerPropsType } from "./types";

import "../../../../styles/components/DepsBanner.css";

export function DepsBanner({ visible, onRecheck }: DepsBannerPropsType) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(BREW_INSTALL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return (
    <aside className="DepsBanner">
      <p className="text">
        <FontAwesomeIcon icon={faWarning} /> {t("depsMissing")}
      </p>
      <code className="code">{BREW_INSTALL_COMMAND}</code>
      <div className="actions">
        <Button
          size={BUTTON_SIZES.SM}
          variant={BUTTON_VARIANTS.SUBMIT}
          onClick={copy}
        >
          <FontAwesomeIcon icon={faCopy} />{" "}
          {copied ? t("depsCopied") : t("depsCopy")}
        </Button>
        <Button
          size={BUTTON_SIZES.SM}
          variant={BUTTON_VARIANTS.SUBMIT}
          onClick={onRecheck}
        >
          <FontAwesomeIcon icon={faRotateLeft} /> {t("depsRecheck")}
        </Button>
      </div>
    </aside>
  );
}
