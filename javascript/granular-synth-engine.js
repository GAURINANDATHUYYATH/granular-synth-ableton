(function(){
  "use strict";

  /* ============================================================
     KNOB WIDGET
     ============================================================ */
  function createKnob(root, opts){
    var min = opts.min, max = opts.max, def = opts.def, curve = opts.curve || 1;
    var formatFn = opts.formatFn, onInput = opts.onInput;
    var knobEl = root.querySelector(".knob");
    var valueEl = root.querySelector(".knob-value");
    var value = def;

    function fracFromValue(v){
      var t = Math.min(1, Math.max(0, (v - min) / (max - min)));
      return Math.pow(t, 1 / curve);
    }
    function valueFromFrac(f){ return min + (max - min) * Math.pow(f, curve); }
    function render(){
      var frac = fracFromValue(value);
      knobEl.style.setProperty("--frac", frac.toFixed(4));
      valueEl.textContent = formatFn ? formatFn(value) : value.toFixed(0);
    }
    function setValue(v, silent){
      value = Math.min(max, Math.max(min, v));
      render();
      if(!silent && onInput) onInput(value);
    }

    var dragging = false, startY = 0, startFrac = 0;
    knobEl.addEventListener("pointerdown", function(e){
      dragging = true; startY = e.clientY; startFrac = fracFromValue(value);
      knobEl.setPointerCapture(e.pointerId);
      knobEl.classList.add("active");
    });
    knobEl.addEventListener("pointermove", function(e){
      if(!dragging) return;
      var sensitivity = e.shiftKey ? 600 : 150;
      var f = startFrac + (startY - e.clientY) / sensitivity;
      f = Math.min(1, Math.max(0, f));
      setValue(valueFromFrac(f));
    });
    function endDrag(){ if(dragging){ dragging = false; knobEl.classList.remove("active"); } }
    knobEl.addEventListener("pointerup", endDrag);
    knobEl.addEventListener("pointercancel", endDrag);
    knobEl.addEventListener("dblclick", function(){ setValue(def); });
    knobEl.addEventListener("wheel", function(e){
      e.preventDefault();
      var f = fracFromValue(value) - e.deltaY / 1000;
      setValue(valueFromFrac(Math.min(1, Math.max(0, f))));
    }, { passive:false });
    knobEl.addEventListener("keydown", function(e){
      var step = 0.02;
      var f = fracFromValue(value);
      if(e.key === "ArrowUp" || e.key === "ArrowRight"){ setValue(valueFromFrac(Math.min(1, f+step))); e.preventDefault(); }
      else if(e.key === "ArrowDown" || e.key === "ArrowLeft"){ setValue(valueFromFrac(Math.max(0, f-step))); e.preventDefault(); }
      else if(e.key === "Home"){ setValue(min); e.preventDefault(); }
      else if(e.key === "End"){ setValue(max); e.preventDefault(); }
    });

    render();
    return { setValue: setValue, getValue: function(){ return value; } };
  }

  /* ============================================================
     PARAMETER KNOBS
     ============================================================ */
  var knobs = {
    position: createKnob(document.getElementById("knob-position").parentElement, {
      min:0, max:1, def:0.4, curve:1, formatFn:function(v){ return Math.round(v*100) + "%"; }
    }),
    scan: createKnob(document.getElementById("knob-scan").parentElement, {
      min:-1, max:1, def:0, curve:1, formatFn:function(v){ return v.toFixed(2) + " Hz"; }
    }),
    size: createKnob(document.getElementById("knob-size").parentElement, {
      min:5, max:500, def:60, curve:2, formatFn:function(v){ return Math.round(v) + " ms"; }
    }),
    density: createKnob(document.getElementById("knob-density").parentElement, {
      min:1, max:100, def:12, curve:2, formatFn:function(v){ return Math.round(v) + "/s"; }
    }),
    pitch: createKnob(document.getElementById("knob-pitch").parentElement, {
      min:-24, max:24, def:0, curve:1, formatFn:function(v){ return (v>0?"+":"") + Math.round(v) + " st"; }
    }),
    jitter: createKnob(document.getElementById("knob-jitter").parentElement, {
      min:0, max:100, def:15, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    spray: createKnob(document.getElementById("knob-spray").parentElement, {
      min:0, max:100, def:10, curve:1, formatFn:function(v){ return Math.round(v) + " ms"; }
    }),
    pan: createKnob(document.getElementById("knob-pan").parentElement, {
      min:0, max:100, def:40, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    reverb: createKnob(document.getElementById("knob-reverb").parentElement, {
      min:0, max:100, def:20, curve:1, formatFn:function(v){ return Math.round(v) + "%"; },
      onInput:function(v){ if(reverbSend) reverbSend.gain.value = v/100; }
    }),
    delay: createKnob(document.getElementById("knob-delay").parentElement, {
      min:0, max:100, def:0, curve:1, formatFn:function(v){ return Math.round(v) + "%"; },
      onInput:function(v){ if(delaySend) delaySend.gain.value = v/100; }
    }),
    delayTime: createKnob(document.getElementById("knob-delaytime").parentElement, {
      min:10, max:1000, def:250, curve:2, formatFn:function(v){ return Math.round(v) + " ms"; },
      onInput:function(v){ if(delayNode && audioCtx) delayNode.delayTime.setTargetAtTime(v/1000, audioCtx.currentTime, 0.02); }
    }),
    feedback: createKnob(document.getElementById("knob-feedback").parentElement, {
      min:0, max:90, def:35, curve:1, formatFn:function(v){ return Math.round(v) + "%"; },
      onInput:function(v){ if(delayFeedback) delayFeedback.gain.value = Math.min(0.92, v/100); }
    }),
    spike: createKnob(document.getElementById("knob-spike").parentElement, {
      min:0, max:100, def:0, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    reverse: createKnob(document.getElementById("knob-reverse").parentElement, {
      min:0, max:100, def:0, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    fmRate: createKnob(document.getElementById("knob-fmrate").parentElement, {
      min:0, max:2000, def:0, curve:3, formatFn:function(v){ return v<10 ? v.toFixed(1)+" Hz" : Math.round(v) + " Hz"; }
    }),
    fmDepth: createKnob(document.getElementById("knob-fmdepth").parentElement, {
      min:0, max:24, def:0, curve:1, formatFn:function(v){ return Math.round(v) + " st"; }
    }),
    fluxMute: createKnob(document.getElementById("knob-fluxmute").parentElement, {
      min:0, max:100, def:0, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    fluxLevel: createKnob(document.getElementById("knob-fluxlevel").parentElement, {
      min:0, max:100, def:0, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    filter1Cutoff: createKnob(document.getElementById("knob-filter1cutoff").parentElement, {
      min:80, max:20000, def:20000, curve:3, formatFn:function(v){ return Math.round(v) + " Hz"; },
      onInput:function(v){ if(filter1) filter1.frequency.setTargetAtTime(v, audioCtx.currentTime, 0.01); }
    }),
    filter1Res: createKnob(document.getElementById("knob-filter1res").parentElement, {
      min:0.1, max:20, def:0.7, curve:2, formatFn:function(v){ return v.toFixed(1); },
      onInput:function(v){ if(filter1) filter1.Q.setTargetAtTime(v, audioCtx.currentTime, 0.01); }
    }),
    filter2Cutoff: createKnob(document.getElementById("knob-filter2cutoff").parentElement, {
      min:80, max:20000, def:20000, curve:3, formatFn:function(v){ return Math.round(v) + " Hz"; },
      onInput:function(v){ if(filter2) filter2.frequency.setTargetAtTime(v, audioCtx.currentTime, 0.01); }
    }),
    filter2Res: createKnob(document.getElementById("knob-filter2res").parentElement, {
      min:0.1, max:20, def:0.7, curve:2, formatFn:function(v){ return v.toFixed(1); },
      onInput:function(v){ if(filter2) filter2.Q.setTargetAtTime(v, audioCtx.currentTime, 0.01); }
    }),
    attack: createKnob(document.getElementById("knob-attack").parentElement, {
      min:1, max:2000, def:10, curve:2, formatFn:function(v){ return Math.round(v) + " ms"; }
    }),
    decay: createKnob(document.getElementById("knob-decay").parentElement, {
      min:1, max:2000, def:150, curve:2, formatFn:function(v){ return Math.round(v) + " ms"; }
    }),
    sustain: createKnob(document.getElementById("knob-sustain").parentElement, {
      min:0, max:100, def:100, curve:1, formatFn:function(v){ return Math.round(v) + "%"; }
    }),
    release: createKnob(document.getElementById("knob-release").parentElement, {
      min:1, max:3000, def:300, curve:2, formatFn:function(v){ return Math.round(v) + " ms"; }
    })
  };

  var windowShape = "hann";
  document.getElementById("window-select").addEventListener("change", function(e){
    windowShape = e.target.value;
  });

  var filter1Type = "lowpass";
  document.getElementById("filter1-type").addEventListener("change", function(e){
    filter1Type = e.target.value;
    if(filter1) filter1.type = filter1Type;
  });
  var filter2Type = "lowpass";
  document.getElementById("filter2-type").addEventListener("change", function(e){
    filter2Type = e.target.value;
    if(filter2) filter2.type = filter2Type;
  });

  /* ============================================================
     ENVELOPE CURVES
     ============================================================ */
  // spike (0..1) sharpens rise/fall curves and, for the "noise" shape,
  // controls how much per-sample random amplitude is mixed into the
  // window — mirroring Henke's Shape/Spike pair on the real Granulator.
  function makeCurve(shape, n, spike){
    n = n || 64;
    spike = spike || 0;
    var arr = new Float32Array(n);
    for(var i=0; i<n; i++){
      var x = i/(n-1);
      if(shape === "hann"){
        arr[i] = 0.5 * (1 - Math.cos(2*Math.PI*x));
      } else if(shape === "tri"){
        arr[i] = x < 0.5 ? x*2 : (1-x)*2;
      } else if(shape === "rise"){
        // exponential attack ramp, sharp cutoff at the end — spike steepens the ramp
        var exp1 = 1 + spike*7;
        var v1 = Math.pow(x, exp1);
        arr[i] = x > 0.94 ? v1 * (1-x)/0.06 : v1;
      } else if(shape === "fall"){
        // exponential decay from the start — spike steepens the decay
        var exp2 = 1 + spike*7;
        var v2 = Math.pow(1-x, exp2);
        arr[i] = x < 0.06 ? v2 * x/0.06 : v2;
      } else if(shape === "noise"){
        // "broken" shape: a smooth window multiplied by per-sample noise,
        // amount of noise controlled by spike
        var base = 0.5 * (1 - Math.cos(2*Math.PI*x));
        arr[i] = base * (1 - spike + spike*Math.random());
      } else {
        // rect
        var fade = 0.04;
        if(x < fade) arr[i] = x/fade;
        else if(x > 1-fade) arr[i] = (1-x)/fade;
        else arr[i] = 1;
      }
    }
    arr[0] = Math.max(arr[0], 0.0001);
    arr[n-1] = Math.max(arr[n-1], 0.0001);
    return arr;
  }

  function makeImpulseResponse(ctx, duration, decay){
    duration = duration || 3.0; decay = decay || 3.2;
    var rate = ctx.sampleRate;
    var length = Math.floor(rate * duration);
    var impulse = ctx.createBuffer(2, length, rate);
    for(var ch=0; ch<2; ch++){
      var data = impulse.getChannelData(ch);
      for(var i=0; i<length; i++){
        data[i] = (Math.random()*2-1) * Math.pow(1 - i/length, decay);
      }
    }
    return impulse;
  }

  /* ============================================================
     AUDIO ENGINE + SOURCES
     ============================================================ */
  var audioCtx = null;
  var masterGain = null;   // dry bus — reverb/delay sends + final output tap off this
  var outputGain = null;   // final output, driven by OUT slider
  var reverbSend = null, convolver = null;
  var delaySend = null, delayNode = null, delayFeedback = null;
  var grainBus = null;     // all grains connect here first
  var filter1 = null, filter2 = null; // two multimode filters in series, in front of the envelope
  var envGain = null;      // transport-level ADSR gain (attack/decay/sustain on PLAY, release on STOP)

  var sources = [];        // {id, name, buffer, enabled}
  var sourceCounter = 0;
  var viewedId = null;
  var playing = false;
  var grainTimer = null;
  var activeGrains = [];
  var scanPhase = 0;    // drives the linear-ramp and sine-oscillator scan modes
  var scanMode = "linear"; // "linear" | "sine" | "wander" — how the SCAN knob drives position
  var wanderValue = knobs.position.getValue();  // wander mode's current eased position
  var wanderTarget = wanderValue;               // wander mode's current random target
  var wanderTimer = 0;                          // seconds until wander mode picks a new target
  var scanHistory = [];          // recent {t, p} samples of the scanned position, for the mini indicator
  var SCAN_HISTORY_WINDOW = 4000; // how many ms of trail the indicator shows

  document.getElementById("scanmode-seg").addEventListener("click", function(e){
    var btn = e.target.closest(".seg-btn");
    if(!btn) return;
    var all = document.querySelectorAll("#scanmode-seg .seg-btn");
    for(var i=0;i<all.length;i++) all[i].classList.remove("active");
    btn.classList.add("active");
    scanMode = btn.dataset.mode;
    // reset per-mode state so switching modes never causes a jarring jump
    scanPhase = 0;
    wanderValue = knobs.position.getValue();
    wanderTarget = wanderValue;
    wanderTimer = 0;
    scanHistory.length = 0;
  });

  function ensureContext(){
    if(audioCtx) return audioCtx;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;

    outputGain = audioCtx.createGain();
    outputGain.gain.value = document.getElementById("master-volume").value/100;
    outputGain.connect(audioCtx.destination);
    masterGain.connect(outputGain);

    grainBus = audioCtx.createGain();
    grainBus.gain.value = 1;
    filter1 = audioCtx.createBiquadFilter();
    filter1.type = filter1Type;
    filter1.frequency.value = knobs.filter1Cutoff.getValue();
    filter1.Q.value = knobs.filter1Res.getValue();
    filter2 = audioCtx.createBiquadFilter();
    filter2.type = filter2Type;
    filter2.frequency.value = knobs.filter2Cutoff.getValue();
    filter2.Q.value = knobs.filter2Res.getValue();
    envGain = audioCtx.createGain();
    envGain.gain.value = 0; // silent until the first PLAY triggers the attack
    grainBus.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(envGain);
    envGain.connect(masterGain);

    reverbSend = audioCtx.createGain();
    reverbSend.gain.value = knobs.reverb.getValue()/100;
    convolver = audioCtx.createConvolver();
    convolver.buffer = makeImpulseResponse(audioCtx);
    masterGain.connect(reverbSend);
    reverbSend.connect(convolver);
    convolver.connect(outputGain);

    delaySend = audioCtx.createGain();
    delaySend.gain.value = knobs.delay.getValue()/100;
    delayNode = audioCtx.createDelay(1.0);
    delayNode.delayTime.value = knobs.delayTime.getValue()/1000;
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = Math.min(0.92, knobs.feedback.getValue()/100);
    masterGain.connect(delaySend);
    delaySend.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(outputGain);

    return audioCtx;
  }

  document.getElementById("master-volume").addEventListener("input", function(e){
    if(outputGain) outputGain.gain.value = e.target.value/100;
  });

  // Builds a reversed copy of a [offset, offset+dur] slice of buffer, for
  // the REVERSE feature — Web Audio doesn't support playing buffers
  // backwards natively, so we manually flip the samples for that one grain.
  function buildReversedSlice(buffer, offsetSec, durSec){
    var sr = buffer.sampleRate;
    var frameCount = Math.max(1, Math.round(durSec * sr));
    var startFrame = Math.round(offsetSec * sr);
    var revBuf = audioCtx.createBuffer(buffer.numberOfChannels, frameCount, sr);
    for(var c=0; c<buffer.numberOfChannels; c++){
      var src = buffer.getChannelData(c);
      var dst = revBuf.getChannelData(c);
      for(var i=0; i<frameCount; i++){
        var srcIdx = startFrame + (frameCount - 1 - i);
        dst[i] = (srcIdx >= 0 && srcIdx < src.length) ? src[srcIdx] : 0;
      }
    }
    return revBuf;
  }

  function triggerGrain(){
    var pool = sources.filter(function(s){ return s.enabled; });
    if(!pool.length) return;

    // Fluxus mute: randomly drop this grain entirely
    var muteChance = knobs.fluxMute.getValue();
    if(muteChance > 0 && Math.random()*100 < muteChance) return;

    var chosen = pool[Math.floor(Math.random()*pool.length)];
    var buffer = chosen.buffer;

    var now = audioCtx.currentTime + 0.0008;
    var outDur = knobs.size.getValue()/1000;

    // Base pitch, plus an FM oscillator sampled at grain onset — a cheap
    // stand-in for Henke's audio-rate FM oscillator: at low FM rate it
    // wobbles the pitch grain-to-grain, at high rate it scrambles it into
    // metallic, inharmonic territory.
    var rate = Math.pow(2, knobs.pitch.getValue()/12);
    var fmRate = knobs.fmRate.getValue();
    var fmDepth = knobs.fmDepth.getValue();
    if(fmDepth > 0 && fmRate > 0){
      var fmSt = fmDepth * Math.sin(2*Math.PI*fmRate*audioCtx.currentTime);
      rate *= Math.pow(2, fmSt/12);
    }

    var readDur = outDur * rate;
    if(readDur > buffer.duration) readDur = buffer.duration;

    var jitterAmt = knobs.jitter.getValue()/100;
    var posFrac = knobs.position.getValue() + (Math.random()*2-1) * jitterAmt * 0.5;
    posFrac = Math.min(1, Math.max(0, posFrac));
    var offset = posFrac * buffer.duration;
    offset = Math.min(offset, Math.max(0, buffer.duration - readDur));

    var sprayDelay = Math.random() * knobs.spray.getValue()/1000;
    var startTime = now + sprayDelay;

    var reversed = Math.random()*100 < knobs.reverse.getValue();
    var src = audioCtx.createBufferSource();
    if(reversed){
      src.buffer = buildReversedSlice(buffer, offset, readDur);
      src.playbackRate.value = rate;
    } else {
      src.buffer = buffer;
      src.playbackRate.value = rate;
    }

    // Fluxus level: random per-grain amplitude variation, scaled into the window curve
    var fluxAmt = knobs.fluxLevel.getValue()/100;
    var fluxLevel = fluxAmt > 0 ? (1 - Math.random()*fluxAmt) : 1;
    var curve = makeCurve(windowShape, 64, knobs.spike.getValue()/100);
    if(fluxLevel !== 1){
      var scaled = new Float32Array(curve.length);
      for(var ci=0; ci<curve.length; ci++) scaled[ci] = curve[ci] * fluxLevel;
      curve = scaled;
    }

    var gain = audioCtx.createGain();
    gain.gain.setValueCurveAtTime(curve, startTime, outDur);

    var node = gain;
    if(audioCtx.createStereoPanner){
      var panner = audioCtx.createStereoPanner();
      var panSpread = knobs.pan.getValue()/100;
      panner.pan.value = (Math.random()*2-1) * panSpread;
      gain.connect(panner);
      panner.connect(grainBus);
      node = panner;
    } else {
      gain.connect(grainBus);
    }
    src.connect(gain);

    src.start(startTime, reversed ? 0 : offset, reversed ? src.buffer.duration : readDur);
    src.stop(startTime + outDur + 0.03);
    src.onended = function(){
      try{ src.disconnect(); gain.disconnect(); if(node!==gain) node.disconnect(); }catch(e){}
    };

    var overlay = document.getElementById("overlay-canvas");
    var h = overlay.clientHeight || 1;
    var data = buffer.getChannelData(0);
    var idx = Math.min(data.length-1, Math.floor(posFrac * data.length));
    var sample = data[idx] || 0;
    var y = (1 - (sample+1)/2) * h;
    activeGrains.push({ x: posFrac, y: y, born: performance.now(), life: outDur*1000 + 260 });
  }

  function scheduleLoop(){
    if(!playing) return;
    triggerGrain();
    var interval = 1000 / knobs.density.getValue();
    grainTimer = setTimeout(scheduleLoop, interval);
  }

  var playBtn = document.getElementById("play-btn");
  function startPlayback(){
    if(!sources.some(function(s){ return s.enabled; })) return;
    audioCtx.resume();
    playing = true;
    scheduleLoop();
    playBtn.textContent = "\u25a0 STOP";
    playBtn.classList.add("playing");

    // ADSR: ramp up through attack, then settle at the sustain level
    var t = audioCtx.currentTime;
    var a = knobs.attack.getValue()/1000;
    var d = knobs.decay.getValue()/1000;
    var s = knobs.sustain.getValue()/100;
    envGain.gain.cancelScheduledValues(t);
    envGain.gain.setValueAtTime(envGain.gain.value, t);
    envGain.gain.linearRampToValueAtTime(1, t + a);
    envGain.gain.linearRampToValueAtTime(s, t + a + d);
  }
  function stopPlayback(){
    playing = false;
    clearTimeout(grainTimer);
    playBtn.textContent = "\u25b6 PLAY";
    playBtn.classList.remove("playing");

    // ADSR: ease out over the release time instead of cutting instantly
    if(envGain && audioCtx){
      var t2 = audioCtx.currentTime;
      var r = knobs.release.getValue()/1000;
      envGain.gain.cancelScheduledValues(t2);
      envGain.gain.setValueAtTime(envGain.gain.value, t2);
      envGain.gain.linearRampToValueAtTime(0, t2 + r);
    }
  }
  playBtn.addEventListener("click", function(){
    if(!playing) startPlayback(); else stopPlayback();
  });

  function updatePlayEnabled(){
    var anyEnabled = sources.some(function(s){ return s.enabled; });
    playBtn.disabled = !anyEnabled;
    if(!anyEnabled && playing) stopPlayback();
  }

  /* ---------------- source list management ---------------- */
  var stage = document.getElementById("stage");
  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("file-input");
  var waveCanvas = document.getElementById("wave-canvas");
  var overlayCanvas = document.getElementById("overlay-canvas");
  var fileNameEl = document.getElementById("file-name");
  var statusEl = document.getElementById("status");
  var chipsEl = document.getElementById("chips");

  function updateStageVisibility(){
    var has = sources.length > 0;
    dropzone.style.display = has ? "none" : "flex";
    waveCanvas.style.display = has ? "block" : "none";
    overlayCanvas.style.display = has ? "block" : "none";
    fileNameEl.textContent = has ? (sources.length + " source" + (sources.length>1?"s":"") + " loaded") : "no sources loaded";
  }

  function renderSourcesBar(){
    chipsEl.innerHTML = "";
    sources.forEach(function(s){
      var chip = document.createElement("div");
      chip.className = "chip" + (s.enabled ? " enabled" : "") + (s.id===viewedId ? " viewed" : "");
      chip.dataset.id = s.id;

      var name = document.createElement("span");
      name.className = "chip-name";
      name.textContent = s.name;

      var dur = document.createElement("span");
      dur.className = "chip-dur";
      dur.textContent = s.buffer.duration.toFixed(1) + "s";

      var del = document.createElement("button");
      del.className = "chip-del";
      del.type = "button";
      del.title = "Remove";
      del.textContent = "\u00d7";
      del.addEventListener("click", function(e){ e.stopPropagation(); removeSource(s.id); });

      chip.appendChild(name);
      chip.appendChild(dur);
      chip.appendChild(del);
      chip.addEventListener("click", function(){ toggleEnabled(s.id); });
      chipsEl.appendChild(chip);
    });
  }

  function addSource(name, buffer){
    sourceCounter++;
    var id = "src" + sourceCounter;
    sources.push({ id: id, name: name, buffer: buffer, enabled: true });
    viewedId = id;
    renderSourcesBar();
    updateStageVisibility();
    requestAnimationFrame(drawWaveform);
    updatePlayEnabled();
    statusEl.textContent = buffer.duration.toFixed(2) + "s \u00b7 " + buffer.sampleRate + "Hz \u00b7 " + buffer.numberOfChannels + "ch \u2014 " + name;
    if(!rafRunning){ rafRunning = true; requestAnimationFrame(visualLoop); }
  }

  function removeSource(id){
    var idx = sources.findIndex(function(s){ return s.id === id; });
    if(idx < 0) return;
    sources.splice(idx, 1);
    if(viewedId === id){
      viewedId = sources.length ? sources[sources.length-1].id : null;
    }
    renderSourcesBar();
    updateStageVisibility();
    if(viewedId) drawWaveform();
    updatePlayEnabled();
  }

  function toggleEnabled(id){
    var s = sources.find(function(s){ return s.id === id; });
    if(!s) return;
    s.enabled = !s.enabled;
    if(s.enabled) viewedId = id;
    renderSourcesBar();
    if(viewedId === id) drawWaveform();
    updatePlayEnabled();
  }

  async function loadFile(file){
    statusEl.textContent = "decoding \u2026";
    try{
      ensureContext();
      var arrayBuf = await file.arrayBuffer();
      var decoded = await audioCtx.decodeAudioData(arrayBuf);
      addSource(file.name, decoded);
    }catch(err){
      console.error(err);
      statusEl.textContent = "couldn't decode " + file.name;
    }
  }

  fileInput.addEventListener("change", function(e){
    var files = Array.from(e.target.files || []);
    files.forEach(function(f){ loadFile(f); });
    fileInput.value = "";
  });
  stage.addEventListener("dragover", function(e){ e.preventDefault(); stage.classList.add("drag-over"); });
  stage.addEventListener("dragleave", function(){ stage.classList.remove("drag-over"); });
  stage.addEventListener("drop", function(e){
    e.preventDefault();
    stage.classList.remove("drag-over");
    var files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    files.forEach(function(f){ loadFile(f); });
  });

  /* ---------------- live recording ---------------- */
  var recordBtn = document.getElementById("record-btn");
  var mediaRecorder = null, recordChunks = [], recordStream = null, recordTimerId = null, recordStartTs = 0, recordCounter = 0;

  recordBtn.addEventListener("click", async function(){
    if(mediaRecorder && mediaRecorder.state === "recording"){
      mediaRecorder.stop();
      return;
    }
    try{
      ensureContext();
      recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunks = [];
      mediaRecorder = new MediaRecorder(recordStream);
      mediaRecorder.ondataavailable = function(e){ if(e.data && e.data.size > 0) recordChunks.push(e.data); };
      mediaRecorder.onstop = async function(){
        clearInterval(recordTimerId);
        recordBtn.textContent = "\u25cf REC";
        recordBtn.classList.remove("recording");
        recordStream.getTracks().forEach(function(t){ t.stop(); });
        if(recordChunks.length){
          try{
            var blob = new Blob(recordChunks, { type: mediaRecorder.mimeType || "audio/webm" });
            var arrBuf = await blob.arrayBuffer();
            var decoded = await audioCtx.decodeAudioData(arrBuf);
            recordCounter++;
            addSource("Live take " + recordCounter, decoded);
          }catch(err){
            console.error(err);
            statusEl.textContent = "couldn't decode the recording";
          }
        }
      };
      mediaRecorder.start();
      recordStartTs = performance.now();
      recordBtn.classList.add("recording");
      recordTimerId = setInterval(function(){
        var secs = Math.floor((performance.now() - recordStartTs) / 1000);
        var m = Math.floor(secs / 60), s2 = secs % 60;
        recordBtn.textContent = "\u25a0 " + m + ":" + String(s2).padStart(2, "0");
      }, 250);
    }catch(err){
      console.error(err);
      statusEl.textContent = "microphone access denied";
    }
  });

  /* ============================================================
     VISUALIZATION
     ============================================================ */
  function sizeCanvas(canvas){
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return { ctx: ctx, w: w, h: h };
  }

  function drawWaveform(){
    var s = sources.find(function(s){ return s.id === viewedId; });
    if(!s) return;
    var buffer = s.buffer;
    var dims = sizeCanvas(waveCanvas);
    var ctx = dims.ctx, w = dims.w, h = dims.h;
    var data = buffer.getChannelData(0);
    var step = Math.max(1, Math.ceil(data.length/w));
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = "#4a4854";
    ctx.beginPath();
    for(var x=0; x<w; x++){
      var min=1, max=-1;
      var start = x*step;
      for(var j=0; j<step; j++){
        var idx = start+j;
        if(idx >= data.length) break;
        var v = data[idx];
        if(v < min) min = v;
        if(v > max) max = v;
      }
      var y1 = (1-(max+1)/2)*h;
      var y2 = (1-(min+1)/2)*h;
      ctx.moveTo(x+0.5, y1);
      ctx.lineTo(x+0.5, y2);
    }
    ctx.stroke();
  }

  var rafRunning = false;
  var lastTs = null;

  function roundRectPath(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }

  // Small "SCAN" indicator: a strip chart of the scanned position over the
  // last few seconds, with a moving dot at the current value — makes the
  // shape of whichever scan mode is active (linear ramp / sine ease /
  // random wander) visible at a glance instead of just the single line.
  function drawScanIndicator(ctx, w, h, nowMs){
    if(!scanHistory.length) return;
    var panelW = 128, panelH = 44, pad = 10;
    var px0 = w - panelW - pad, py0 = pad;
    var cutoff = nowMs - SCAN_HISTORY_WINDOW;
    var innerPad = 7;

    roundRectPath(ctx, px0, py0, panelW, panelH, 7);
    ctx.fillStyle = "rgba(29,27,34,0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(50,47,58,0.9)";
    ctx.lineWidth = 1;
    ctx.stroke();

    function toXY(pt){
      var xn = (pt.t - cutoff) / SCAN_HISTORY_WINDOW;
      return [
        px0 + innerPad + xn * (panelW - innerPad*2),
        py0 + innerPad + (1 - pt.p) * (panelH - innerPad*2)
      ];
    }

    ctx.beginPath();
    for(var i=0; i<scanHistory.length; i++){
      var xy = toXY(scanHistory[i]);
      if(i === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
    }
    ctx.strokeStyle = "rgba(232,163,61,0.85)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    var lastXY = toXY(scanHistory[scanHistory.length-1]);
    ctx.beginPath();
    ctx.fillStyle = "#e8a33d";
    ctx.arc(lastXY[0], lastXY[1], 2.6, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(236,232,222,0.5)";
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(scanMode.toUpperCase(), px0 + innerPad, py0 + panelH - 5);
  }

  function visualLoop(ts){
    if(lastTs === null) lastTs = ts;
    var dt = (ts - lastTs)/1000;
    lastTs = ts;

    var scanSpeed = knobs.scan.getValue();
    if(scanSpeed !== 0){
      if(scanMode === "linear"){
        // Linear scan: position ramps at a constant rate and wraps back to
        // the start (or end, for negative speed) with a hard cut — the
        // classic granular "sawtooth" scan.
        scanPhase += scanSpeed*dt;
        var pLin = scanPhase - Math.floor(scanPhase);
        knobs.position.setValue(pLin, true);
      } else if(scanMode === "sine"){
        // Non-linear (sinusoidal) scan: position eases back and forth across
        // the buffer instead of ramping linearly and jump-cutting at the loop
        // point. Velocity is fastest through the middle and eases to zero at
        // each end, so there's never a hard discontinuity in read position.
        scanPhase += scanSpeed*dt;
        var pSine = (Math.sin(scanPhase*Math.PI*2)+1)/2;
        knobs.position.setValue(pSine, true);
      } else if(scanMode === "wander"){
        // Non-linear random wander: position drifts toward freshly-chosen
        // random targets instead of following any fixed curve, giving an
        // organic, unpredictable read path. SCAN speed (direction ignored)
        // controls how often a new target is picked and how quickly the
        // position eases toward it.
        var speedAbs = Math.abs(scanSpeed);
        wanderTimer -= dt;
        if(wanderTimer <= 0){
          wanderTarget = Math.random();
          wanderTimer = (0.12 + Math.random()*0.35) / Math.max(0.08, speedAbs);
        }
        var smoothing = 1 - Math.exp(-dt * (1.5 + speedAbs*6));
        wanderValue += (wanderTarget - wanderValue) * smoothing;
        knobs.position.setValue(wanderValue, true);
      }
      scanHistory.push({ t: ts, p: knobs.position.getValue() });
      var cutoffTs = ts - SCAN_HISTORY_WINDOW;
      while(scanHistory.length && scanHistory[0].t < cutoffTs) scanHistory.shift();
    } else if(scanHistory.length){
      scanHistory.length = 0;
    }

    var dims = sizeCanvas(overlayCanvas);
    var ctx = dims.ctx, w = dims.w, h = dims.h;
    ctx.clearRect(0,0,w,h);

    var px = knobs.position.getValue() * w;
    ctx.strokeStyle = "rgba(232,163,61,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();

    var now = performance.now();
    for(var i = activeGrains.length-1; i >= 0; i--){
      var g = activeGrains[i];
      var age = now - g.born;
      if(age > g.life){ activeGrains.splice(i,1); continue; }
      var t = age / g.life;
      var alpha = 1 - t;
      var radius = 2 + 4*(1-t);
      ctx.beginPath();
      ctx.fillStyle = "rgba(95,184,176," + (alpha*0.85).toFixed(2) + ")";
      ctx.arc(g.x*w, g.y, radius, 0, Math.PI*2);
      ctx.fill();
    }

    drawScanIndicator(ctx, w, h, ts);

    requestAnimationFrame(visualLoop);
  }

  window.addEventListener("resize", function(){ if(viewedId) drawWaveform(); });

  updateStageVisibility();
})();
