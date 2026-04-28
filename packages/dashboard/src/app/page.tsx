"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AgentChat } from "@/components/AgentChat";
import { TopBar } from "@/components/TopBar";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Inbox } from "@/components/Inbox";

export default function DashboardPage() {
  const [showChat, setShowChat] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      <TopBar onInbox={() => setShowInbox(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {showInbox ? (
            <Inbox />
          ) : showChat ? (
            <AgentChat />
          ) : (
            <WelcomeScreen onStart={() => setShowChat(true)} />
          )}
        </main>
      </div>
    </div>
  );
}
