"use client";

import { Routes, Route, HashRouter as Router } from "react-router-dom";
import styles from "./home.module.scss";
import { SideBar } from "./sidebar";
import Chat from "./chat";
import { MaskPage } from "./mask-page";
import { useEffect } from "react";
import { useMaskStore } from "../store/mask";

export default function Home() {
  
  return (
    <Router>
      <div className={styles.container}>
        <SideBar />

        <div className={styles["window-content"]} >
          <Routes>
            <Route path="/" element={<MaskPage />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
