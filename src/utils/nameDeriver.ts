/** artifactId -> 표시 이름 변환: "my-spring-app" -> "My Spring App" */
export function toDisplayName(artifactId: string): string {
  return artifactId
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** groupId + artifactId -> packageName 자동 생성 */
export function derivePackageName(
  groupId: string,
  artifactId: string
): string {
  const sanitize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "")
      .replace(/^\.+|\.+$/g, "");
  return `${sanitize(groupId)}.${sanitize(artifactId)}`;
}
