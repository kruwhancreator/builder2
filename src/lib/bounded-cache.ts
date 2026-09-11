export class BoundedCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  constructor(private limit: number, private ttl: number) {}
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.expires <= Date.now()) { this.entries.delete(key); return; }
    this.entries.delete(key); this.entries.set(key, entry);
    return entry.value;
  }
  set(key: string, value: T) {
    this.entries.delete(key);
    for (const [id, entry] of this.entries) if (entry.expires <= Date.now()) this.entries.delete(id);
    while (this.entries.size >= this.limit) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { value, expires: Date.now() + this.ttl });
  }
  clear() { this.entries.clear(); }
  get size() { return this.entries.size; }
}
