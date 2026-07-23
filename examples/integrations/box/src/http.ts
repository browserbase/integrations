export async function responseError(response: Response, action: string) {
  const body = await response.text();
  throw new Error(
    `${action} failed (${response.status} ${response.statusText}): ${body}`
  );
}
