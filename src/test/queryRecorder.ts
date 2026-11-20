// Stand-in for a supabase-js query builder. Every chained call (select, eq, order, ...) is
// recorded and returns the same object; awaiting it resolves to the given result, the way
// a real PostgREST query resolves to { data, error }.
export interface RecordedQuery {
  builder: unknown;
  calls: Array<{ method: string; args: unknown[] }>;
  methods: () => string[];
}

export function recordQuery(result: { data: unknown; error: unknown }): RecordedQuery {
  const calls: RecordedQuery['calls'] = [];
  const builder: object = new Proxy({}, {
    get(_target, property) {
      if (property === 'then') {
        return (onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled, onRejected);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(property), args });
        return builder;
      };
    },
  });
  return { builder, calls, methods: () => calls.map(c => c.method) };
}
