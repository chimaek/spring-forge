export function createGenerateButton(
  container: HTMLElement,
  onGenerate: () => void
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = "generateBtn";
  btn.className = "generate-btn";
  btn.textContent = "Generate Project";
  btn.addEventListener("click", onGenerate);
  container.appendChild(btn);
  return btn;
}
