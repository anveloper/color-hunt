import { isInToss } from "./env";

export type ConfirmOptions = {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
};

export type ChoiceOptions = {
  title: string;
  description?: string;
  leftLabel: string;
  rightLabel: string;
};

type Impl = {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** left | right | cancel */
  choose: (o: ChoiceOptions) => Promise<"left" | "right" | "cancel">;
};

/**
 * 다이얼로그 구현 슬롯.
 *
 * 미니앱에서는 tds-host가 마운트되면서 TDS 구현을 꽂는다. 웹에서는
 * 비어 있고 아래 폴백이 쓰인다. 이 파일은 TDS를 import하지 않으므로
 * 호출하는 쪽(hunt, onboarding)이 TDS를 초기 번들로 끌어오지 않는다.
 */
let impl: Impl | null = null;

export function setDialogImpl(next: Impl | null): void {
  impl = next;
}

/** 미니앱이면 TDS 구현이 붙을 때까지 잠깐 기다린다. */
async function waitForImpl(): Promise<Impl | null> {
  if (impl != null) return impl;
  if (!isInToss()) return null;
  for (let i = 0; i < 40 && impl == null; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return impl;
}

export async function confirm(o: ConfirmOptions): Promise<boolean> {
  const ready = await waitForImpl();
  if (ready != null) return ready.confirm(o);
  return window.confirm(`${o.title}\n\n${o.description}`);
}

export async function choose(
  o: ChoiceOptions,
): Promise<"left" | "right" | "cancel"> {
  const ready = await waitForImpl();
  if (ready != null) return ready.choose(o);
  // 웹 폴백. 취소는 cancel로 본다.
  const text = o.description ? `${o.title}\n\n${o.description}` : o.title;
  return window.confirm(`${text}\n\n확인: ${o.rightLabel} / 취소: ${o.leftLabel}`)
    ? "right"
    : "left";
}
