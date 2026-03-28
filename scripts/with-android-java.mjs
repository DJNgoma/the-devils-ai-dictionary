import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/with-android-java.mjs <command> [args...]");
  process.exit(1);
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }

  const candidates = [
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

const javaHome = resolveJavaHome();
const env = { ...process.env };

if (javaHome) {
  env.JAVA_HOME = javaHome;
  env.PATH = `${javaHome}/bin:${process.env.PATH ?? ""}`;
}

const child = spawn(command, args, {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
