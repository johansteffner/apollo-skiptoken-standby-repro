import type { TypedDocumentNode } from "@apollo/client";
import { InMemoryCache, gql } from "@apollo/client";
import { skipToken, useQuery } from "@apollo/client/react";
import type { MockLink } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const GREETING: TypedDocumentNode<{ greeting: string }, { name: string }> = gql`
  query Greeting($name: String!) {
    greeting(name: $name)
  }
`;

const greetingMock: MockLink.MockedResponse = {
  request: { query: GREETING, variables: { name: "Ada" } },
  result: { data: { greeting: "Hello Ada" } },
};

function setup() {
  const cache = new InMemoryCache();
  const mocks = [greetingMock, greetingMock];
  const initialProps: { name?: string } = { name: "Ada" };
  const view = renderHook(
    ({ name }: { name?: string }) =>
      useQuery(GREETING, name ? { variables: { name } } : skipToken),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MockedProvider
          cache={cache}
          defaultOptions={{ watchQuery: { notifyOnNetworkStatusChange: false } }}
          mocks={mocks}
        >
          {children}
        </MockedProvider>
      ),
      initialProps,
    },
  );
  return { cache, ...view };
}

// Fails: `loading` stays true after the query leaves skipToken.
// It passes when notifyOnNetworkStatusChange is true, the Apollo Client 4 default.
it("loads again after skipToken when a cache field is gone and the refetch is unchanged", async () => {
  const { cache, result, rerender } = setup();
  await waitFor(() => expect(result.current.data).toEqual({ greeting: "Hello Ada" }));

  rerender({});
  await act(async () => {});
  cache.evict({ id: "ROOT_QUERY", fieldName: "greeting" });

  rerender({ name: "Ada" });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual({ greeting: "Hello Ada" });
});

// Control: the same steps without the eviction pass.
it("loads again after skipToken when the cache is complete", async () => {
  const { result, rerender } = setup();
  await waitFor(() => expect(result.current.data).toEqual({ greeting: "Hello Ada" }));

  rerender({});
  await act(async () => {});

  rerender({ name: "Ada" });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual({ greeting: "Hello Ada" });
});
