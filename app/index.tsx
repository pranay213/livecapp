import VideoCall from "@/components/video-call";
import React from "react";
import { SafeAreaView } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <VideoCall />
    </SafeAreaView>
  );
}
