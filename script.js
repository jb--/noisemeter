const startRecordingButton = document.getElementById("startRecording");
const stopRecordingButton = document.getElementById("stopRecording");
const loudnessDisplay = document.getElementById("loudness");
let thresholdValue = 30;
let lastAlert = Date.now();
let audio;
let isStarted = false;


const noSleep = new NoSleep();


let startRec = async () => {
  noSleep.enable();
  startRecordingButton.disabled = true;
  stopRecordingButton.disabled = false;
  isStarted = true;

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  audio = new Audio('success_sound.mp3');


  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
    mediaStreamSource.connect(analyser);

    updateLoudness();
  } catch (error) {
    console.error("Error accessing the microphone:", error);
    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;
  }
};

// Data array to store loudness values
const loudnessData = new Array(200).fill(NaN);

let initialLoudnessAnimation = () => {
  let initialThreshold = 30;
  if (isStarted) {
    return;
  }
  let time = Date.now() / 1000;
  for (let i = 0; i < loudnessData.length; i++) {
    loudnessData[i] =  0.45 * initialThreshold * Math.sin(i / 10 + 3 * time) + initialThreshold * 0.5;
  }
  let currentThresholdArray = new Array(200).fill(thresholdValue);

  let update = {
    y: [loudnessData, loudnessData, currentThresholdArray]
  };
  Plotly.update("loudnessChart", update);
  if (!isStarted) {
    requestAnimationFrame(initialLoudnessAnimation);
  }
};
requestAnimationFrame(initialLoudnessAnimation);

const thresholdArray = new Array(200).fill(thresholdValue);
let data = [{
  'x': Array.from(Array(loudnessData.length).keys()),
  'y': loudnessData,
  'mode': 'lines',
  'line': {
    width: 15,
    color: "#f36d5e",
    shape: 'spline'
  }
},
{
  'x': Array.from(Array(loudnessData.length).keys()),
  'y': loudnessData,
  'mode': 'lines',
  'line': {
    width: 10,
    color: "#a23457",
    shape: 'spline'
  }
},
{
  'x': Array.from(Array(thresholdArray.length).keys()),
  'y': thresholdArray,
  'mode': 'lines',
  'name': 'threshold',
  'line': {
    width: 3,
    color: "#4e6fb0",
    shape: 'spline'
  }
}
];
let layout = {
  "height": 300,
  "margin": {
    l: 0,
    r: 0,
    t: 0,
    b: 0
  },
  "hovermode": false,
  "xaxis": { "visible": false, "title": "", "ticks": "", "showline": false, "showticklabels": false, "showgrid": false },
  "yaxis": { "visible": false, "title": "", "ticks": "", "showline": false, "showticklabels": false, "showgrid": false },
  "showlegend": false,
  "plot_bgcolor": "rgb(0,0,0,0)",
  "paper_bgcolor": "rgb(0,0,0,0)"
};


let p = Plotly.newPlot("loudnessChart", data, layout, { displayModeBar: false, responsive: true, staticPlot: true });

// put the current timestamp here
let dontAddBefore = Date.now();

let audioContext;
let mediaStream;
let mediaStreamSource;
let analyser;

startRecordingButton.addEventListener("click", startRec);

stopRecordingButton.addEventListener("click", () => {
  stopRecording();
});

function stopRecording() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  startRecordingButton.disabled = false;
  stopRecordingButton.disabled = true;
  noSleep.disable();
}

function updateLoudness() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  // Define the A-weighting filter coefficients
  const aWeightingCoefficients = [
    -39.4, -26.2, -16.1, -8.6, -3.2, 0, 1.2, 1, -1.1, -1.8, -2.5, -2.9, -3, -2.8, -2.5, -2, -1.4, -0.6, 0.1, 0.6, 1
  ];

  // Apply the A-weighting filter to the dataArray values
  const aWeightedDataArray = dataArray.map((value, index) => value * Math.pow(10, aWeightingCoefficients[index] / 20));

  // Calculate the sum of the A-weighted dataArray values
  const aWeightedSum = aWeightedDataArray.reduce((sum, value) => sum + value, 0);

  // Calculate the A-weighted average loudness
  const loudness = aWeightedSum / bufferLength * 10;

  if (loudness > thresholdValue) {
    console.log("loudness alert", loudness);
    if (Date.now() > lastAlert + 3000) {
      // play the success_sound.mp3 file
      audio.play();
      lastAlert = Date.now();
    }
  }
  loudnessDisplay.textContent =` (${loudness.toFixed(2)} / ${thresholdValue})`;
  // if now is larger than dontAddBefore, add the loudness to the array
  if (Date.now() > dontAddBefore) {
    dontAddBefore = Date.now() + 20;

    loudnessData.push(loudness);
    loudnessData.shift();
    let currentThresholdArray = new Array(200).fill(thresholdValue);

    let update = {
      y: [loudnessData, loudnessData, currentThresholdArray]
    };
    Plotly.update("loudnessChart", update);
  }

  if (!stopRecordingButton.disabled) {
    requestAnimationFrame(updateLoudness);
  }
}

let thresholdInput = document.getElementById("sensitivity");
thresholdInput.setAttribute("value", thresholdValue);
thresholdInput.addEventListener("change", (e) => {
  thresholdValue = thresholdInput.value;
  thresholdInput.placeHolder = thresholdValue;
});
thresholdInput.addEventListener("input", (e) => {
  thresholdValue = thresholdInput.value;
  thresholdInput.placeHolder = thresholdValue;
});