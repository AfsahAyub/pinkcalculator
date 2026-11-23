
"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { evaluate } from "mathjs";

type HistoryItem = {
  id: number;
  expression: string;
  result: string;
  mode: "DEG" | "RAD";
};

const keyRows = [
  ["DEG", "(", ")", "AC", "DEL"],
  ["sin", "cos", "tan", "√", "÷"],
  ["log", "ln", "x²", "xʸ", "×"],
  ["7", "8", "9", "π", "−"],
  ["4", "5", "6", "!", "+"],
  ["1", "2", "3", "%", "e"],
  ["0", ".", "Ans", "±", "="],
];

const stickers = [
  { symbol: "🎀", top: "8%", left: "8%", rotate: "-18deg", size: "55px" },
  { symbol: "🌸", top: "19%", right: "7%", rotate: "20deg", size: "58px" },
  { symbol: "💗", top: "48%", left: "4%", rotate: "15deg", size: "49px" },
  { symbol: "🦋", top: "69%", right: "5%", rotate: "-20deg", size: "55px" },
  { symbol: "🍓", bottom: "8%", left: "10%", rotate: "-12deg", size: "52px" },
  { symbol: "✨", bottom: "8%", right: "10%", rotate: "15deg", size: "46px" },
];

function solve(
  input: string,
  mode: "DEG" | "RAD",
  previousAnswer: string
): string {
  if (!input.trim()) return "0";

  if (input.length > 200) {
    throw new Error("Expression is too long.");
  }

  let expression = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/%/g, "/100");

  // Only the calculator's supported tokens are allowed.
  if (!/^[0-9a-zA-Z+\-*/^().,!\s]+$/.test(expression)) {
    throw new Error("Invalid characters.");
  }

  const allowedNames = new Set([
    "sin",
    "cos",
    "tan",
    "sqrt",
    "log",
    "ln",
    "pi",
    "e",
    "Ans",
  ]);

  const names = expression.match(/[a-zA-Z]+/g) || [];

  for (const name of names) {
    if (!allowedNames.has(name)) {
      throw new Error("Unsupported expression.");
    }
  }

  const toRadians = (number: number) =>
    mode === "DEG"
      ? (number * Math.PI) / 180
      : number;

  const answerValue = Number(previousAnswer);

  const scope = {
    pi: Math.PI,
    e: Math.E,
    Ans: Number.isFinite(answerValue) ? answerValue : 0,
    sin: (x: number) => Math.sin(toRadians(x)),
    cos: (x: number) => Math.cos(toRadians(x)),
    tan: (x: number) => Math.tan(toRadians(x)),
    sqrt: (x: number) => Math.sqrt(x),
    log: (x: number) => Math.log10(x),
    ln: (x: number) => Math.log(x),
  };

  const result = evaluate(expression, scope);

  if (
    typeof result !== "number" ||
    !Number.isFinite(result)
  ) {
    throw new Error("Result is undefined.");
  }

  const rounded = Number(result.toPrecision(12));
  return String(rounded);
}

export default function Home() {
  const [expression, setExpression] = useState("");
  const [answer, setAnswer] = useState("0");
  const [mode, setMode] = useState<"DEG" | "RAD">("DEG");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  

useEffect(() => {
  async function loadHistory() {
    try {
      const response = await fetch("/api/history");

      if (!response.ok) {
        throw new Error("Could not load history");
      }

      const data = (await response.json()) as Array<{
        id: number;
        expression: string;
        result: string;
      }>;

      const savedHistory: HistoryItem[] = data.map((item) => ({
        id: Number(item.id),
        expression: item.expression,
        result: item.result,
        mode: "DEG",
      }));

      setHistory(savedHistory);
    } catch (error) {
      console.error("History loading error:", error);
    }
  }

  loadHistory();
}, []);




async function storeHistory(next: HistoryItem[]) {
  setHistory(next);

  try {
    if (next.length === 0) {
      const response = await fetch("/api/history", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not clear history");
      }

      return;
    }

    const latest = next[0];

    const response = await fetch("/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expression: latest.expression,
        result: latest.result,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not save calculation");
    }

    const saved = (await response.json()) as { id: string | number };

    setHistory((previous) =>
      previous.map((item) =>
        item.id === latest.id
          ? { ...item, id: Number(saved.id) }
          : item
      )
    );
  } catch (error) {
    console.error("NeonDB history error:", error);
    setError("History database mein save nahi hui.");
  }
}


  function calculate() {
    if (!expression.trim()) return;

    setError("");

    try {
      const result = solve(expression, mode, answer);
      setAnswer(result);

      const item: HistoryItem = {
        id: Date.now(),
        expression,
        result,
        mode,
      };

      storeHistory([item, ...history].slice(0, 40));
    } catch (err) {
      setAnswer("Error");
      setError(
        err instanceof Error
          ? err.message
          : "Invalid calculation."
      );
    }
  }

  function handleKey(key: string) {
    setError("");
    setCopied(false);

    if (key === "DEG" || key === "RAD") {
      setMode((previous) =>
        previous === "DEG" ? "RAD" : "DEG"
      );
      return;
    }

    if (key === "AC") {
      setExpression("");
      setAnswer("0");
      return;
    }

    if (key === "DEL") {
      setExpression((previous) => previous.slice(0, -1));
      return;
    }

    if (key === "=") {
      calculate();
      return;
    }

    if (key === "±") {
      setExpression((previous) =>
        previous ? `-(${previous})` : "-"
      );
      return;
    }

    const replacements: Record<string, string> = {
      sin: "sin(",
      cos: "cos(",
      tan: "tan(",
      log: "log(",
      ln: "ln(",
      "√": "√(",
      "x²": "^2",
      "xʸ": "^",
    };

    setExpression(
      (previous) => previous + (replacements[key] ?? key)
    );
  }

  async function copyResult() {
    try {
      const clipboard = (globalThis as any).navigator?.clipboard;
      if (clipboard) {
        await clipboard.writeText(answer);
        setCopied(true);
      } else {
        setError("Clipboard API not available.");
      }
    } catch {
      setError("Could not copy result.");
    }
  }

  function getKeyStyle(key: string) {
    if (key === "=") {
      return "bg-gradient-to-br from-[#F43F91] via-[#EC4899] to-[#DB2777] text-white shadow-[0_5px_0_#B91C68] hover:brightness-110";
    }

    if (key === "AC" || key === "DEL") {
      return "bg-[#FFD1E2] text-[#B41F63] shadow-[0_4px_0_#F4A9C7] hover:bg-[#FFC2D9]";
    }

    if (["+", "−", "×", "÷", "x²", "xʸ"].includes(key)) {
      return "bg-[#FFB8D2] text-[#952053] shadow-[0_4px_0_#E994B7] hover:bg-[#FFA8C8]";
    }

    if (
      [
        "sin",
        "cos",
        "tan",
        "log",
        "ln",
        "√",
        "π",
        "e",
        "%",
        "!",
        "DEG",
        "RAD",
        "Ans",
      ].includes(key)
    ) {
      return "bg-[#FFE8F2] text-[#AA4775] shadow-[0_4px_0_#F1C2D6] hover:bg-[#FFDAEA]";
    }

    return "bg-white text-[#66324D] shadow-[0_4px_0_#F0D2E0] hover:bg-[#FFF5FA]";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FFF0F6] px-3 py-8 font-sans text-[#692C49] sm:px-5 sm:py-12">
      {/* Dreamy background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFF5FA] via-[#FFE1EC] to-[#F9C8E0]" />

      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#FF9FC5]/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[#E9A6F5]/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#FFB5C9]/40 blur-3xl" />

      {/* Cute background stickers */}
      {stickers.map((sticker, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute hidden select-none drop-shadow-xl md:block"
          style={{
            top: sticker.top,
            bottom: sticker.bottom,
            left: sticker.left,
            right: sticker.right,
            transform: `rotate(${sticker.rotate})`,
            fontSize: sticker.size,
          }}
        >
          {sticker.symbol}
        </div>
      ))}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[18%] top-[34%] hidden rotate-[-14deg] rounded-full border-2 border-white bg-[#FFD4E5] px-5 py-2 text-sm font-black tracking-widest text-[#C65F8D] shadow-lg lg:block"
      >
        YOU GOT THIS ♡
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[24%] right-[14%] hidden rotate-[12deg] rounded-full border-2 border-white bg-[#FCE6F0] px-4 py-2 text-sm font-black text-[#C65F8D] shadow-lg lg:block"
      >
        ✦ SMART GIRL ✦
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto w-full max-w-[490px]">
        {/* Branding */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] rotate-[-8deg] items-center justify-center rounded-[25px] border-[3px] border-white bg-gradient-to-br from-[#FFA6CB] to-[#EC4899] text-4xl shadow-[0_10px_30px_rgba(236,72,153,0.3)]">
            🎀
          </div>

          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C36A94] shadow-sm">
            <span>✦</span>
            Your cute study companion
            <span>✦</span>
          </div>

          <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-[#9A295E] sm:text-5xl">
            Pink<span className="italic text-[#EC4899]">ify</span>
            <span className="ml-2 inline-block rotate-12 text-3xl">
              ✿
            </span>
          </h1>

          <p className="mt-2 text-sm font-medium tracking-wide text-[#B6698D]">
            A little math, a lot of magic ♡
          </p>
        </div>

        {/* Calculator body */}
        <div className="rounded-[36px] border-[3px] border-white/90 bg-white/55 p-4 shadow-[0_24px_75px_rgba(169,54,109,0.22)] backdrop-blur-2xl sm:p-6">
          {/* Top label */}
          <div className="mb-5 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFE2EE] text-lg text-[#E45A95]">
                ✿
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A74878]">
                  Scientific
                </p>
                <p className="text-[10px] text-[#C78AA7]">
                  Made with love
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory((old) => !old)}
              className="rounded-full border border-[#F8C8DD] bg-[#FFF0F6] px-4 py-2.5 text-xs font-bold text-[#B6477C] transition hover:bg-[#FFDAEA]"
            >
              {showHistory ? "← Calculator" : "◷ History"}
            </button>
          </div>

          {showHistory ? (
            /* History panel */
            <div className="min-h-[520px] rounded-[27px] border border-[#F5C9DB] bg-[#FFF4F9]/90 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#972B60]">
                    Your History ♡
                  </h2>
                  <p className="mt-1 text-xs text-[#C27C9D]">
                    Your recent calculations
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!history.length) return;

                    const browser = globalThis as unknown as {
                      confirm(message: string): boolean;
                    };

                    if (browser.confirm("Clear all history?")) {
                      storeHistory([]);
                    }
                  }}
                  className="rounded-xl bg-[#FFE0EB] px-3 py-2 text-xs font-bold text-[#B63270]"
                >
                  Clear
                </button>
              </div>

              {history.length === 0 ? (
                <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
                  <div className="mb-4 text-6xl">💌</div>
                  <h3 className="font-serif text-xl font-bold text-[#A34879]">
                    No calculations yet
                  </h3>
                  <p className="mt-2 text-sm text-[#C789A8]">
                    Your math memories will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setExpression(item.expression);
                        setAnswer(item.result);
                        setMode(item.mode);
                        setShowHistory(false);
                      }}
                      className="w-full rounded-2xl border border-[#F8D1E1] bg-white p-4 text-right transition hover:border-[#E787B1] hover:bg-[#FFF7FB]"
                    >
                      <p className="break-all text-sm text-[#BD7B9A]">
                        {item.expression}
                      </p>
                      <p className="mt-2 break-all text-xl font-extrabold text-[#9A295E]">
                        = {item.result}
                      </p>
                      <p className="mt-1 text-[10px] text-[#D19BB5]">
                        {item.mode} mode
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Display */}
              <div className="relative mb-6 overflow-hidden rounded-[27px] border-2 border-[#F4C7D9] bg-gradient-to-br from-[#FFF9FC] via-[#FFF1F7] to-[#FFE6F0] p-5 shadow-inner">
                <div
                  aria-hidden="true"
                  className="absolute right-4 top-3 text-xl text-[#F6B3CF]"
                >
                  ✦
                </div>

                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#C26793]">
                    {mode} MODE
                  </span>
                  <span className="text-xs text-[#D18EAE]">
                    ♡
                  </span>
                </div>

                <input
                  type="text"
                  value={expression}
                  onChange={(event) => {
  const input = event.target as unknown as { value: string };
  setExpression(input.value);
  setError("");
}}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      calculate();
                    }
                  }}
                  placeholder="0"
                  aria-label="Enter calculation"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent text-right text-xl font-medium text-[#AA6085] outline-none placeholder:text-[#DEB1C7] sm:text-2xl"
                />

                <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#EAB8CE] to-transparent" />

                <div className="flex min-h-12 items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={copyResult}
                    title="Copy result"
                    aria-label="Copy result"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#C06492] transition hover:bg-white"
                  >
                    {copied ? "✓" : "⧉"}
                  </button>

                  <p className="min-w-0 break-all text-right text-3xl font-black tracking-tight text-[#972457] sm:text-4xl">
                    {answer}
                  </p>
                </div>

                <p className="mt-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#D29EB7]">
                  {copied ? "Copied! ♡" : "Your result"}
                </p>
              </div>

              {/* All scientific buttons */}
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {keyRows.flat().map((key, index) => {
                  const label =
                    key === "DEG" ? mode : key;

                  return (
                    <button
                      key={`${key}-${index}`}
                      type="button"
                      onClick={() => handleKey(key)}
                      className={`flex h-[54px] min-w-0 items-center justify-center rounded-[15px] text-[13px] font-extrabold transition-all duration-150 active:translate-y-[3px] active:shadow-none sm:h-[62px] sm:rounded-[18px] sm:text-[15px] ${getKeyStyle(key)}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-medium text-rose-700"
                >
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-[#F19ABE]">✿</span>
                <p className="text-center text-[11px] font-medium text-[#BA7B9A]">
                  Pretty, powerful & perfectly calculated
                </p>
                <span className="text-[#F19ABE]">✿</span>
              </div>
            </>
          )}
        </div>

        {/* Bottom cute info */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white bg-white/60 px-4 py-2 text-[11px] font-bold text-[#B8648E]">
            ✦ Scientific Functions
          </span>
          <span className="rounded-full border border-white bg-white/60 px-4 py-2 text-[11px] font-bold text-[#B8648E]">
            ♡ Saved History
          </span>
          <span className="rounded-full border border-white bg-white/60 px-4 py-2 text-[11px] font-bold text-[#B8648E]">
            ✿ Pink Aesthetic
          </span>
        </div>

        <p className="mt-6 text-center text-xs font-semibold tracking-wide text-[#BB7798]">
          Made with ♡ using Next.js & Tailwind CSS
        </p>
      </div>
    </main>
  );
}
