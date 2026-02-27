import * as path from "path";
import * as fs from "fs";
import Mocha from "mocha";

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: "bdd",
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname);

  const files = fs
    .readdirSync(testsRoot)
    .filter((file) => file.endsWith(".test.js"));

  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
