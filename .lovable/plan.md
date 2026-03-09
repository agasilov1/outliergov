

## Fix React Hook Bugs

### 1. Fix `useToast` dependency array (src/hooks/use-toast.ts)

Line 177: Change `[state]` to `[]`. The current dependency causes the listener to unsubscribe and re-subscribe on every state change, which is wasteful and can cause missed updates during the splice/push gap.

### 2. Fix `useWatchlist` stale closure (src/hooks/useWatchlist.ts)

The `toggleMutation` captures `watchlistSet` from render time. On rapid clicks, the set is stale. Fix: query the current watchlist state inside the mutation function instead of relying on the closure.

```typescript
mutationFn: async (npi: string) => {
  if (!user) throw new Error('Not authenticated');
  // Query fresh state instead of using stale watchlistSet
  const { data: existing } = await supabase
    .from('watchlist_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('npi', npi)
    .maybeSingle();
    
  if (existing) {
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('user_id', user.id)
      .eq('npi', npi);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('watchlist_items')
      .insert({ user_id: user.id, npi });
    if (error) throw error;
  }
},
```

### 3. Fix `useAuth` race condition and unmount safety (src/contexts/AuthContext.tsx)

Two changes:

**a) Race condition**: `setLoading(false)` fires before `fetchUserRoles` resolves, so `isAdmin` briefly returns false. Fix: await both fetches before setting loading to false.

```typescript
// In getSession callback:
if (session?.user) {
  await fetchUserRoles(session.user.id);
  await fetchMustChangePassword(session.user.id);
}
setLoading(false);
```

**b) Unmount cleanup**: Add an `isMounted` ref to guard state updates from the `onAuthStateChange` callback's deferred fetches, and clear the timeout on cleanup.

```typescript
const isMounted = useRef(true);
// ... in useEffect cleanup:
return () => {
  isMounted.current = false;
  subscription.unsubscribe();
};
```

Guard all `setState` calls in `fetchUserRoles` and `fetchMustChangePassword` with `if (!isMounted.current) return;`.

### Files changed
- `src/hooks/use-toast.ts` — one line change
- `src/hooks/useWatchlist.ts` — replace mutation function body
- `src/contexts/AuthContext.tsx` — await fetches before setLoading, add unmount guard

