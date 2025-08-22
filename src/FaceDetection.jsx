import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

// Status indicator component to demonstrate props
const StatusIndicator = ({ label, value, color = "#333" }) => (
  <div style={{ 
    padding: "10px", 
    margin: "5px", 
    backgroundColor: "#f5f5f5", 
    borderRadius: "5px",
    borderLeft: `4px solid ${color}`
  }}>
    <strong style={{ color }}>{label}:</strong> {value}
  </div>
);

// Detection history component to demonstrate list rendering
const DetectionHistory = ({ history }) => (
  <div style={{ marginTop: "20px", maxHeight: "200px", overflowY: "auto" }}>
    <h4>Detection History:</h4>
    {history.length > 0 ? (
      <ul style={{ listStyle: "none", padding: 0 }}>
        {history.map((entry, index) => (
          <li 
            key={`${entry.timestamp}-${index}`}
            style={{
              padding: "8px",
              margin: "4px 0",
              backgroundColor: index === 0 ? "#e8f5e8" : "#f9f9f9",
              borderRadius: "4px",
              fontSize: "14px"
            }}
          >
            <strong>{entry.position}</strong> at {entry.time}
          </li>
        ))}
      </ul>
    ) : (
      <p style={{ fontStyle: "italic", color: "#666" }}>No detections yet...</p>
    )}
  </div>
);

const FaceDetection = ({ title = "Face Detection App" }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [headPosition, setHeadPosition] = useState("Detecting...");
  const [rmsValue, setRmsValue] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState([]);

  const lastPositionRef = useRef("");
  const positionStartTimeRef = useRef(null);
  const screenshotTakenRef = useRef(false);

  // For RMS smoothing and detection
  const smoothedRmsRef = useRef(0);
  const prevSmoothedRmsRef = useRef(0);
  const alpha = 0.1; // smoothing factor
  const rmsThreshold = 0.005; // threshold for detecting minute changes

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          alert("Camera access denied. Please allow permission.");
        });
    };

    const takeScreenshotAndUpload = () => {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL("image/png");
      const timestamp = new Date().toISOString();

      fetch("http://localhost:5000/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, timestamp }),
      })
        .then((res) => res.text())
        .then((data) => console.log("Upload response:", data))
        .catch((err) => console.error("Upload error:", err));
    };

    const analyzeHeadOrientation = (landmarks) => {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();

      const eyeAngle =
        (Math.atan2(
          rightEye[0].y - leftEye[0].y,
          rightEye[0].x - leftEye[0].x
        ) *
          180) /
        Math.PI;

      const noseTip = nose[3];
      const leftEyeCenter = {
        x: (leftEye[0].x + leftEye[3].x) / 2,
        y: (leftEye[1].y + leftEye[4].y) / 2,
      };
      const rightEyeCenter = {
        x: (rightEye[0].x + rightEye[3].x) / 2,
        y: (rightEye[1].y + rightEye[4].y) / 2,
      };
      const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
      const dx = noseTip.x - eyeMidX;

      let newPosition = "Straight";
      if (eyeAngle > 10) newPosition = "Tilted Right";
      else if (eyeAngle < -10) newPosition = "Tilted Left";
      else if (dx > 15) newPosition = "Turned Right";
      else if (dx < -15) newPosition = "Turned Left";

      setHeadPosition(newPosition);

      // Add to detection history when position changes
      if (newPosition !== lastPositionRef.current && newPosition !== "Detecting...") {
        setDetectionHistory(prev => [
          {
            position: newPosition,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 9) // Keep only last 10 entries
        ]);
      }

      const now = Date.now();
      const targetPositions = ["Turned Right", "Turned Left"];

      if (newPosition === lastPositionRef.current) {
        if (
          targetPositions.includes(newPosition) &&
          positionStartTimeRef.current &&
          now - positionStartTimeRef.current >= 2000 && // 2 seconds
          !screenshotTakenRef.current
        ) {
          console.log("Taking screenshot for sustained position:", newPosition);
          takeScreenshotAndUpload();
          screenshotTakenRef.current = true;
        }
      } else {
        lastPositionRef.current = newPosition;
        positionStartTimeRef.current = now;
        screenshotTakenRef.current = false;
        console.log("New head position:", newPosition);
      }
    };

    loadModels().then(startVideo);

    // Face detection loop
    videoRef.current?.addEventListener("play", () => {
      const canvas = canvasRef.current;
      const displaySize = { width: 720, height: 560 };
      faceapi.matchDimensions(canvas, displaySize);
      
      setIsDetecting(true);

      const interval = setInterval(async () => {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections) {
          const resized = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceLandmarks(canvas, resized);
          analyzeHeadOrientation(resized.landmarks);
        } else {
          setHeadPosition("No Face Detected");
          lastPositionRef.current = "";
          positionStartTimeRef.current = null;
          screenshotTakenRef.current = false;
        }
      }, 300);

      return () => {
        clearInterval(interval);
        setIsDetecting(false);
      };
    });

    // Audio analysis for minute voice changes using RMS of waveform data
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((audioStream) => {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(audioStream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.fftSize);

        setInterval(() => {
          analyser.getByteTimeDomainData(dataArray);

          // Calculate RMS from waveform data
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const norm = (dataArray[i] - 128) / 128; // normalize to [-1, 1]
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          // Smooth RMS with exponential smoothing
          smoothedRmsRef.current =
            alpha * rms + (1 - alpha) * smoothedRmsRef.current;

          const change = Math.abs(
            smoothedRmsRef.current - prevSmoothedRmsRef.current
          );

          if (change > rmsThreshold) {
            console.log(
              "Minute voice change detected - RMS:",
              smoothedRmsRef.current.toFixed(4),
              "Change:",
              change.toFixed(4)
            );
            setRmsValue(smoothedRmsRef.current.toFixed(4));

            // Send RMS value to backend
            fetch("http://localhost:5000/audio-rms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                rms: smoothedRmsRef.current,
                timestamp: new Date().toISOString(),
              }),
            }).catch((err) =>
              console.error("Failed to send RMS data to backend:", err)
            );
          }

          prevSmoothedRmsRef.current = smoothedRmsRef.current;
        }, 200);
      })
      .catch((err) => {
        console.error("Audio permission error:", err);
      });
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>{title}</h1>
      
      {/* Status indicators using props */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        flexWrap: "wrap", 
        maxWidth: "800px", 
        margin: "0 auto" 
      }}>
        <StatusIndicator 
          label="Head Position" 
          value={headPosition}
          color={headPosition === "No Face Detected" ? "#dc3545" : "#28a745"}
        />
        <StatusIndicator 
          label="Voice RMS" 
          value={rmsValue !== null ? rmsValue : "Detecting..."}
          color="#007bff"
        />
        {/* Conditional rendering with logical AND */}
        {isDetecting && (
          <StatusIndicator 
            label="Detection Status" 
            value="Active"
            color="#17a2b8"
          />
        )}
      </div>

      <div style={{ position: "relative", display: "inline-block", marginTop: "20px" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width="720"
          height="560"
          style={{ border: "2px solid black", borderRadius: 8 }}
        />
        <canvas
          ref={canvasRef}
          width="720"
          height="560"
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </div>

      {/* List rendering with map() and keys */}
      <DetectionHistory history={detectionHistory} />
      
      {/* Additional conditional rendering examples */}
      {headPosition !== "Detecting..." && headPosition !== "No Face Detected" && (
        <div style={{ 
          marginTop: "15px", 
          padding: "10px", 
          backgroundColor: "#d4edda", 
          borderRadius: "5px",
          display: "inline-block"
        }}>
          <small>Face detected and positioned!</small>
        </div>
      )}
      
      {rmsValue && parseFloat(rmsValue) > 0.01 && (
        <div style={{ 
          marginTop: "10px", 
          padding: "8px", 
          backgroundColor: "#fff3cd", 
          borderRadius: "5px",
          display: "inline-block"
        }}>
          <small>Voice activity detected!</small>
        </div>
      )}
    </div>
  );
};

export default FaceDetection;
