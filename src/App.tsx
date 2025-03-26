import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar.tsx";
import AskAnything from "./components/AskAnything.tsx";
import { AppContextProvider } from "./context/AppContext.js";
import "./styles/styles.css";

const App: React.FC = () => {
  return (
    <AppContextProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/ask" replace />} />
              <Route path="/ask" element={<AskAnything />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AppContextProvider>
  );
};

export default App;
