const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { setTimeout: pause } = require("node:timers/promises");
const base = process.env.NOTEBOOK_URL || "http://127.0.0.1:8888";
const token = process.env.JUPYTER_TOKEN || "local-notebook-fixture";
const url = (path) =>
  `${base}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(
    token
  )}`;

(async () => {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if ((await fetch(url("/api/status"))).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(1000);
  }
  assert(ready, "Notebook server did not become ready");
  assert.equal((await fetch(url("/lab/tree/data/sin_wave.ipynb"))).status, 200);
  const kernelResponse = await fetch(url("/api/kernels"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "python3" }),
  });
  assert.equal(kernelResponse.status, 201);
  const kernel = await kernelResponse.json();
  const session = randomUUID();
  const ws = new WebSocket(
    url(`/api/kernels/${kernel.id}/channels?session_id=${session}`).replace(
      /^http/,
      "ws"
    )
  );
  const socketReady = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const execute = (code) =>
    new Promise((resolve, reject) => {
      const msg_id = randomUUID();
      let output = "",
        displays = 0;
      const done = (error) => {
        clearTimeout(timeout);
        ws.removeEventListener("message", onMessage);
        error ? reject(error) : resolve({ output, displays });
      };
      const timeout = setTimeout(
        () => done(new Error("Kernel execution timed out")),
        120000
      );
      const onMessage = ({ data }) => {
        try {
          const message = JSON.parse(data);
          if (message.parent_header.msg_id !== msg_id) return;
          if (message.msg_type === "stream") output += message.content.text;
          if (
            message.msg_type === "display_data" ||
            message.msg_type === "execute_result"
          )
            displays++;
          if (message.msg_type === "error")
            throw new Error(
              `Kernel raised ${message.content.ename}: ${message.content.evalue}`
            );
          if (
            message.msg_type === "status" &&
            message.content.execution_state === "idle"
          )
            done();
        } catch (error) {
          done(error);
        }
      };
      ws.addEventListener("message", onMessage);
      ws.send(
        JSON.stringify({
          header: {
            msg_id,
            username: "fixture",
            session,
            msg_type: "execute_request",
            version: "5.3",
            date: new Date().toISOString(),
          },
          parent_header: {},
          metadata: {},
          channel: "shell",
          content: {
            code,
            silent: false,
            store_history: false,
            user_expressions: {},
            allow_stdin: false,
            stop_on_error: true,
          },
        })
      );
    });
  try {
    await socketReady;
    for (const file of ["sin_wave.ipynb", "cos_wave.ipynb"]) {
      const response = await fetch(url(`/api/contents/data/${file}`));
      assert.equal(response.status, 200);
      const notebook = await response.json();
      assert.equal(notebook.type, "notebook");
      assert.equal(notebook.content.nbformat, 4);
      const code = notebook.content.cells
        .filter((cell) => cell.cell_type === "code")
        .map((cell) => Array.isArray(cell.source) ? cell.source.join("") : cell.source)
        .join("\n\n");
      assert(code.length > 0);
      assert(
        (await execute(code)).displays > 0,
        "Existing notebook must render its plot"
      );
    }
    const result = await execute(
      readFileSync(join(__dirname, "kernel_checks.py"), "utf8")
    );
    assert.deepEqual(JSON.parse(result.output.trim()), {
      sum: 10,
      rows: 2,
      traces: 1,
      uid: 1000,
      installer: true,
    });
    console.log(
      "Existing notebooks rendered; nonroot scientific execution and pip HTTP/cache installation passed"
    );
  } finally {
    ws.close();
    const response = await fetch(url(`/api/kernels/${kernel.id}`), {
      method: "DELETE",
    });
    assert.equal(response.status, 204);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
