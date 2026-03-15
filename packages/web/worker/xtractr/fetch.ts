const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export { MAX_SIZE }

export async function readResponseWithLimit(
  response: Response,
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    return response.text()
  }

  const chunks: Uint8Array[] = []
  let totalSize = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalSize += value.byteLength
    if (totalSize > MAX_SIZE) {
      reader.cancel()
      throw new Error(
        `Page too large (>${Math.round(MAX_SIZE / 1024 / 1024)}MB, max 5MB)`,
      )
    }
    chunks.push(value)
  }

  const combined = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder().decode(combined)
}
