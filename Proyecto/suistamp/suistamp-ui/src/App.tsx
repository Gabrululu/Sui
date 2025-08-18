import { useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import {
  SuiClient,
  getFullnodeUrl,
  type SuiObjectChange,
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

/** ---------- Config ---------- */
const REPO_URL = "https://github.com/Gabrululu/Sui"; 

/** ---------- Utils & Types ---------- */
type Target = `${string}::${string}::${string}`;

function isHexId(v: string) {
  return /^0x[0-9a-fA-F]+$/.test(v);
}

// Type guard: estrecha SuiObjectChange a la variante "created" de nuestra Card
type CreatedChange = Extract<SuiObjectChange, { type: "created" }>;
function isCreatedCard(
  change: SuiObjectChange
): change is CreatedChange & { objectType: string; objectId: string } {
  return (
    change.type === "created" &&
    typeof (change as any).objectType === "string" &&
    (change as any).objectType.endsWith("suistamp::Card") &&
    typeof (change as any).objectId === "string"
  );
}

/** Pequeño logo inline (sin assets) */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        className="drop-shadow"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2c4.8 4.9 7.2 8.4 7.2 10.6A7.2 7.2 0 1 1 4.8 12.6C4.8 10.4 7.2 6.9 12 2Z"
          className="fill-emerald-500 dark:fill-emerald-400"/>
        <circle cx="12" cy="13" r="3" className="fill-white/90 dark:fill-slate-900/90"/>
      </svg>
      <span className="font-bold">SuiStamp</span>
    </div>
  );
}

/** ---------- App ---------- */
export default function App() {
  // Persistencia simple
  const savedPkg =
    typeof window !== "undefined"
      ? localStorage.getItem("suistamp_pkg") || ""
      : "";
  const savedCard =
    typeof window !== "undefined"
      ? localStorage.getItem("suistamp_card") || ""
      : "";

  const [packageId, setPackageId] = useState(savedPkg);
  const [cardId, setCardId] = useState(savedCard);
  const [recipient, setRecipient] = useState("");
  const [networkName, setNetworkName] = useState<"testnet" | "mainnet">(
    "testnet"
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // mini toast/status
  const toastTimer = useRef<number | null>(null);

  const [stamps, setStamps] = useState<number | null>(null);
  const [owner, setOwner] = useState("");

  // Tema (light/dark)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Cliente RPC de lectura según selector
  const client = useMemo(
    () => new SuiClient({ url: getFullnodeUrl(networkName) }),
    [networkName]
  );

  // Persistencia
  useEffect(() => localStorage.setItem("suistamp_pkg", packageId), [packageId]);
  useEffect(() => localStorage.setItem("suistamp_card", cardId), [cardId]);

  // Hooks dApp Kit
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Helpers
  function pushToast(msg: string) {
    setStatus(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setStatus(""), 3200);
  }
  const target = (fn: string): Target =>
    `${packageId}::suistamp::${fn}` as Target;

  async function runTx(build: (tx: Transaction) => void) {
    if (!account) throw new Error("Conecta tu wallet primero");
    if (!packageId || !isHexId(packageId))
      throw new Error("Package ID inválido (usa formato 0x...)");

    const tx = new Transaction();
    build(tx);

    setLoading(true);
    pushToast("Firmando…");

    try {
      // La red de la TX la decide la wallet (mantén wallet y selector alineados)
      const res = await signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => pushToast("Transacción ejecutada ✅"),
          onError: (e) => pushToast(String((e as Error)?.message ?? e)),
        }
      );
      if (cardId) await refreshCard();
      return res as any;
    } finally {
      setLoading(false);
    }
  }

  async function refreshCard() {
    if (!cardId || !isHexId(cardId)) {
      pushToast("Card ID inválido o vacío");
      return;
    }
    try {
      const obj = await client.getObject({
        id: cardId,
        options: { showContent: true, showOwner: true },
      });

      const content: any = (obj.data as any)?.content;
      const fields = content?.fields as { stamps?: string | number } | undefined;
      setStamps(fields ? Number(fields.stamps ?? 0) : null);

      const own = (obj.data as any)?.owner;
      if (typeof own === "object" && (own as any)?.AddressOwner)
        setOwner((own as any).AddressOwner);
      else if (typeof own === "object" && (own as any)?.ObjectOwner)
        setOwner((own as any).ObjectOwner);
      else setOwner("");
    } catch {
      pushToast("No puedo leer la Card. Revisa ID/red.");
    }
  }

  /** ---------- Actions ---------- */
  const createCard = async () => {
    if (!packageId) return pushToast("Coloca el Package ID");
    const res = await runTx((tx) => {
      tx.moveCall({ target: target("create") });
    });

    // Resolve ID robusto via digest → objectChanges
    if (res?.digest) {
      try {
        const txr = await client.getTransactionBlock({
          digest: res.digest,
          options: { showObjectChanges: true },
        });
        const created = (txr.objectChanges ?? []).find(isCreatedCard);
        if (created) {
          setCardId(created.objectId);
          pushToast("Card creada ✅");
          setTimeout(refreshCard, 700);
          return;
        }
      } catch {
        /* noop */
      }
    }
    pushToast(
      "Card creada, pero no pude leer el ID. Usa Fetch si ya lo conoces."
    );
  };

  const punch = async () => {
    if (!cardId) return pushToast("Coloca el Card ID");
    await runTx((tx) => {
      tx.moveCall({ target: target("punch"), arguments: [tx.object(cardId)] });
    });
  };

  const redeem = async () => {
    if (!cardId) return pushToast("Coloca el Card ID");
    await runTx((tx) => {
      tx.moveCall({ target: target("redeem"), arguments: [tx.object(cardId)] });
    });
  };

  const gift = async () => {
    if (!cardId) return pushToast("Coloca el Card ID");
    if (!recipient || !isHexId(recipient))
      return pushToast("Recipient inválido (usa formato 0x...)");
    await runTx((tx) => {
      tx.moveCall({
        target: target("gift"),
        arguments: [tx.object(cardId), tx.pure.address(recipient)],
      });
    });
  };

  /** ---------- UI ---------- */
  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="subtle hidden sm:inline">(testnet-ready)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn btn-primary"
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <ConnectButton />
          </div>
        </header>

        {/* Top row */}
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="col-span-2 card">
            <label className="label">Network</label>
            <select
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value as any)}
              className="input mt-1"
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
            <p className="subtle mt-2">
              Alinea la red del selector con la red de tu wallet.
            </p>
          </div>
          <div className="card flex items-end">
            <button onClick={refreshCard} className="btn btn-primary w-full">
              Refresh
            </button>
          </div>
        </div>

        {/* Forms */}
        <div className="grid gap-4">
          {/* Package */}
          <div className="card">
            <label className="label">Package ID</label>
            <input
              placeholder="0x..."
              value={packageId}
              onChange={(e) => setPackageId(e.target.value.trim())}
              className="input mt-1"
            />
            <p className="subtle mt-1">
              Pega aquí el PackageID (testnet/mainnet).
            </p>
          </div>

          {/* Card + Actions */}
          <div className="card">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="label">Card ID</label>
                <input
                  placeholder="0x... (se autocompleta al crear)"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value.trim())}
                  className="input mt-1"
                />
              </div>
              <button
                disabled={
                  loading || !packageId || !isHexId(packageId) || !account
                }
                onClick={createCard}
                className="btn btn-green"
              >
                {loading ? "…" : "Create Card"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                disabled={loading || !isHexId(cardId)}
                onClick={punch}
                className="btn btn-indigo"
              >
                Punch +1
              </button>
              <button
                disabled={loading || !isHexId(cardId)}
                onClick={redeem}
                className="btn btn-amber"
              >
                Redeem
              </button>
              <button
                disabled={
                  loading || !isHexId(cardId) || !recipient || !isHexId(recipient)
                }
                onClick={gift}
                className="btn btn-primary"
              >
                Gift
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div className="card">
            <label className="label">Recipient (address)</label>
            <input
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              className="input mt-1"
            />
          </div>

          {/* Card status */}
          <div className="card">
            <h2 className="font-semibold mb-2">Card status</h2>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-slate-500 dark:text-slate-400">Stamps</div>
                <div className="text-xl font-bold">{stamps ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-slate-500 dark:text-slate-400">Owner</div>
                <div className="break-all">{owner || "—"}</div>
              </div>
            </div>
            <button onClick={refreshCard} className="btn btn-primary mt-3">
              Fetch Card
            </button>
          </div>

          {/* Toast / Status */}
          {status && (
            <div className="fixed bottom-4 right-4 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl px-4 py-3 text-sm shadow-lg">
              {status}
            </div>
          )}

          {/* Footer con branding */}
          <footer className="text-xs subtle text-center py-4">
            <div className="flex items-center justify-center gap-2">
              <Logo />
              <span>•</span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
                title="Ver repo"
              >
                GitHub repo
              </a>
            </div>
            <div className="mt-2">
              Built for SuiStamp • Connect wallet <span className="kbd">→</span>{" "}
              set PackageID <span className="kbd">→</span> Create Card{" "}
              <span className="kbd">→</span> Punch <span className="kbd">→</span>{" "}
              Redeem <span className="kbd">→</span> Gift
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
