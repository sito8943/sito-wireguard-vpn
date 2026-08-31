import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWarning,
  faCopy,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/shared/components/elements/Button";
import { BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/constants";
import { t } from "@/lang";
import { BREW_INSTALL_COMMAND } from "./constants";
import { useCopyFeedback } from "./useCopyFeedback";
import { DepsBannerPropsType } from "./types";

import "@/styles/components/DepsBanner.css";

export function DepsBanner({ visible, onRecheck }: DepsBannerPropsType) {
  const { copied, copy } = useCopyFeedback();

  if (!visible) return null;

  return (
    <aside className="DepsBanner">
      <p className="text">
        <FontAwesomeIcon icon={faWarning} /> {t("depsMissing")}
      </p>
      <code className="code">{BREW_INSTALL_COMMAND}</code>
      <div className="actions">
        <Button
          size={BUTTON_SIZE.SM}
          variant={BUTTON_VARIANT.SUBMIT}
          onClick={() => copy(BREW_INSTALL_COMMAND)}
        >
          <FontAwesomeIcon icon={faCopy} />{" "}
          {copied ? t("depsCopied") : t("depsCopy")}
        </Button>
        <Button
          size={BUTTON_SIZE.SM}
          variant={BUTTON_VARIANT.SUBMIT}
          onClick={onRecheck}
        >
          <FontAwesomeIcon icon={faRotateLeft} /> {t("depsRecheck")}
        </Button>
      </div>
    </aside>
  );
}
