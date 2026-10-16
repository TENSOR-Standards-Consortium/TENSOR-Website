// Public examples and tools must load the exact bytes in their shared inventory.
// Private imports retain their own declared definitions and do not use this gate.
export async function artifactDigest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function datasetArtifact(response, pin) {
  if (!pin || !response.ok) throw new Error('Current dataset artifact is unavailable. Reload the site and try again.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = await artifactDigest(bytes);
  if (bytes.length !== pin.bytes || digest !== pin.sha256) throw new Error('This download differs from the current dataset inventory. Reload the site before continuing.');
  return bytes;
}
