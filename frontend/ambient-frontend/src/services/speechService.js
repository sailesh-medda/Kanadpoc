import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Replace with your Azure Speech resource details
const subscriptionKey = "YOUR_SPEECH_KEY";
const serviceRegion = "uaenorth"; // from your resource

// Speech-to-text (microphone input)
export async function recognizeSpeech() {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(result => {
      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        resolve(result.text);
      } else {
        reject(result.errorDetails);
      }
      recognizer.close();
    });
  });
}

// Text-to-speech (output audio)
export async function synthesizeSpeech(text) {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

    const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(
      text,
      result => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve("Speech synthesis completed.");
        } else {
          reject(result.errorDetails);
        }
        synthesizer.close();
      },
      error => {
        reject(error);
        synthesizer.close();
      }
    );
  });
}
