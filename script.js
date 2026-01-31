document.addEventListener("DOMContentLoaded", function (event) {

    // 1. init audio context
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // adding global gain
    const globalGain = audioCtx.createGain();
    globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    globalGain.connect(audioCtx.destination);

    // 2. map keys to frequencies (from assignment)
    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096, //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910, //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398, //G - F#
        '66': 391.995435981749294,  //B - G
        '72': 415.304697579945138, //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916, //J - A#
        '77': 493.883301256124111,  //M - B
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192, //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821, //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797, //5 - F#
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277, //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832, //7 - A#
        '85': 987.766602512248223,  //U - B
    };

    // 3. keep track of active oscillators to stop them later
    const activeOscillators = {};

    // adding the "extra step" - convert hex color (#ff0000) to RGB number
    // this is the helper function
    function hexToRgb(hex) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    // 4. play a note (updating for ADSR/polyphony)
    function playNote(key) {
        if (audioCtx.state === 'suspended') audioCtx.resume(); // added for ADSR/polyphony

        const osc = audioCtx.createOscillator();
        const freq = keyboardFrequencyMap[key]; // get frequency for converter
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        // adding to line up with dropdown choice
        const waveType = document.getElementById('waveform').value;
        osc.type = waveType;

        // added ADSR gain node
        const noteGain = audioCtx.createGain();
        osc.connect(noteGain).connect(globalGain);

        // added envelope
        noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
        // ramp to .2 rather than 1 (clipping stopped)
        noteGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);

        // EXTRA STEP - USER PICKED GRADIENT COLOR

        // 1. get colors
        const startHex = document.getElementById('startColor').value;
        const endHex = document.getElementById('endColor').value;
        const startRGB = hexToRgb(startHex);
        const endRGB = hexToRgb(endHex);

        // 2. calculate where note is in range.
            // low -> 261.63 (C) to high -> 987.77 (B)
        const minFreq = 261.625565300598634;
        const maxFreq = 987.766602512248223;
        let ratio = (freq - minFreq) / (maxFreq - minFreq);

        // make ratio between 0 and 1 for safety
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;

        // 3. mix colors based on ratio
        const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * ratio);
        const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * ratio);
        const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * ratio);

        // 4. apply background color to page
        document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        // 5. make text black for bright colors and white for dark
        const brightness = Math.round(((parseInt(r) * 299) + (parseInt(g) * 587) + (parseInt(b) * 114)) / 1000);
        document.body.style.color = (brightness > 125) ? 'black' : 'white';

        osc.start();

        // adding store both osc and gain
        activeOscillators[key] = { osc: osc, gain: noteGain };
    }

    // 5. handle key down
    function keyDown(event) {
        // get the key code
        const key = (event.detail || event.which).toString();

        // play only if mapped
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            playNote(key);
        }
    }

    // 6. handle key up
    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        const note = activeOscillators[key];

        // stop osc if exists AND adding release envelope
        if (keyboardFrequencyMap[key] && note) {
            const now = audioCtx.currentTime;
            const releaseTime = 0.2;
            // release envelope
            note.gain.gain.cancelScheduledValues(now); // cancel unfinished attack ramps
            note.gain.gain.setValueAtTime(note.gain.gain.value, now); // lock current val, stops popping(?)
            note.gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime); // fade exponentially to near-0
            note.osc.stop(now + releaseTime + 0.05); // stop osc after fade is done

            delete activeOscillators[key];
        }
    }

    // 7. event listeners
    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);
});