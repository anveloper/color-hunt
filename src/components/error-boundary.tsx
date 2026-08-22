import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * 렌더 중 예외로 화면이 백지가 되는 것을 막는다.
 *
 * 이 앱은 사진이 LocalStorage에만 있어서, 백지 화면이 되면 사용자는
 * 앱을 지우는 것 말고 할 수 있는 게 없다. 데이터는 그대로 남아 있으므로
 * 다시 시도할 길을 준다.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[colorhunt] render failed:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-8 text-center">
        <p className="text-xl font-bold">잠시 문제가 생겼어요</p>
        <p className="text-base text-ink/65">
          모아둔 사진은 그대로 있어요.
          <br />
          다시 열어 볼까요?
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-ink px-6 py-2.5 text-base font-bold text-paper"
          style={{ borderRadius: "9999px", WebkitAppearance: "none" }}
        >
          다시 시도
        </button>
      </div>
    );
  }
}
