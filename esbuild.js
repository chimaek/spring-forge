const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

// Extension Host: Node.js CommonJS
const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode", "@aws-sdk/*"],
  sourcemap: !production,
  minify: production,
};

// Webview: 브라우저 IIFE
const webviewConfig = {
  entryPoints: ["src/panel/webview/main.ts"],
  bundle: true,
  outfile: "dist/webview/main.js",
  platform: "browser",
  format: "iife",
  sourcemap: !production,
  minify: production,
};

// CSS 번들
const cssConfig = {
  entryPoints: ["src/panel/webview/styles/main.css"],
  outfile: "dist/webview/main.css",
  bundle: true,
};

async function build() {
  if (watch) {
    const [extCtx, webCtx, cssCtx] = await Promise.all([
      esbuild.context(extensionConfig),
      esbuild.context(webviewConfig),
      esbuild.context(cssConfig),
    ]);
    await Promise.all([extCtx.watch(), webCtx.watch(), cssCtx.watch()]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
      esbuild.build(cssConfig),
    ]);
    console.log("Build complete");
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
