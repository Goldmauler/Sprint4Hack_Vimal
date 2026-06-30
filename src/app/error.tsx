"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9ff] p-6">
      <div className="max-w-md w-full bg-white border border-[#c7c4d7] rounded-xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[28px]">error</span>
        </div>
        <h1 className="text-lg font-bold text-[#0b1c30] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#464554] mb-6">
          The review workspace hit an error. Try reloading the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-[#2a14b4] hover:bg-[#372abf] text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}