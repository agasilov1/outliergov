

## Fix: Client-Side Error Handling for Create User

### Problem
The edge function is deployed and responding correctly. The client-side error handler in `Admin.tsx` (line 198-206) tries to extract the error message via `error.context.json()`, but this is unreliable because:
1. `FunctionsHttpError.context` is a `Response` whose body may already be consumed by the SDK
2. The fallback silently swallows the real error, always showing "Failed to create user"

### Fix

**File: `src/pages/Admin.tsx` (lines 198-206)**

Replace the error extraction with a more robust approach that handles multiple error shapes from `supabase.functions.invoke`:

```typescript
if (error) {
  let msg = 'Failed to create user';
  console.error('create-user invoke error:', error);
  try {
    // FunctionsHttpError has context as Response
    if (error && typeof error === 'object' && 'context' in error) {
      const ctx = (error as any).context;
      if (ctx instanceof Response) {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      } else if (typeof ctx === 'object' && ctx?.error) {
        msg = ctx.error;
      }
    } else if (error instanceof Error) {
      msg = error.message;
    }
  } catch {
    // If context.json() fails (body consumed), try message
    if (error instanceof Error && error.message && error.message !== 'FunctionsHttpError') {
      msg = error.message;
    }
  }
  throw new Error(msg);
}
```

Also add `console.error` before the toast in the catch block (~line 225) so we can see the full error chain if it persists:

```typescript
} catch (err: any) {
  console.error('Create user full error:', err);
  toast.error(err.message || 'Failed to create user');
}
```

### Single file change
- `src/pages/Admin.tsx` — improved error extraction + added diagnostic logging

