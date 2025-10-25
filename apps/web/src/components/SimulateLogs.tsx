import { useState } from "react";

type SimulateLogsProps = {
  logs?: string[];
};

export const SimulateLogs = ({ logs }: SimulateLogsProps): JSX.Element | null => {
  const [expanded, setExpanded] = useState(false);

  if (!logs?.length) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: "1.5rem",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: "0.75rem",
        overflow: "hidden"
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          border: "none",
          background: "rgba(99, 102, 241, 0.08)",
          fontWeight: 600,
          textAlign: "left"
        }}
      >
        Simulation Logs {expanded ? "▴" : "▾"}
      </button>
      {expanded ? (
        <pre
          style={{
            margin: 0,
            padding: "1rem",
            background: "rgba(15, 23, 42, 0.85)",
            color: "#e2e8f0",
            fontSize: "0.85rem",
            whiteSpace: "pre-wrap"
          }}
        >
          {logs.join("\n")}
        </pre>
      ) : null}
    </section>
  );
};
