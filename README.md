# Apollo Client: useQuery stays loading after skipToken

Reproduction for [apollographql/apollo-client#13499](https://github.com/apollographql/apollo-client/issues/13499).

A `useQuery` that goes from `skipToken` back to options never leaves `loading: true` when all of these hold:

1. `notifyOnNetworkStatusChange` is `false`.
2. While the query was skipped, the cache lost a field the query selects (`evict`, `cache.modify` with `DELETE`, or `gc`).
3. The refetch returns data deep-equal to the result the query emitted before it was skipped.

## Run it

```sh
npm install
npm test
```

Expected output with `@apollo/client` 4.3.5:

```
× loads again after skipToken when a cache field is gone and the refetch is unchanged
✓ loads again after skipToken when the cache is complete

AssertionError: expected true to be false
```

The test in `src/skipToken.test.tsx` renders the hook, waits for data, rerenders with `skipToken`, evicts the field, and rerenders with the same variables. The second test runs the same steps without the eviction and passes.

## Cause

`ObservableQuery` drops a result that is deep-equal to `context.previous`. The `standby` branch does not reset `context.previous`, so the refetch result after standby is compared with the result from before standby and is dropped. The hook got a `loading: true` snapshot when it left standby, and nothing updates it after that.

`refetch` and `setVariables` force the first non-loading result through with `forceFirstValueEmit` in `ObservableQuery.fetch`. Setting the same flag when the query leaves `standby` makes the failing test pass.

## Versions

| Package | Version |
| --- | --- |
| @apollo/client | 4.3.5 |
| graphql | 17.0.2 |
| react, react-dom | 19.3.1 |
| rxjs | 7.8.2 |
| vitest | 5.0.5 |
| @testing-library/react | 16.3.3 |
| Node.js | 26.8.1 |

The test also fails on `@apollo/client` 4.3.1, 4.3.3 and 4.3.4.
