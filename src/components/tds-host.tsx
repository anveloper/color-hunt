import { useEffect, useState } from "react";
import { ConfirmDialog, useBottomSheet } from "@toss/tds-mobile";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import {
  setDialogImpl,
  type ChoiceOptions,
  type ConfirmOptions,
} from "../lib/dialog";

/**
 * TDS를 import하는 유일한 파일. lazy 청크 경계다.
 *
 * TDS 다이얼로그·바텀시트는 createPortal로 document.body에 렌더되므로
 * 프로바이더가 앱 트리를 감쌀 필요가 없다. 형제로 붙이면 TDS 청크를
 * 기다리는 동안에도 앱이 즉시 그려진다.
 */
export default function TdsHost() {
  return (
    <TDSMobileAITProvider>
      <DialogBridge />
    </TDSMobileAITProvider>
  );
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

function DialogBridge() {
  const { openTwoButtonSheet } = useBottomSheet();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    setDialogImpl({
      confirm: (o: ConfirmOptions) =>
        new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
      choose: async (o: ChoiceOptions) => {
        const action = await openTwoButtonSheet({
          header: o.title,
          leftButton: o.leftLabel,
          rightButton: o.rightLabel,
          children: o.description ? (
            <p className="px-1 pb-2 text-base leading-relaxed text-ink/70">
              {o.description}
            </p>
          ) : undefined,
        });
        if (action === "leftButtonClick") return "left";
        if (action === "rightButtonClick") return "right";
        return "cancel";
      },
    });
    return () => setDialogImpl(null);
  }, [openTwoButtonSheet]);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmDialog
      open={pending != null}
      title={pending?.title}
      description={pending?.description}
      onClose={() => close(false)}
      cancelButton={
        <ConfirmDialog.CancelButton onClick={() => close(false)}>
          {pending?.cancelLabel}
        </ConfirmDialog.CancelButton>
      }
      confirmButton={
        <ConfirmDialog.ConfirmButton onClick={() => close(true)}>
          {pending?.confirmLabel}
        </ConfirmDialog.ConfirmButton>
      }
    />
  );
}
