import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FinancialApp } from "./FinancialApp";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("表示先の要素が見つかりません。");
}

createRoot(root).render(
  <StrictMode>
    <FinancialApp />
  </StrictMode>,
);
