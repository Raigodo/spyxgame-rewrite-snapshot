import { defineConfig, limit, timer, value, type ConfigValues } from "@/kernel";

export interface IceServer {
  urls: string | readonly string[];
  username?: string;
  credential?: string;
}

export const signalingConfig = defineConfig("signaling", {
  candidateCollectionWindowMs: timer(3_000, {
    protects:
      "Guests noticing a dead host at different moments; also the unstamped reclaim grace and the point where the suspected host is removed.",
    ifTooShort: "A late detector misses the list; the atomic claim still keeps one winner.",
    destructive: true,
  }),
  positionIntervalMs: timer(1_500, {
    protects: "Candidate 0 dying after confirming. Position n waits n intervals.",
    ifTooShort: "Candidate 1 elects before seeing candidate 0's write.",
  }),
  candidateConfirmWindowMs: timer(700, {
    protects: "Candidates that died during the window being elected.",
    ifTooShort: "Slow confirms are missed; the atomic claim still keeps one winner.",
  }),
  ackTimeoutMs: timer(15_000, {
    protects: "A peer in membership that never reads its signal inbox.",
    ifTooShort: "Deletes a slow-but-live peer (vetoed when its data channel is active).",
    destructive: true,
  }),
  messageRetentionMs: timer(60 * 60 * 1000, {
    protects: "Unconsumed signal docs piling up (Firestore TTL, lazy).",
    ifTooShort: "A pending signal is deleted before it is read.",
  }),
  candidateRetentionMs: timer(60 * 60 * 1000, {
    protects: "Election candidate docs left behind.",
    ifTooShort: "A candidate disappears mid-election.",
  }),
  roomRetentionMs: timer(7 * 24 * 60 * 60 * 1000, {
    protects: "Abandoned rooms, memberships and host docs piling up.",
    ifTooShort: "A live session longer than this loses its membership or host doc.",
    destructive: true,
  }),
});

export const linkConfig = defineConfig("link", {
  iceServers: value<readonly IceServer[]>(
    [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    "STUN-only fallback; relay servers come from the IceServerSource port."
  ),
  iceFetchTimeoutMs: timer(4_000, {
    protects: "Waiting for relay credentials before joining.",
    ifTooShort: "Falls back to STUN-only more often.",
  }),
  offerTimeoutMs: timer(12_000, {
    protects: "A host that never sends an offer.",
    ifTooShort: "Suspects a live host on slow ICE or a slow join.",
    destructive: true,
  }),
  reconnectTimeoutMs: timer(5_000, {
    protects: "A guest waiting forever for a re-offer after its link died.",
    ifTooShort: "Drops the local entry early; an arriving offer recreates it.",
  }),
  reclaimWindowMs: timer(10_000, {
    protects: "A refreshed host retrying claimHost while its old peer still looks present.",
    ifTooShort: "The seat goes to someone else.",
  }),
  byeFlushMs: timer(500, {
    protects: "Closing a link before the `bye` frame has drained.",
    ifTooShort: "The dropped peer may not learn why and falls back to its own detection.",
  }),
  hostClaimMaxAgeMs: timer(15_000, {
    protects: "A stale pagehide stamp being trusted.",
    ifTooShort: "A slow reload falls back to the slow reclaim path.",
  }),
  iceBatchWindowMs: timer(300, {
    protects: "One signal doc per ICE candidate.",
    ifTooShort: "Smaller batches, more docs.",
  }),
  iceMaxBatch: limit(20, { protects: "Size of one outgoing ICE batch." }),
  probeIdleMs: timer(10_000, {
    protects: "A data channel that stays open but carries nothing.",
    ifTooShort: "A briefly frozen tab is declared dead and re-linked.",
    destructive: true,
  }),
  probeTimeoutMs: timer(5_000, {
    protects: "The wait for the pong.",
    ifTooShort: "Same as probeIdleMs.",
    destructive: true,
  }),
  disconnectGraceMs: timer(3_000, {
    protects: "A transient 'disconnected' (VPN or Wi-Fi hiccup) that heals by itself.",
    ifTooShort: "A flaky link is declared dead and re-linked; a guest may suspect the host.",
    destructive: true,
  }),
  chunkBufferTtlMs: timer(30_000, {
    protects: "Partial messages that never complete.",
    ifTooShort: "Large messages on slow links are dropped.",
  }),
  maxChunkChars: limit(12_000, { protects: "One data-channel frame (UTF-16 units)." }),
  maxChunksPerMessage: limit(256, { protects: "Memory per reassembled message." }),
  maxSdpChars: limit(100_000, { protects: "Incoming offer/answer size." }),
  maxCandidateChars: limit(4_000, { protects: "One incoming ICE candidate." }),
  maxIceCandidatesPerSignal: limit(50, { protects: "Incoming ICE batch size." }),
});

export type SignalingConfig = ConfigValues<typeof signalingConfig>;
export type LinkConfig = ConfigValues<typeof linkConfig>;
