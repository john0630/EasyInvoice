import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { hydrateLocalData } from "@/lib/localDataSync";

type Props = {
  children: ReactNode;
};

export function LocalDataGate({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await hydrateLocalData();
      if (cancelled) return;
      if (result.mode === "browser" && result.error) {
        toast.error(result.error);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading local data…
      </div>
    );
  }

  return children;
}
