/**
 * Device probes behind the pre-exam system check. Plain async functions (no
 * React): each one exercises a real dependency of the exam and turns the
 * outcome into a candidate-readable verdict.
 */
import { systemApi } from "@/lib/api";
import {
  enqueueAnswer,
  getQueuedAnswers,
  removeQueuedAnswers,
} from "@/lib/offline-queue";
import type { Check } from "./check-definitions";

export function checkFullscreen(): Check {
  const fsOk =
    typeof document !== "undefined" &&
    !!document.fullscreenEnabled &&
    typeof document.documentElement.requestFullscreen === "function";
  return fsOk
    ? {
        status: "pass",
        detail: "Supported. You can go fullscreen to reduce distractions.",
      }
    : {
        status: "warn",
        detail: "Not supported on this device. The exam still works normally.",
      };
}

/** Three pings; returns the median-RTT sample's round trip and clock skew (ms). Throws if offline. */
export async function measureNetwork() {
  const samples: { rtt: number; skew: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const p0 = performance.now();
    const r = await systemApi.ping(p0);
    const rtt = performance.now() - p0;
    samples.push({ rtt, skew: Date.parse(r.serverNow) - (t0 + rtt / 2) });
  }
  samples.sort((a, b) => a.rtt - b.rtt);
  return samples[1]; // median by RTT
}

export function networkVerdict(rtt: number): Check {
  return rtt > 1500
    ? {
        status: "warn",
        detail: `Slow connection (${Math.round(rtt)} ms). Answers are queued and retried automatically.`,
      }
    : {
        status: "pass",
        detail: `Connected · ${Math.round(rtt)} ms round trip`,
      };
}

export function clockVerdict(skew: number): Check {
  const skewSec = Math.round(Math.abs(skew) / 1000);
  return skewSec > 30
    ? {
        status: "warn",
        detail: `Your device clock is off by ~${skewSec}s. That's fine: the timer uses server time, so changing your clock has no effect.`,
      }
    : {
        status: "pass",
        detail: "In sync with the server. The timer always uses server time.",
      };
}

/** Round-trips a record through the IndexedDB offline answer queue. */
export async function checkStorage(): Promise<Check> {
  const attemptId = "__system_check__";
  const key = `${attemptId}:probe`;
  try {
    await enqueueAnswer({
      key,
      attemptId,
      attemptQuestionId: "probe",
      selectedOptionIds: [1],
      textAnswer: "probe",
      markedForReview: false,
      seq: 1,
      capturedElapsedMs: 0,
    });
    const back = await getQueuedAnswers(attemptId);
    await removeQueuedAnswers(attemptId, [key]);
    if (!back.some((q) => q.key === key)) throw new Error("read-back failed");
    return {
      status: "pass",
      detail: "Answers will be kept on this device if the connection drops.",
    };
  } catch {
    return {
      status: "warn",
      detail:
        "This browser blocks local storage (private mode?). Answers still save online, but not while offline.",
    };
  }
}

/** Sends an answer-sized payload and checks the server echoes it back intact. */
export async function checkAutosave(): Promise<Check> {
  const nonce = crypto.randomUUID();
  const payload = "x".repeat(4000);
  try {
    const r = await systemApi.echo(nonce, payload);
    if (r.nonce !== nonce || r.receivedBytes !== payload.length) {
      return {
        status: "fail",
        detail: "The server did not receive the test answer intact.",
      };
    }
    return {
      status: "pass",
      detail: "A test answer was saved and confirmed by the server.",
    };
  } catch (e) {
    return { status: "fail", detail: (e as Error).message };
  }
}
