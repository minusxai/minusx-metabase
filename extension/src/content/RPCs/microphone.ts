import { sendIFrameMessage } from "./domEvents";

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.continuous = true;

let isListening = false;

let previousTranscript = '';
let currentResultIndex = -1;
recognition.onresult = (event) => {
  let transcript = [];
  for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      transcript.push(result[0].transcript);
  }
  const completeTranscript = transcript.join('');
  let transcriptDiff = ''
  if (event.resultIndex > currentResultIndex) {
    currentResultIndex = event.resultIndex;
    previousTranscript = completeTranscript;
    transcriptDiff = completeTranscript;
  } else {
    transcriptDiff = completeTranscript.substring(previousTranscript.length);
    previousTranscript = completeTranscript
  }
  sendIFrameMessage({
    key: 'recordingTranscript',
    value: transcriptDiff
  })
};

recognition.onerror = (event) => {
  console.error("Recognition error:", event.error);
};

export const startRecording = () => {
  if (!isListening) {
    recognition.start();
    isListening = true;
  }
  sendIFrameMessage({
    key: 'recordingInProgress',
    value: true
  })
}

export const stopRecording = () => {
  if (isListening) {
    recognition.stop();
    isListening = false;
  }
  sendIFrameMessage({
    key: 'recordingInProgress',
    value: false
  })
}