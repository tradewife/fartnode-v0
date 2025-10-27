import { BlinkifyDemo } from "./components/BlinkifyDemo";
import { WalletProviders } from "./wallet/WalletContext";

const App = (): JSX.Element => {
  return (
    <WalletProviders>
      <main>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ marginBottom: "0.25rem" }}>Fartnode Institutional Blink Demo</h1>
          <p style={{ marginTop: 0, color: "#475569" }}>
            Connect a Solana wallet, compose a transfer with institutional safeguards, simulate, and share the Blink.
          </p>
        </header>
        <BlinkifyDemo />
      </main>
    </WalletProviders>
  );
};

export default App;
