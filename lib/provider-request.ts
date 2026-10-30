/** Retry transient upstream failures once, within the caller's existing deadline. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: {
    onRetry?: () => void;
    fetcher?: typeof fetch;
    delay?: (ms: number) => Promise<void>;
  } = {},
) {
  const fetcher = options.fetcher || fetch;
  let response = await fetcher(url, init);
  if ([502, 503, 504].includes(response.status) && !init.signal?.aborted) {
    await response.body?.cancel();
    options.onRetry?.();
    await (
      options.delay ||
      ((ms: number) =>
        new Promise<void>((resolve, reject) => {
          const cleanup = () =>
            init.signal?.removeEventListener("abort", abort);
          const timer = setTimeout(() => {
            cleanup();
            resolve();
          }, ms);
          const abort = () => {
            clearTimeout(timer);
            cleanup();
            reject(new Error("Research deadline reached."));
          };
          if (init.signal?.aborted) abort();
          else init.signal?.addEventListener("abort", abort, { once: true });
        }))
    )(1500);
    response = await fetcher(url, init);
  }
  return response;
}
