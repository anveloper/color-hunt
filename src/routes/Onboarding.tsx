import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const navigate = useNavigate();
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-12 px-8">
      <h1 className="text-7xl font-bold tracking-tight text-ink">컬러헌트</h1>
      <button
        type="button"
        onClick={() => navigate("/grid")}
        className="rounded-2xl border-2 border-dashed border-ink px-8 py-3 text-2xl transition-transform active:scale-95"
      >
        시작하기
      </button>
    </main>
  );
}
