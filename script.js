```javascript
const recordings = {
    1: {
        recorder: null,
        stream: null,
        context: null,
        analyser: null,
        microphone: null,
        animation: null,
        startTime: null,
        timer: null,
        recording: false
    },

    2: {
        recorder: null,
        stream: null,
        context: null,
        analyser: null,
        microphone: null,
        animation: null,
        startTime: null,
        timer: null,
        recording: false
    }
};


/* =========================
   BUTTONS
========================= */

document.getElementById("button1").addEventListener("click", function () {
    toggleRecording(1);
});

document.getElementById("button2").addEventListener("click", function () {
    toggleRecording(2);
});


/* =========================
   START / STOP
========================= */

async function toggleRecording(id) {

    const data = recordings[id];

    if (data.recording) {
        stopRecording(id);
    } else {
        await startRecording(id);
    }
}


/* =========================
   START RECORDING
========================= */

async function startRecording(id) {

    const data = recordings[id];

    const message =
        document.getElementById(`message${id}`);

    message.textContent = "";


    // Check microphone support
    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        message.textContent =
            "Your browser does not support microphone recording.";

        return;
    }


    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        data.stream = stream;


        /*
            Audio visualizer
        */

        data.context =
            new (window.AudioContext ||
                 window.webkitAudioContext)();


        data.analyser =
            data.context.createAnalyser();


        data.analyser.fftSize = 256;


        data.microphone =
            data.context.createMediaStreamSource(
                stream
            );


        data.microphone.connect(
            data.analyser
        );


        /*
            Recorder
        */

        let options = {};

        if (MediaRecorder.isTypeSupported("audio/webm")) {
            options.mimeType = "audio/webm";
        }


        data.recorder =
            new MediaRecorder(
                stream,
                options
            );


        data.recorder.ondataavailable =
            function (event) {

                if (event.data.size > 0) {
                    // Audio data is received here.
                    // We don't need to save it.
                }

            };


        data.recorder.onerror =
            function () {

                message.textContent =
                    "Something went wrong while recording.";

                resetRecording(id);

            };


        data.recorder.start();


        data.recording = true;

        data.startTime = Date.now();


        changeButton(
            id,
            true
        );


        data.timer =
            setInterval(
                function () {
                    updateTimer(id);
                },
                100
            );


        drawWave(id);


    } catch (error) {

        console.error(error);


        if (error.name === "NotAllowedError") {

            message.textContent =
                "Please allow microphone access in your browser.";

        } else if (error.name === "NotFoundError") {

            message.textContent =
                "No microphone was found.";

        } else {

            message.textContent =
                "I couldn't access the microphone. Please try again.";

        }

    }
}


/* =========================
   STOP RECORDING
========================= */

function stopRecording(id) {

    const data = recordings[id];

    if (!data.recording) {
        return;
    }


    const duration =
        (Date.now() - data.startTime) / 1000;


    data.recording = false;


    if (data.recorder &&
        data.recorder.state !== "inactive") {

        data.recorder.stop();

    }


    if (data.stream) {

        data.stream
            .getTracks()
            .forEach(function (track) {
                track.stop();
            });

    }


    if (data.context) {

        data.context.close();

    }


    clearInterval(data.timer);


    cancelAnimationFrame(
        data.animation
    );


    changeButton(
        id,
        false
    );


    /*
        FIRST RECORDING
        Minimum 30 seconds
    */

    if (id === 1) {

        if (duration < 30) {

            document.getElementById(
                "message1"
            ).textContent =
                "The audio should be at least 30 seconds long. Say something more.";

            return;
        }

    }


    /*
        SECOND RECORDING
        No minimum
    */

    showResult(id);
}


/* =========================
   RESET
========================= */

function resetRecording(id) {

    const data = recordings[id];

    data.recording = false;


    if (data.stream) {

        data.stream
            .getTracks()
            .forEach(function (track) {
                track.stop();
            });

    }


    clearInterval(data.timer);

    cancelAnimationFrame(
        data.animation
    );


    changeButton(
        id,
        false
    );
}


/* =========================
   BUTTON TEXT
========================= */

function changeButton(id, recording) {

    const button =
        document.getElementById(
            `button${id}`
        );


    const text =
        document.getElementById(
            `buttonText${id}`
        );


    if (recording) {

        button.classList.add(
            "recording"
        );

        text.textContent =
            "Stop recording";

    } else {

        button.classList.remove(
            "recording"
        );

        text.textContent =
            "Start recording";
    }
}


/* =========================
   TIMER
========================= */

function updateTimer(id) {

    const data =
        recordings[id];


    if (!data.recording) {
        return;
    }


    const elapsed =
        Math.floor(
            (Date.now() - data.startTime) / 1000
        );


    const minutes =
        Math.floor(elapsed / 60);


    const seconds =
        elapsed % 60;


    document.getElementById(
        `timer${id}`
    ).textContent =

        String(minutes).padStart(2, "0")
        +
        ":"
        +
        String(seconds).padStart(2, "0");
}


/* =========================
   AUDIO WAVE
========================= */

function drawWave(id) {

    const data =
        recordings[id];


    if (!data.recording) {
        return;
    }


    const canvas =
        document.getElementById(
            `wave${id}`
        );


    const ctx =
        canvas.getContext("2d");


    const width =
        canvas.clientWidth;


    const height =
        canvas.clientHeight;


    /*
        Set canvas resolution
    */

    const pixelRatio =
        window.devicePixelRatio || 1;


    canvas.width =
        width * pixelRatio;


    canvas.height =
        height * pixelRatio;


    ctx.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
        Get microphone data
    */

    const bufferLength =
        data.analyser.frequencyBinCount;


    const dataArray =
        new Uint8Array(
            bufferLength
        );


    data.analyser.getByteTimeDomainData(
        dataArray
    );


    /*
        Draw wave
    */

    ctx.beginPath();


    for (
        let x = 0;
        x < width;
        x++
    ) {

        const index =
            Math.floor(
                x / width * bufferLength
            );


        const value =
            dataArray[index] / 128;


        const y =
            height / 2
            +
            (value - 1) * 45;


        if (x === 0) {

            ctx.moveTo(x, y);

        } else {

            ctx.lineTo(x, y);

        }
    }


    ctx.lineWidth = 3;

    ctx.strokeStyle =
        "rgba(255,255,255,0.9)";


    ctx.shadowBlur = 12;

    ctx.shadowColor =
        "rgba(255,255,255,0.5)";


    ctx.stroke();


    data.animation =
        requestAnimationFrame(
            function () {
                drawWave(id);
            }
        );
}


/* =========================
   SHOW PHOTO
========================= */

function showResult(id) {

    const result =
        document.getElementById(
            `result${id}`
        );


    const message =
        document.getElementById(
            `message${id}`
        );


    message.textContent = "";


    result.style.display =
        "block";


    setTimeout(function () {

        result.classList.add(
            "show"
        );

    }, 50);
}
```