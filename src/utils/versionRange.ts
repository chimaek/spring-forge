/**
 * Spring Initializr의 versionRange 문자열을 파싱하여
 * 주어진 Boot 버전이 호환되는지 확인한다.
 *
 * 예시 형식: "[3.0.0,3.2.0)", "[3.1.0,)" , "(,3.3.0]"
 */
export function isCompatible(
  versionRange: string | undefined,
  bootVersion: string
): boolean {
  if (!versionRange) {
    return true;
  }

  const match = versionRange.match(
    /^([\[\(])([\d.]*),([\d.]*)([\]\)])$/
  );
  if (!match) {
    return true;
  }

  const [, startBracket, start, end, endBracket] = match;
  const v = parseVersion(bootVersion);

  if (start) {
    const s = parseVersion(start);
    const cmp = compareVersions(v, s);
    const afterStart = startBracket === "[" ? cmp >= 0 : cmp > 0;
    if (!afterStart) {
      return false;
    }
  }

  if (end) {
    const e = parseVersion(end);
    const cmp = compareVersions(v, e);
    const beforeEnd = endBracket === "]" ? cmp <= 0 : cmp < 0;
    if (!beforeEnd) {
      return false;
    }
  }

  return true;
}

function parseVersion(ver: string): number[] {
  return ver.split(".").map(Number);
}

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) {
      return (a[i] || 0) - (b[i] || 0);
    }
  }
  return 0;
}
