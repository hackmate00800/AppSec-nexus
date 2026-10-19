/**
 * AppSec Nexus - Advanced Data Structures & Cybersecurity Algorithms (DSA Engine)
 *
 * Implements:
 * 1. O(1) LRU Cache (Doubly-Linked List + Hash Map) for search queries & AI inference
 * 2. Inverted Index with token stemming for O(1) prefix/full-text vulnerability search
 * 3. Binary Max-Heap Priority Queue for top-K high-risk vulnerability triage
 * 4. Deterministic CVSS v3.1 Scoring Engine (FIRST.org specification)
 * 5. Deterministic Finding Deduplicator (Canonical path hashing)
 * 6. AI Prompt Injection & Jailbreak Guard with token budget estimator
 */

// ============================================================================
// 1. O(1) LRU CACHE (Hash Map + Doubly-Linked List)
// ============================================================================

interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

export class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  constructor(capacity: number = 100) {
    if (capacity <= 0) throw new Error("LRUCache capacity must be > 0");
    this.capacity = capacity;
    this.map = new Map();
  }

  public get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToHead(node);
    return node.value;
  }

  public put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const newNode: LRUNode<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, newNode);
    this.addToHead(newNode);

    if (this.map.size > this.capacity) {
      this.removeTail();
    }
  }

  public has(key: K): boolean {
    return this.map.has(key);
  }

  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  public size(): number {
    return this.map.size;
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: LRUNode<K, V>): void {
    if (this.head === node) return;
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}

// ============================================================================
// 2. INVERTED INDEX (Token-based sub-millisecond search)
// ============================================================================

export class InvertedIndex<T extends { id: string }> {
  private index: Map<string, Set<string>> = new Map();
  private documents: Map<string, T> = new Map();

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  public addDocument(doc: T, searchableFields: (keyof T)[]): void {
    this.documents.set(doc.id, doc);

    const tokenSet = new Set<string>();
    for (const field of searchableFields) {
      const val = doc[field];
      if (typeof val === "string") {
        this.tokenize(val).forEach((t) => tokenSet.add(t));
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === "string") {
            this.tokenize(item).forEach((t) => tokenSet.add(t));
          }
        });
      }
    }

    tokenSet.forEach((token) => {
      // Add full token
      let idSet = this.index.get(token);
      if (!idSet) {
        idSet = new Set();
        this.index.set(token, idSet);
      }
      idSet.add(doc.id);

      // Add prefix tokens for fast typeahead (lengths 2..min(token.length, 6))
      for (let len = 2; len < Math.min(token.length, 6); len++) {
        const prefix = token.substring(0, len);
        let prefixSet = this.index.get(prefix);
        if (!prefixSet) {
          prefixSet = new Set();
          this.index.set(prefix, prefixSet);
        }
        prefixSet.add(doc.id);
      }
    });
  }

  public search(query: string): T[] {
    const qTokens = this.tokenize(query);
    if (qTokens.length === 0) {
      return Array.from(this.documents.values());
    }

    // Intersect sets for all query tokens (AND matching)
    let candidateIds: Set<string> | null = null;

    for (const token of qTokens) {
      const matches = this.index.get(token);
      if (!matches) {
        return []; // No document contains this token
      }

      if (candidateIds === null) {
        candidateIds = new Set(matches);
      } else {
        const nextSet = new Set<string>();
        for (const id of candidateIds) {
          if (matches.has(id)) {
            nextSet.add(id);
          }
        }
        candidateIds = nextSet;
        if (candidateIds.size === 0) return [];
      }
    }

    if (!candidateIds) return [];

    const results: T[] = [];
    candidateIds.forEach((id) => {
      const doc = this.documents.get(id);
      if (doc) results.push(doc);
    });
    return results;
  }

  public clear(): void {
    this.index.clear();
    this.documents.clear();
  }

  public size(): number {
    return this.documents.size;
  }
}

// ============================================================================
// 3. BINARY MAX-HEAP (Top-K High-Risk Vulnerability Triage)
// ============================================================================

export interface ScoredItem<T> {
  score: number;
  data: T;
}

export class BinaryMaxHeap<T> {
  private heap: ScoredItem<T>[] = [];

  public push(item: ScoredItem<T>): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): ScoredItem<T> | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public peek(): ScoredItem<T> | undefined {
    return this.heap[0];
  }

  public size(): number {
    return this.heap.length;
  }

  public getTopK(k: number): T[] {
    const copy = [...this.heap];
    const results: T[] = [];
    const count = Math.min(k, this.heap.length);
    for (let i = 0; i < count; i++) {
      const item = this.pop();
      if (item) results.push(item.data);
    }
    this.heap = copy; // Restore heap
    return results;
  }

  private bubbleUp(index: number): void {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.score <= parent.score) break;
      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const element = this.heap[index];

    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].score > element.score) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const rightScore = this.heap[rightChildIdx].score;
        const compareScore = swapIdx === null ? element.score : this.heap[leftChildIdx].score;
        if (rightScore > compareScore) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      index = swapIdx;
    }
  }
}

// ============================================================================
// 4. DETERMINISTIC CVSS v3.1 SCORING ENGINE
// ============================================================================

export type CvssAttackVector = "Network" | "Adjacent" | "Local" | "Physical";
export type CvssAttackComplexity = "Low" | "High";
export type CvssPrivilegesRequired = "None" | "Low" | "High";
export type CvssUserInteraction = "None" | "Required";
export type CvssScope = "Unchanged" | "Changed";
export type CvssImpact = "None" | "Low" | "High";

export interface CvssMetrics {
  attackVector: CvssAttackVector;
  attackComplexity: CvssAttackComplexity;
  privilegesRequired: CvssPrivilegesRequired;
  userInteraction: CvssUserInteraction;
  scope: CvssScope;
  confidentiality: CvssImpact;
  integrity: CvssImpact;
  availability: CvssImpact;
}

export interface CvssResult {
  score: number;
  severity: "None" | "Low" | "Medium" | "High" | "Critical";
  vectorString: string;
}

export class CvssCalculator {
  private static readonly AV_WEIGHTS: Record<CvssAttackVector, number> = {
    Network: 0.85,
    Adjacent: 0.62,
    Local: 0.55,
    Physical: 0.2,
  };

  private static readonly AC_WEIGHTS: Record<CvssAttackComplexity, number> = {
    Low: 0.77,
    High: 0.44,
  };

  private static readonly UI_WEIGHTS: Record<CvssUserInteraction, number> = {
    None: 0.85,
    Required: 0.62,
  };

  private static readonly IMPACT_WEIGHTS: Record<CvssImpact, number> = {
    None: 0.0,
    Low: 0.22,
    High: 0.56,
  };

  public static calculate(metrics: CvssMetrics): CvssResult {
    // 1. Exploitability metrics
    const av = this.AV_WEIGHTS[metrics.attackVector];
    const ac = this.AC_WEIGHTS[metrics.attackComplexity];
    const ui = this.UI_WEIGHTS[metrics.userInteraction];

    // PR depends on Scope
    let pr = 0.85;
    if (metrics.privilegesRequired === "Low") {
      pr = metrics.scope === "Changed" ? 0.68 : 0.62;
    } else if (metrics.privilegesRequired === "High") {
      pr = metrics.scope === "Changed" ? 0.5 : 0.27;
    }

    const exploitability = 8.22 * av * ac * pr * ui;

    // 2. Impact sub-score (ISS)
    const c = this.IMPACT_WEIGHTS[metrics.confidentiality];
    const i = this.IMPACT_WEIGHTS[metrics.integrity];
    const a = this.IMPACT_WEIGHTS[metrics.availability];
    const iss = 1 - (1 - c) * (1 - i) * (1 - a);

    let impact = 0;
    if (metrics.scope === "Unchanged") {
      impact = 6.42 * iss;
    } else {
      impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    let baseScore = 0;
    if (impact > 0) {
      if (metrics.scope === "Unchanged") {
        baseScore = Math.min(10.0, impact + exploitability);
      } else {
        baseScore = Math.min(10.0, 1.08 * (impact + exploitability));
      }
      // Round up to 1 decimal place (FIRST.org roundup)
      baseScore = Math.ceil(baseScore * 10) / 10;
    }

    // Determine severity
    let severity: "None" | "Low" | "Medium" | "High" | "Critical" = "None";
    if (baseScore === 0) severity = "None";
    else if (baseScore < 4.0) severity = "Low";
    else if (baseScore < 7.0) severity = "Medium";
    else if (baseScore < 9.0) severity = "High";
    else severity = "Critical";

    const vectorString = `CVSS:3.1/AV:${metrics.attackVector[0]}/AC:${metrics.attackComplexity[0]}/PR:${metrics.privilegesRequired[0]}/UI:${metrics.userInteraction[0]}/S:${metrics.scope[0]}/C:${metrics.confidentiality[0]}/I:${metrics.integrity[0]}/A:${metrics.availability[0]}`;

    return {
      score: Number(baseScore.toFixed(1)),
      severity,
      vectorString,
    };
  }
}

// ============================================================================
// 5. DETERMINISTIC FINDING DEDUPLICATOR
// ============================================================================

export class FindingDeduplicator {
  private seenHashes: Set<string> = new Set();

  public static normalizePath(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      // Remove trailing slash and normalize pathname
      let pathname = url.pathname.replace(/\/+$/, "") || "/";
      return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${pathname}`;
    } catch {
      return urlStr.toLowerCase().trim().replace(/\/+$/, "");
    }
  }

  public static generateSignature(
    targetUrl: string,
    cwe: string | null | undefined,
    tool: string,
    vulnerabilityType: string
  ): string {
    const normalizedUrl = this.normalizePath(targetUrl);
    const normalizedCwe = (cwe || "UNKNOWN").toUpperCase().trim();
    const normalizedTool = tool.toLowerCase().trim();
    const normalizedType = vulnerabilityType.toLowerCase().trim();
    return `${normalizedUrl}|${normalizedCwe}|${normalizedTool}|${normalizedType}`;
  }

  public isDuplicate(
    targetUrl: string,
    cwe: string | null | undefined,
    tool: string,
    vulnerabilityType: string
  ): boolean {
    const sig = FindingDeduplicator.generateSignature(targetUrl, cwe, tool, vulnerabilityType);
    if (this.seenHashes.has(sig)) {
      return true;
    }
    this.seenHashes.add(sig);
    return false;
  }

  public clear(): void {
    this.seenHashes.clear();
  }
}

// ============================================================================
// 6. CYBERSECURITY AI GUARD & TOKEN ESTIMATOR
// ============================================================================

export class AiSecurityGuard {
  // Common prompt injection, jailbreak and system leak signatures
  private static readonly INJECTION_PATTERNS: RegExp[] = [
    /\bignore\s+(all\s+)?(previous|prior)\s+instructions\b/i,
    /\bdisregard\s+(all\s+)?(previous|system)\s+rules\b/i,
    /\byou\s+are\s+now\s+(DAN|unfiltered|jailbroken|an\s+adversary)\b/i,
    /\breveal\s+(your\s+)?system\s+prompt\b/i,
    /\bwhat\s+(were\s+)?your\s+initial\s+instructions\b/i,
    /\bprint\s+system\s+prompt\b/i,
    /<\/?system>/i,
    /\[system_prompt\]/i,
    /\bdo\s+anything\s+now\b/i,
  ];

  public static inspectPrompt(prompt: string): { isSafe: boolean; flaggedPattern?: string } {
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        return { isSafe: false, flaggedPattern: pattern.source };
      }
    }
    return { isSafe: true };
  }

  /**
   * Fast Byte-Pair / Subword Token Estimator for LLM context budgets
   * Average English technical & cybersecurity code is ~3.7 - 4.0 characters per token.
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    // Count words, punctuation, and code symbols
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    // Hybrid token count model: Math.max(words * 1.3, chars / 3.8)
    return Math.ceil(Math.max(words * 1.3, chars / 3.8));
  }

  /**
   * Context Window Budget Health Check
   */
  public static checkContextBudget(
    totalTokens: number,
    contextLimit: number = 8192
  ): {
    usagePercent: number;
    isCritical: boolean;
    remainingTokens: number;
  } {
    const usagePercent = Math.min(100, Math.round((totalTokens / contextLimit) * 100));
    return {
      usagePercent,
      isCritical: usagePercent >= 85,
      remainingTokens: Math.max(0, contextLimit - totalTokens),
    };
  }
}
