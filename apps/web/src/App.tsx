import { BlinkifyDemo } from "./components/BlinkifyDemo";
import { WalletProviders } from "./wallet/WalletContext";

const App = (): JSX.Element => {
  return (
    <WalletProviders>
      <main>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ marginBottom: "0.25rem" }}>Fartnode Blinkify Demo</h1>
          <p style={{ marginTop: 0, color: "#475569" }}>
            Connect a Devnet wallet, simulate first, and share your Blink.
          </p>
        </header>
        <BlinkifyDemo />
      </main>
    </WalletProviders>
  );
};

export default App;
