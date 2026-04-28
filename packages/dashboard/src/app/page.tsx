"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AgentChat } from "@/components/AgentChat";
import { TopBar } from "@/components/TopBar";
import { WelcomeScreen } from "@/components/WelcomeScreen";

export default function DashboardPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {showChat ? <AgentChat /> : <WelcomeScreen onStart={() => setShowChat(true)} />}
        </main>
      </div>
    </div>
  );
}
