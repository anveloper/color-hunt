import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  role?: "button" | "menuitem";
  ariaLabel?: string;
};

/**
 * <button> 대신 쓰는 탭 가능한 요소.
 *
 * TDS(TDSMobileAITProvider)가 Bootstrap Reboot 계열 전역 리셋을 emotion으로
 * 주입하는데, 그 안의 `button { overflow: visible; border-radius: 0;
 * -webkit-appearance: button }`이 Tailwind 유틸리티를 이긴다.
 * Tailwind v4는 유틸리티를 `@layer utilities`에 넣고, 레이어에 속한 규칙은
 * specificity와 무관하게 무레이어 규칙에 지기 때문이다.
 *
 * 그래서 앱 자체 버튼은 <button>을 쓰지 않는다. div는 리셋 대상이 아니라
 * 클래스가 그대로 먹는다. 대신 <button>이 공짜로 주던 키보드 활성화와
 * disabled 처리는 여기서 직접 해준다.
 *
 * TDS가 스타일링하는 컴포넌트(ConfirmDialog.ConfirmButton 등)는 리셋이
 * 의도된 것이므로 그대로 둔다.
 */
export default function TapButton({
  children,
  onClick,
  className = "",
  style,
  disabled = false,
  role = "button",
  ariaLabel,
}: Props) {
  const activate = () => {
    if (!disabled) onClick();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    activate();
  };

  return (
    <div
      role={role}
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onClick={activate}
      onKeyDown={handleKeyDown}
      // disabled: 변형은 :disabled 의사클래스라 div에서는 안 먹으므로 직접 준다.
      // 키보드로 이동할 때 현재 위치가 보여야 한다.
      className={`cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${disabled ? "opacity-50" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
