// Replaces the iframe UI only in offline guard tests; background gate security is tested separately.
export function openGate(payload) { globalThis.guardTest.gates.push(payload); return globalThis.guardTest.choose(payload); }
export function cancelGate() {}
