import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from "react-native";
import {
  RTCView,
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStreamTrack,
} from "react-native-webrtc";
import io from "socket.io-client";

const socket = io("http://192.168.29.244:5000"); // Replace with your backend IP

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoCall() {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const peerConnection = useRef<any>(null);

  useEffect(() => {
    requestPermissions();
    startLocalStream();
    socket.on("offer", handleReceiveOffer);
    socket.on("answer", handleReceiveAnswer);
    socket.on("ice-candidate", handleReceiveIceCandidate);
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    }
  };

  const startLocalStream = async () => {
    const stream = await mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
  };

  const startCall = async () => {
    peerConnection.current = new RTCPeerConnection(configuration);

    localStream?.getTracks().forEach((track: MediaStreamTrack) => {
      peerConnection.current?.addTrack(track, localStream);
    });

    peerConnection.current.ontrack = (event: { streams: any[] }) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current.onicecandidate = (event: { candidate: any }) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(
      new RTCSessionDescription(offer)
    );
    socket.emit("offer", { offer });
  };

  const handleReceiveOffer = async ({
    offer,
  }: {
    offer: RTCSessionDescriptionInit;
  }) => {
    peerConnection.current = new RTCPeerConnection(configuration);

    localStream?.getTracks().forEach((track: MediaStreamTrack) => {
      peerConnection.current?.addTrack(track, localStream);
    });

    peerConnection.current.ontrack = (event: { streams: any[] }) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current.onicecandidate = (event: { candidate: any }) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(
      new RTCSessionDescription(answer)
    );
    socket.emit("answer", { answer });
  };

  const handleReceiveAnswer = async ({
    answer,
  }: {
    answer: RTCSessionDescriptionInit;
  }) => {
    await peerConnection.current?.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleReceiveIceCandidate = async ({
    candidate,
  }: {
    candidate: RTCIceCandidateInit;
  }) => {
    if (candidate) {
      await peerConnection.current?.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    }
  };

  return (
    <View style={styles.container}>
      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.video} />
      )}
      {remoteStream && (
        <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
      )}
      <Button title="Start Call" onPress={startCall} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: 300,
    height: 300,
    backgroundColor: "black",
    marginBottom: 20,
  },
});
