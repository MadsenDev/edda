import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/boot.css";
import "./styles/app.css";

const root = document.getElementById("root")!;
createRoot(root).render(<App />);

// dismiss boot splash after a short delay to let React paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("boot");
    if (splash) {
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      setTimeout(() => splash.remove(), 600);
    }
  });
});
