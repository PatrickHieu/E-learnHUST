// Web Worker that hosts Pyodide. Keeps the ~10MB CPython runtime off
// the main thread so the UI never freezes while loading or executing.
// The main page communicates via postMessage:
//   send: { type: "run", code: "..." }
//   recv: { type: "loading" | "ready" | "stdout" | "stderr" | "result" | "error", ... }

self.languagePluginUrl = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");

let pyodideReadyPromise = null;

function setupPyodide() {
  if (pyodideReadyPromise) return pyodideReadyPromise;
  pyodideReadyPromise = (async () => {
    self.postMessage({ type: "loading" });
    const pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
    });
    // Route Python stdout/stderr back to the page in real time so the
    // UI can stream output instead of waiting until execution ends.
    pyodide.setStdout({
      batched: (s) => self.postMessage({ type: "stdout", data: s }),
    });
    pyodide.setStderr({
      batched: (s) => self.postMessage({ type: "stderr", data: s }),
    });
    self.postMessage({ type: "ready" });
    return pyodide;
  })();
  return pyodideReadyPromise;
}

self.onmessage = async (event) => {
  const { type, code } = event.data ?? {};
  if (type !== "run") return;
  try {
    const pyodide = await setupPyodide();
    let result;
    try {
      result = await pyodide.runPythonAsync(code ?? "");
    } catch (err) {
      self.postMessage({
        type: "error",
        data: err && err.message ? String(err.message) : String(err),
      });
      return;
    }
    self.postMessage({
      type: "result",
      // Pyodide returns Python proxies for non-primitive results; coerce
      // to a printable string so the page doesn't have to handle the
      // PyProxy lifecycle.
      data: result === undefined ? "" : String(result),
    });
  } catch (err) {
    self.postMessage({
      type: "error",
      data: err && err.message ? String(err.message) : String(err),
    });
  }
};
