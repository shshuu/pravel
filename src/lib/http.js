export function jsonResponse(data, { status = 200, headers = {} } = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders
  });
}
