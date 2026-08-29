"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Status {
  status: string;
  amount: number;
  spot: string | null;
}

function Result() {
  const ref = useSearchParams().get("ref");
  const [data, setData] = useState<Status | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    const poll = async () => {
      const res = await fetch(`/api/bids/status?ref=${encodeURIComponent(ref)}`);
      if (!alive) return;
      if (res.ok) setData(await res.json());
      setTries((t) => t + 1);
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [ref]);

  const status = data?.status ?? "pending";
  const copy: Record<string, { title: string; body: string }> = {
    approved: {
      title: "¡Tu logo ya camina conmigo!",
      body: "El pago fue aprobado y tu marca ya está en la mochila. Nos vemos en la calle.",
    },
    pending: {
      title: "Estamos confirmando tu pago",
      body: "Wompi está procesando la transacción. Esta página se actualiza sola; también te llegará un email.",
    },
    declined: {
      title: "El pago fue rechazado",
      body: "No se hizo ningún cobro. Puedes intentarlo de nuevo desde la página principal.",
    },
  };

  const c = copy[status] ?? copy.pending;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
      <span
        className={`mb-6 h-14 w-14 rounded-full ${
          status === "approved"
            ? "bg-lime"
            : status === "declined"
              ? "bg-red-500/70"
              : "animate-pulse bg-white/20"
        }`}
      />
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{c.title}</h1>
      <p className="mt-4 text-white/55">{c.body}</p>
      {data?.spot && (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/60">
          Zona: <span className="text-white">{data.spot}</span>
        </p>
      )}
      {ref && (
        <p className="mt-4 break-all text-xs text-white/25">Referencia: {ref}</p>
      )}
      {status === "pending" && tries > 0 && (
        <p className="mt-2 text-xs text-white/25">Consultando… ({tries})</p>
      )}
      <a
        href="/"
        className="mt-8 rounded-full border border-white/15 px-7 py-3 text-sm font-semibold transition hover:border-lime hover:text-lime"
      >
        Volver a mypack.lol
      </a>
    </div>
  );
}

export default function Gracias() {
  return (
    <Suspense fallback={null}>
      <Result />
    </Suspense>
  );
}
