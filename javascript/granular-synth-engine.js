(function(){
  "use strict";

  /* ============================================================
     KNOB WIDGET
     ============================================================ */
  function createKnob(root, opts){
    var min = opts.min, max = opts.max, def = opts.def, curve = opts.curve || 1;
    var formatFn = opts.formatFn, onInput = opts.onInput;
    var extraListeners = [];
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
      for(var i=0; i<extraListeners.length; i++) extraListeners[i](value, silent);
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
    return {
      setValue: setValue,
      getValue: function(){ return value; },
      addListener: function(fn){ extraListeners.push(fn); }
    };
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
  var activeLayer = "A";
  var uiMode = "patch";
  var suppressLayerSync = false;
  var NUM_LAYERS = 6;
  var layerNames = ["A", "B", "C", "D", "E", "F"];
  var layers = {};
  var mixerSidebar = document.getElementById("mixer-sidebar");
  var LOOP_MAX_SECONDS = 45;
  var LOOP_FADE_MS = 24;

  layerNames.forEach(function(layerName){
    layers[layerName] = null;
  });

  function layerLabel(layerName){
    return "Layer " + layerName;
  }

  function setUiMode(mode){
    uiMode = mode === "perform" ? "perform" : "patch";
    document.body.classList.toggle("perform-mode", uiMode === "perform");

    var buttons = document.querySelectorAll("[data-ui-mode]");
    for(var i=0; i<buttons.length; i++){
      var btn = buttons[i];
      var active = btn.dataset.uiMode === uiMode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }

    renderMixerSidebar();
  }

  function getLayerProfile(layerName){
    var profiles = {
      A: { size: 60, density: 12, jitter: 15 },
      B: { size: 64, density: 15, jitter: 17 },
      C: { size: 58, density: 18, jitter: 19 },
      D: { size: 70, density: 20, jitter: 23 },
      E: { size: 66, density: 22, jitter: 25 },
      F: { size: 76, density: 24, jitter: 28 }
    };
    return profiles[layerName] || { size: 60, density: 12, jitter: 15 };
  }

  function applyLayerOutputLevel(layer, targetGain){
    if(!layer || !layer.outputGain || !audioCtx) return;
    var t = audioCtx.currentTime;
    layer.outputGain.gain.cancelScheduledValues(t);
    layer.outputGain.gain.setValueAtTime(layer.outputGain.gain.value, t);
    layer.outputGain.gain.linearRampToValueAtTime(targetGain, t + 0.03);
  }

  function setActiveLayer(layerName){
    if(!layers[layerName]) return;
    activeLayer = layerName;
    renderMixerSidebar();
    syncKnobsFromActiveLayer();
  }

  function layerParamsFromKnobs(){
    var params = {};
    Object.keys(knobs).forEach(function(name){
      params[name] = knobs[name].getValue();
    });
    params.windowShape = windowShape;
    return params;
  }

  function syncKnobsFromActiveLayer(){
    var layer = layers[activeLayer];
    if(!layer) return;
    suppressLayerSync = true;
    Object.keys(knobs).forEach(function(name){
      knobs[name].setValue(layer.params[name], true);
    });
    document.getElementById("window-select").value = layer.params.windowShape || "hann";
    suppressLayerSync = false;
  }

  function syncLayerSources(){
    layerNames.forEach(function(name, index){
      var layer = layers[name];
      if(!layer) return;
      if(layer.looper && layer.looper.useLoopSource && layer.loopSource){
        layer.params.source = layer.loopSource;
        return;
      }
      if(layer.sourceIsManual){
        if(layer.params.source && !sources.some(function(s){ return s.id === layer.params.source.id; })){ 
          layer.params.source = null;
        }
        return;
      }
      layer.baseSource = sources[index] || null;
      layer.params.source = layer.baseSource;
    });
  }

  function buildCrossfadedLoopBuffer(buffer, fadeMs){
    if(!buffer || buffer.length < 2 || !audioCtx) return buffer;
    var fadeFrames = Math.max(1, Math.min(Math.floor(((fadeMs || LOOP_FADE_MS)/1000) * buffer.sampleRate), Math.floor(buffer.length / 6)));
    var out = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for(var c=0; c<buffer.numberOfChannels; c++){
      var src = buffer.getChannelData(c);
      var dst = out.getChannelData(c);
      for(var i=0; i<src.length; i++) dst[i] = src[i];
      var endStart = Math.max(0, src.length - fadeFrames);
      for(var i=0; i<fadeFrames; i++){
        var x = (i / Math.max(1, fadeFrames - 1));
        var gainA = Math.sqrt(1 - x);
        var gainB = Math.sqrt(x);
        var srcIdx = endStart + i;
        dst[i] = src[i] * gainA + src[srcIdx] * gainB;
        dst[srcIdx] = src[srcIdx] * gainA + src[i] * gainB;
      }
    }
    return out;
  }

  function sliceAudioBuffer(buffer, startSec, endSec){
    if(!buffer || !audioCtx) return null;
    var sr = buffer.sampleRate;
    var startFrame = Math.max(0, Math.min(buffer.length, Math.floor(startSec * sr)));
    var endFrame = Math.max(startFrame + 1, Math.min(buffer.length, Math.floor(endSec * sr)));
    var frameCount = Math.max(1, endFrame - startFrame);
    var out = audioCtx.createBuffer(buffer.numberOfChannels, frameCount, sr);
    for(var c=0; c<buffer.numberOfChannels; c++){
      var src = buffer.getChannelData(c);
      var dst = out.getChannelData(c);
      for(var i=0; i<frameCount; i++){
        dst[i] = src[startFrame + i] || 0;
      }
    }
    return out;
  }

  function mixAudioBuffers(baseBuffer, overdubBuffer){
    if(!baseBuffer || !overdubBuffer || !audioCtx) return baseBuffer || overdubBuffer;
    var len = Math.max(baseBuffer.length, overdubBuffer.length);
    var out = audioCtx.createBuffer(baseBuffer.numberOfChannels, len, baseBuffer.sampleRate);
    for(var c=0; c<baseBuffer.numberOfChannels; c++){
      var base = baseBuffer.getChannelData(c);
      var over = overdubBuffer.getChannelData(c);
      var dst = out.getChannelData(c);
      for(var i=0; i<len; i++){
        var a = base[i] || 0;
        var b = over[i] || 0;
        var mixed = (a * 0.75) + (b * 0.75);
        dst[i] = Math.max(-1, Math.min(1, mixed));
      }
    }
    return out;
  }

  function ensureLayerLooper(layerName){
    var layer = layers[layerName];
    if(!layer) return null;
    if(!layer.looper){
      layer.looper = {
        sourceMode: "mic",
        armed: false,
        recording: false,
        overdub: false,
        useLoopSource: false,
        expanded: false,
        loopBuffer: null,
        recordedBuffer: null,
        loopSource: null,
        loopStart: 0,
        loopEnd: 0,
        trimStart: 0,
        trimEnd: 1,
        processor: null,
        zeroGain: null,
        accumL: [],
        accumR: [],
        recordedFrames: 0,
        recordStartTs: 0
      };
      layer.baseSource = layer.params.source || null;
    }
    return layer.looper;
  }

  function applyLayerLoopSourceState(layer){
    if(!layer) return;
    var looper = layer.looper;
    if(!looper) return;
    if(looper.useLoopSource && looper.loopBuffer){
      layer.loopSource = layer.loopSource || {
        id: "loop-" + (layer.name || layerLabel(layer.name || "A")),
        name: (layer.name || layerLabel(layer.name || "A")) + " loop",
        buffer: looper.loopBuffer,
        enabled: true,
        muted: false,
        isLoop: true
      };
      layer.loopSource.buffer = looper.loopBuffer;
      layer.loopSource.name = (layer.name || layerLabel(layer.name || "A")) + " loop";
      layer.params.source = layer.loopSource;
      return;
    }
    layer.params.source = layer.baseSource || null;
  }

  function stopLayerLooper(layerName, autoCapReached){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    if(!looper || !looper.recording) return;

    if(looper.processor){
      looper.processor.disconnect();
      looper.processor.onaudioprocess = null;
      looper.processor = null;
    }
    if(looper.zeroGain){
      looper.zeroGain.disconnect();
      looper.zeroGain = null;
    }

    looper.recording = false;
    looper.armed = false;

    if(looper.recordedFrames > 0){
      var buffer = audioCtx.createBuffer(2, looper.recordedFrames, audioCtx.sampleRate);
      var left = buffer.getChannelData(0);
      var right = buffer.getChannelData(1);
      for(var i=0; i<looper.recordedFrames; i++){
        left[i] = looper.accumL[i] || 0;
        right[i] = looper.accumR[i] || 0;
      }

      looper.recordedBuffer = buffer;
      looper.trimStart = 0;
      looper.trimEnd = 1;
      looper.loopStart = 0;
      looper.loopEnd = buffer.duration;

      var trimmed = sliceAudioBuffer(buffer, looper.loopStart, looper.loopEnd);
      looper.loopBuffer = buildCrossfadedLoopBuffer(trimmed, LOOP_FADE_MS);
      looper.loopSource = {
        id: "loop-" + layerName,
        name: (layer.name || layerLabel(layerName)) + " loop",
        buffer: looper.loopBuffer,
        enabled: true,
        muted: false,
        isLoop: true
      };

      if(looper.overdub && layer.baseSource && layer.baseSource.buffer){
        var mixed = mixAudioBuffers(layer.baseSource.buffer, looper.loopBuffer);
        looper.loopBuffer = buildCrossfadedLoopBuffer(mixed, LOOP_FADE_MS);
        looper.loopSource.buffer = looper.loopBuffer;
      }

      if(looper.overdub && layer.loopSource && layer.loopSource.buffer){
        looper.loopSource.buffer = looper.loopBuffer;
      }

      if(looper.useLoopSource){
        layer.params.source = looper.loopSource;
      } else {
        layer.params.source = layer.baseSource || null;
      }

      statusEl.textContent = autoCapReached
        ? "recorded loop capped at 45s — loop saved"
        : "loop recorded and ready to use";
    } else {
      statusEl.textContent = "nothing recorded";
    }

    if(looper.sourceMode === "mic" && micEnabled){
      looper.recording = false;
    }

    looper.accumL = [];
    looper.accumR = [];
    looper.recordedFrames = 0;
    renderMixerSidebar();
  }

  function drawLoopTrimWaveform(layer, canvas){
    if(!canvas) return;
    var looper = layer && layer.looper;
    if(!looper || !looper.recordedBuffer){
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    var dims = sizeCanvas(canvas);
    var ctx = dims.ctx;
    var w = dims.w;
    var h = dims.h;
    var data = looper.recordedBuffer.getChannelData(0);
    var step = Math.max(1, Math.ceil(data.length / w));

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1d1b22";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#4a4854";
    ctx.beginPath();
    for(var x=0; x<w; x++){
      var min=1, max=-1;
      var start = x*step;
      for(var j=0; j<step; j++){
        var idx = start + j;
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

    var startX = looper.trimStart * w;
    var endX = looper.trimEnd * w;
    ctx.fillStyle = "rgba(95,184,176,0.18)";
    ctx.fillRect(startX, 0, Math.max(1, endX - startX), h);
    ctx.strokeStyle = "#5fb8b0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, h);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, h);
    ctx.stroke();
  }

  function updateLayerLoopTrim(layerName, canvas, clientX){
    var layer = layers[layerName];
    if(!layer || !layer.looper || !layer.looper.recordedBuffer) return;
    var rect = canvas.getBoundingClientRect();
    var px = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    var dims = sizeCanvas(canvas);
    var norm = Math.min(1, Math.max(0, px / Math.max(1, dims.w)));
    var looper = layer.looper;
    var currentStart = looper.trimStart;
    var currentEnd = looper.trimEnd;
    var nextStart = currentStart;
    var nextEnd = currentEnd;

    if(Math.abs(norm - currentStart) < Math.abs(norm - currentEnd)){
      nextStart = Math.min(Math.max(norm, 0), Math.max(0, currentEnd - 0.05));
    } else {
      nextEnd = Math.max(Math.min(norm, 1), Math.min(1, currentStart + 0.05));
    }

    looper.trimStart = Math.min(nextStart, nextEnd - 0.05);
    looper.trimEnd = Math.max(nextEnd, looper.trimStart + 0.05);
    looper.loopStart = looper.trimStart * looper.recordedBuffer.duration;
    looper.loopEnd = looper.trimEnd * looper.recordedBuffer.duration;

    var trimmed = sliceAudioBuffer(looper.recordedBuffer, looper.loopStart, looper.loopEnd);
    looper.loopBuffer = buildCrossfadedLoopBuffer(trimmed, LOOP_FADE_MS);
    looper.loopSource = {
      id: "loop-" + layerName,
      name: (layer.name || layerLabel(layerName)) + " loop",
      buffer: looper.loopBuffer,
      enabled: true,
      muted: false,
      isLoop: true
    };
    applyLayerLoopSourceState(layer);
    drawLoopTrimWaveform(layer, canvas);
  }

  function startLayerLooper(layerName){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    if(!looper) return;

    if(looper.recording) return;
    if(looper.sourceMode === "mic" && !micEnabled){
      statusEl.textContent = "Enable LIVE MIC first";
      return;
    }

    ensureContext();
    looper.recording = true;
    looper.armed = true;
    looper.recordedFrames = 0;
    looper.accumL = [];
    looper.accumR = [];
    looper.processor = audioCtx.createScriptProcessor(4096, 2, 2);
    looper.zeroGain = audioCtx.createGain();
    looper.zeroGain.gain.value = 0;

    looper.processor.onaudioprocess = function(e){
      var inL = e.inputBuffer.getChannelData(0);
      var inR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inL;
      var maxFrames = Math.floor(LOOP_MAX_SECONDS * audioCtx.sampleRate);
      var available = maxFrames - looper.recordedFrames;
      var frameCount = Math.min(inL.length, available);
      for(var i=0; i<frameCount; i++){
        looper.accumL.push(inL[i]);
        looper.accumR.push(inR[i]);
      }
      looper.recordedFrames += frameCount;
      if(looper.recordedFrames >= maxFrames){
        stopLayerLooper(layerName, true);
      }
    };

    if(looper.sourceMode === "mic"){
      micSource.connect(looper.processor);
    } else {
      layer.outputGain.connect(looper.processor);
    }

    looper.processor.connect(looper.zeroGain);
    looper.zeroGain.connect(audioCtx.destination);

    looper.recordStartTs = performance.now();
    renderMixerSidebar();
  }

  function toggleLayerLooperSourceMode(layerName){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    looper.sourceMode = looper.sourceMode === "mic" ? "layer" : "mic";
    renderMixerSidebar();
  }

  function toggleLayerLoopUse(layerName){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    looper.useLoopSource = !looper.useLoopSource;
    applyLayerLoopSourceState(layer);
    renderMixerSidebar();
  }

  function clearLayerLoop(layerName){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    looper.loopBuffer = null;
    looper.recordedBuffer = null;
    looper.loopSource = null;
    looper.useLoopSource = false;
    looper.overdub = false;
    looper.recordedFrames = 0;
    looper.accumL = [];
    looper.accumR = [];
    layer.params.source = layer.baseSource || null;
    statusEl.textContent = "loop cleared for " + (layer.name || layerLabel(layerName));
    renderMixerSidebar();
  }

  function toggleLayerOverdub(layerName){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    looper.overdub = !looper.overdub;
    renderMixerSidebar();
  }

  function setLayerLooperExpanded(layerName, expanded){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    looper.expanded = expanded;
    renderMixerSidebar();
  }

  function setLayerLooperFromInput(layerName){
    var layer = layers[layerName];
    if(!layer) return;
    var looper = ensureLayerLooper(layerName);
    if(looper && looper.recordedBuffer){
      looper.useLoopSource = !looper.useLoopSource;
      applyLayerLoopSourceState(layer);
    }
  }

  function buildLayerLooperHTML(layerName, layer){
    var looper = ensureLayerLooper(layerName);
    var wrap = document.createElement("div");
    wrap.className = "mixer-looper" + (looper.expanded ? " expanded" : "");

    var top = document.createElement("div");
    top.className = "mixer-looper-top";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mixer-looper-toggle";
    toggle.textContent = looper.expanded ? "LOOPER ▾" : "LOOPER ▸";
    toggle.addEventListener("click", function(e){
      e.stopPropagation();
      setLayerLooperExpanded(layerName, !looper.expanded);
    });

    var sourceBtn = document.createElement("button");
    sourceBtn.type = "button";
    sourceBtn.className = "mixer-looper-btn" + (looper.sourceMode === "mic" ? " active" : "");
    sourceBtn.textContent = looper.sourceMode === "mic" ? "REC FROM MIC" : "REC FROM LAYER";
    sourceBtn.addEventListener("click", function(e){
      e.stopPropagation();
      toggleLayerLooperSourceMode(layerName);
    });

    var armBtn = document.createElement("button");
    armBtn.type = "button";
    armBtn.className = "mixer-looper-btn" + (looper.recording ? " recording" : "");
    armBtn.textContent = looper.recording ? "STOP" : "ARM";
    armBtn.addEventListener("click", function(e){
      e.stopPropagation();
      if(looper.recording){
        stopLayerLooper(layerName, false);
      } else {
        startLayerLooper(layerName);
      }
    });

    var overdubBtn = document.createElement("button");
    overdubBtn.type = "button";
    overdubBtn.className = "mixer-looper-btn" + (looper.overdub ? " active" : "");
    overdubBtn.textContent = looper.overdub ? "OVERDUB ON" : "OVERDUB";
    overdubBtn.addEventListener("click", function(e){
      e.stopPropagation();
      toggleLayerOverdub(layerName);
    });

    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "mixer-looper-btn";
    clearBtn.textContent = "CLEAR";
    clearBtn.addEventListener("click", function(e){
      e.stopPropagation();
      clearLayerLoop(layerName);
    });

    var useLoopBtn = document.createElement("button");
    useLoopBtn.type = "button";
    useLoopBtn.className = "mixer-looper-btn" + (looper.useLoopSource ? " active" : "");
    useLoopBtn.textContent = looper.useLoopSource ? "USE LOOP ON" : "USE LOOP OFF";
    useLoopBtn.addEventListener("click", function(e){
      e.stopPropagation();
      toggleLayerLoopUse(layerName);
    });

    top.appendChild(toggle);
    top.appendChild(sourceBtn);
    top.appendChild(armBtn);
    top.appendChild(overdubBtn);
    top.appendChild(clearBtn);
    top.appendChild(useLoopBtn);

    var waveWrap = document.createElement("div");
    waveWrap.className = "mixer-looper-wave-wrap";

    var wave = document.createElement("canvas");
    wave.className = "mixer-looper-wave";
    wave.dataset.layer = layerName;
    wave.addEventListener("pointerdown", function(e){
      if(!looper.recordedBuffer) return;
      var dims = sizeCanvas(wave);
      var rect = wave.getBoundingClientRect();
      var px = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      var norm = Math.min(1, Math.max(0, px / Math.max(1, dims.w)));
      wave._dragMode = Math.abs(norm - looper.trimStart) < Math.abs(norm - looper.trimEnd) ? "start" : "end";
      wave._dragLayer = layerName;
      wave.setPointerCapture(e.pointerId);
    });
    wave.addEventListener("pointermove", function(e){
      if(!wave._dragLayer || wave._dragLayer !== layerName) return;
      updateLayerLoopTrim(layerName, wave, e.clientX);
    });
    wave.addEventListener("pointerup", function(){
      wave._dragLayer = null;
      wave._dragMode = null;
    });
    wave.addEventListener("pointerleave", function(){
      wave._dragLayer = null;
      wave._dragMode = null;
    });

    waveWrap.appendChild(wave);
    wrap.appendChild(top);
    wrap.appendChild(waveWrap);
    return wrap;
  }

  function renderMixerSidebar(){
    if(!mixerSidebar) return;
    mixerSidebar.innerHTML = "";

    if(uiMode === "perform"){
      renderPerformModeMixerSidebar();
      return;
    }

    renderPatchModeMixerSidebar();
  }

  function renderPatchModeMixerSidebar(){
    var modeWrap = document.createElement("div");
    modeWrap.className = "mixer-mode-strip";

    var modeSeg = document.createElement("div");
    modeSeg.className = "seg mixer-mode-seg";

    ["patch", "perform"].forEach(function(mode){
      var modeBtn = document.createElement("button");
      modeBtn.type = "button";
      modeBtn.className = "seg-btn" + (mode === uiMode ? " active" : "");
      modeBtn.dataset.uiMode = mode;
      modeBtn.textContent = mode.toUpperCase();
      modeBtn.addEventListener("click", function(){
        setUiMode(mode);
      });
      modeSeg.appendChild(modeBtn);
    });

    modeWrap.appendChild(modeSeg);
    mixerSidebar.appendChild(modeWrap);

    var tabStrip = document.createElement("div");
    tabStrip.className = "mixer-layer-tab-strip";

    layerNames.forEach(function(name){
      var layer = layers[name];
      if(!layer) return;

      var looper = ensureLayerLooper(name);
      var tab = document.createElement("div");
      tab.className = "mixer-layer-tab" + (name === activeLayer ? " active" : "");
      tab.dataset.layer = name;
      tab.setAttribute("role", "button");
      tab.setAttribute("tabindex", "0");

      var info = document.createElement("div");
      info.className = "mixer-layer-tab-info";

      var label = document.createElement("div");
      label.className = "mixer-layer-name";
      label.textContent = layer.name || layerLabel(name);

      var sourceWrap = document.createElement("div");
      sourceWrap.className = "mixer-layer-source-wrap";

      var sourceText = document.createElement("span");
      sourceText.className = "mixer-layer-source";
      var sourceRef = layer.params.source;
      sourceText.textContent = sourceRef ? (sourceRef.name || sourceRef.id || "Source") : "— empty —";

      var sourceSelect = document.createElement("select");
      sourceSelect.className = "mixer-layer-source-select";
      sourceSelect.setAttribute("aria-label", "Assign source for " + layerLabel(name));

      var emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "—";
      sourceSelect.appendChild(emptyOpt);

      sources.forEach(function(source){
        var opt = document.createElement("option");
        opt.value = source.id;
        opt.textContent = source.name;
        sourceSelect.appendChild(opt);
      });
      sourceSelect.value = sourceRef ? sourceRef.id : "";
      sourceSelect.addEventListener("change", function(e){
        e.stopPropagation();
        var selectedId = sourceSelect.value;
        layer.sourceIsManual = true;
        layer.params.source = selectedId ? sources.find(function(source){ return source.id === selectedId; }) || null : null;
        renderMixerSidebar();
      });

      sourceWrap.appendChild(sourceText);
      sourceWrap.appendChild(sourceSelect);

      info.appendChild(label);
      info.appendChild(sourceWrap);

      var actions = document.createElement("div");
      actions.className = "mixer-layer-actions";

      var looperBtn = document.createElement("button");
      looperBtn.type = "button";
      looperBtn.className = "mixer-layer-looper-trigger";
      looperBtn.textContent = looper.expanded ? "LOOP ▾" : "LOOP ▸";
      looperBtn.addEventListener("click", function(e){
        e.stopPropagation();
        setLayerLooperExpanded(name, !looper.expanded);
        renderMixerSidebar();
      });

      var muteBtn = document.createElement("button");
      muteBtn.type = "button";
      muteBtn.className = "mixer-layer-mute" + (layer.muted ? " muted" : "");
      muteBtn.textContent = layer.muted ? "UNMUTE" : "MUTE";
      muteBtn.addEventListener("click", function(e){
        e.stopPropagation();
        layer.setMuted(!layer.muted);
        renderMixerSidebar();
      });

      actions.appendChild(looperBtn);
      actions.appendChild(muteBtn);

      tab.appendChild(info);
      tab.appendChild(actions);

      tab.addEventListener("click", function(e){
        if(e.target.closest(".mixer-layer-source-select, .mixer-layer-mute, .mixer-layer-looper-trigger")) return;
        setActiveLayer(name);
      });

      tab.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          setActiveLayer(name);
        }
      });

      tabStrip.appendChild(tab);
    });

    mixerSidebar.appendChild(tabStrip);

    var panelWrap = document.createElement("div");
    panelWrap.className = "mixer-layer-looper-panels";

    layerNames.forEach(function(name){
      var layer = layers[name];
      if(!layer) return;
      var looper = ensureLayerLooper(name);
      if(!looper.expanded) return;

      var panel = buildLayerLooperHTML(name, layer);
      panel.classList.add("mixer-layer-looper-panel");
      panelWrap.appendChild(panel);

      var wave = panel.querySelector(".mixer-looper-wave");
      if(wave){
        requestAnimationFrame(function(){
          if(panel.isConnected){
            drawLoopTrimWaveform(layer, wave);
          }
        });
      }
    });

    if(panelWrap.children.length){
      mixerSidebar.appendChild(panelWrap);
    }
  }

  function renderPerformModeMixerSidebar(){
    var modeWrap = document.createElement("div");
    modeWrap.className = "mixer-mode-strip";

    var modeSeg = document.createElement("div");
    modeSeg.className = "seg mixer-mode-seg";

    ["patch", "perform"].forEach(function(mode){
      var modeBtn = document.createElement("button");
      modeBtn.type = "button";
      modeBtn.className = "seg-btn" + (mode === uiMode ? " active" : "");
      modeBtn.dataset.uiMode = mode;
      modeBtn.textContent = mode.toUpperCase();
      modeBtn.addEventListener("click", function(){
        setUiMode(mode);
      });
      modeSeg.appendChild(modeBtn);
    });

    modeWrap.appendChild(modeSeg);
    mixerSidebar.appendChild(modeWrap);

    layerNames.forEach(function(name){
      var layer = layers[name];
      if(!layer) return;

      var strip = document.createElement("div");
      strip.className = "mixer-strip" + (name === activeLayer ? " active" : "");
      strip.dataset.layer = name;

      var topRow = document.createElement("div");
      topRow.className = "mixer-strip-top";

      var label = document.createElement("input");
      label.type = "text";
      label.className = "mixer-label";
      label.value = layer.name || layerLabel(name);
      label.addEventListener("input", function(){
        layer.name = label.value || layerLabel(name);
      });

      var muteBtn = document.createElement("button");
      muteBtn.type = "button";
      muteBtn.className = "mixer-mute" + (layer.muted ? " muted" : "");
      muteBtn.textContent = layer.muted ? "Muted" : "Mute";
      muteBtn.addEventListener("click", function(e){
        e.stopPropagation();
        layer.setMuted(!layer.muted);
        renderMixerSidebar();
      });

      topRow.appendChild(label);
      topRow.appendChild(muteBtn);

      var faderWrap = document.createElement("div");
      faderWrap.className = "mixer-fader-wrap";

      var faderLabel = document.createElement("div");
      faderLabel.className = "mixer-fader-label";
      faderLabel.textContent = "VOL";

      var fader = document.createElement("input");
      fader.type = "range";
      fader.className = "mixer-fader";
      fader.min = "0";
      fader.max = "1";
      fader.step = "0.01";
      fader.value = String(layer.volume);
      fader.style.writingMode = "vertical-lr";
      fader.style.direction = "rtl";
      fader.style.height = "100px";
      fader.addEventListener("input", function(){
        layer.setVolume(parseFloat(fader.value));
      });

      faderWrap.appendChild(faderLabel);
      faderWrap.appendChild(fader);

      var sourceSelect = document.createElement("select");
      sourceSelect.className = "mixer-source-select";
      var emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "— empty —";
      sourceSelect.appendChild(emptyOpt);
      sources.forEach(function(source){
        var opt = document.createElement("option");
        opt.value = source.id;
        opt.textContent = source.name;
        sourceSelect.appendChild(opt);
      });
      sourceSelect.value = layer.params.source ? layer.params.source.id : "";
      sourceSelect.addEventListener("change", function(){
        var selectedId = sourceSelect.value;
        layer.sourceIsManual = true;
        layer.params.source = selectedId ? sources.find(function(source){ return source.id === selectedId; }) || null : null;
      });

      var intensityWrap = document.createElement("div");
      intensityWrap.className = "mixer-intensity-wrap";

      var intensityLabel = document.createElement("div");
      intensityLabel.className = "mixer-intensity-label";
      intensityLabel.textContent = "INTENSITY";

      var intensity = document.createElement("input");
      intensity.type = "range";
      intensity.className = "mixer-intensity";
      intensity.min = "0";
      intensity.max = "1";
      intensity.step = "0.01";
      intensity.value = String(layer.intensity || 0);
      intensity.addEventListener("input", function(e){
        e.stopPropagation();
        applyLayerIntensity(name, parseFloat(intensity.value));
      });

      intensityWrap.appendChild(intensityLabel);
      intensityWrap.appendChild(intensity);

      strip.appendChild(topRow);
      strip.appendChild(faderWrap);
      strip.appendChild(sourceSelect);
      strip.appendChild(intensityWrap);
      strip.appendChild(buildLayerLooperHTML(name, layer));

      strip.addEventListener("click", function(e){
        if(e.target.closest(".mixer-fader, .mixer-mute, .mixer-intensity, .mixer-source-select, .mixer-label")) return;
        setActiveLayer(name);
      });

      mixerSidebar.appendChild(strip);

      var looperWave = strip.querySelector(".mixer-looper-wave");
      if(looperWave) {
        requestAnimationFrame(function(){
          if(strip.isConnected){
            drawLoopTrimWaveform(layer, strip.querySelector(".mixer-looper-wave"));
          }
        });
      }
    });
  }

  function applyLayerIntensity(layerName, intensityValue){
    var layer = layers[layerName];
    if(!layer) return;

    var clamped = Math.min(1, Math.max(0, intensityValue));
    layer.intensity = clamped;

    function lerp(a, b, t){ return a + (b - a) * t; }

    layer.params.density = lerp(4, 45, clamped);
    layer.params.filter1Cutoff = lerp(800, 12000, clamped);
    layer.params.jitter = lerp(10, 60, clamped);

    if(layerName === activeLayer){
      syncKnobsFromActiveLayer();
    }
  }

  function createGrainLayer(source, initialParams, layerName){
    var params = {};
    Object.keys(knobs).forEach(function(name){
      params[name] = typeof initialParams[name] !== "undefined" ? initialParams[name] : knobs[name].getValue();
    });
    params.windowShape = initialParams && initialParams.windowShape ? initialParams.windowShape : windowShape;
    params.source = source || null;

    var layer = {
      name: layerLabel(layerName),
      volume: 0.8,
      muted: false,
      intensity: 0,
      sourceIsManual: false,
      outputGain: null,
      params: params,
      setVolume: function(v){
        layer.volume = Math.min(1, Math.max(0, v));
        if(layer.outputGain && audioCtx){
          applyLayerOutputLevel(layer, layer.muted ? 0 : layer.volume);
        }
      },
      setMuted: function(bool){
        layer.muted = !!bool;
        if(layer.outputGain && audioCtx){
          applyLayerOutputLevel(layer, layer.muted ? 0 : layer.volume);
        }
      },
      start:function(){
        if(running) return;
        running = true;
        scheduleLoop();
      },
      stop:function(){
        running = false;
        if(timer){ clearTimeout(timer); timer = null; }
      },
      setParam:function(name, value){
        if(typeof params[name] !== "undefined") params[name] = value;
      }
    };

    var timer = null;
    var running = false;

    function triggerLayerGrain(){
      var sourceRef = params.source;
      var outDur = params.size/1000;
      var rate = Math.pow(2, params.pitch/12);
      var fmRate = params.fmRate;
      var fmDepth = params.fmDepth;

      if(fmDepth > 0 && fmRate > 0){
        var fmSt = fmDepth * Math.sin(2*Math.PI*fmRate*audioCtx.currentTime);
        rate *= Math.pow(2, fmSt/12);
      }

      if(micEnabled){
        if(!micEnabled || micFramesAvailable < 128) return;
        var readFrames = Math.max(128, Math.min(micFramesAvailable, Math.floor(outDur * rate * audioCtx.sampleRate)));
        var maxStart = Math.max(0, micFramesAvailable - readFrames);
        var posFrac = params.position + (Math.random()*2-1) * params.jitter/100 * 0.5;
        posFrac = Math.min(1, Math.max(0, posFrac));
        var oldest = (micWriteIndex - micFramesAvailable + micRingSize) % micRingSize;
        var startFrame = (oldest + Math.floor(posFrac * maxStart)) % micRingSize;
        var buffer = createLiveMicBuffer(startFrame, readFrames);

        if(Math.random()*100 < params.reverse){
          buffer = buildReversedSlice(buffer, 0, buffer.duration);
        }

        var startTime = audioCtx.currentTime + 0.0008 + Math.random()*params.spray/1000;
        var fluxAmt = params.fluxLevel/100;
        var fluxLevel = fluxAmt > 0 ? 1 - Math.random()*fluxAmt : 1;
        var curve = makeCurve(params.windowShape || windowShape, 64, params.spike/100);
        if(fluxLevel !== 1){
          var scaled = new Float32Array(curve.length);
          for(var ci=0; ci<curve.length; ci++) scaled[ci] = curve[ci] * fluxLevel;
          curve = scaled;
        }

        var gain = audioCtx.createGain();
        gain.gain.setValueCurveAtTime(curve, startTime, outDur);
        var src = audioCtx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;

        var node = gain;
        if(audioCtx.createStereoPanner){
          var panner = audioCtx.createStereoPanner();
          panner.pan.value = (Math.random()*2-1) * params.pan/100;
          gain.connect(panner);
          panner.connect(layer.outputGain || grainBus);
          node = panner;
        } else {
          gain.connect(layer.outputGain || grainBus);
        }

        src.connect(gain);
        src.start(startTime);
        src.stop(startTime + outDur + 0.03);
        src.onended = function(){
          try{ src.disconnect(); gain.disconnect(); if(node !== gain) node.disconnect(); }catch(e){}
        };
        return;
      }

      if(!sourceRef || !sourceRef.buffer || sourceRef.muted) return;

      if(params.fluxMute > 0 && Math.random()*100 < params.fluxMute) return;

      var buffer = sourceRef.buffer;
      var readDur = outDur * rate;
      if(readDur > buffer.duration) readDur = buffer.duration;

      var jitterAmt = params.jitter/100;
      var posFrac = params.position + (Math.random()*2-1) * jitterAmt * 0.5;
      posFrac = Math.min(1, Math.max(0, posFrac));
      var offset = posFrac * buffer.duration;
      offset = Math.min(offset, Math.max(0, buffer.duration - readDur));

      var sprayDelay = Math.random() * params.spray/1000;
      var startTime = audioCtx.currentTime + 0.0008 + sprayDelay;

      var reversed = Math.random()*100 < params.reverse;
      var src = audioCtx.createBufferSource();
      if(reversed){
        src.buffer = buildReversedSlice(buffer, offset, readDur);
        src.playbackRate.value = rate;
      } else {
        src.buffer = buffer;
        src.playbackRate.value = rate;
      }

      var fluxAmt = params.fluxLevel/100;
      var fluxLevel = fluxAmt > 0 ? (1 - Math.random()*fluxAmt) : 1;
      var curve = makeCurve(params.windowShape || windowShape, 64, params.spike/100);
      if(fluxLevel !== 1){
        var scaled = new Float32Array(curve.length);
        for(var ci=0; ci<curve.length; ci++) scaled[ci] = curve[ci] * fluxLevel;
        curve = scaled;
      }

      var gain = audioCtx.createGain();
      gain.gain.setValueCurveAtTime(curve, startTime, outDur);

      var node = gain;
      var destination = layer.outputGain || grainBus;
      if(audioCtx.createStereoPanner){
        var panner = audioCtx.createStereoPanner();
        var panSpread = params.pan/100;
        panner.pan.value = (Math.random()*2-1) * panSpread;
        gain.connect(panner);
        panner.connect(destination);
        node = panner;
      } else {
        gain.connect(destination);
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
      if(!running) return;
      triggerLayerGrain();
      var interval = Math.max(16, 1000 / params.density);
      timer = setTimeout(scheduleLoop, interval);
    }

    return layer;
  }

  function bindLayerAwareKnobs(){
    Object.keys(knobs).forEach(function(name){
      var knob = knobs[name];
      knob.addListener(function(v, silent){
        if(!suppressLayerSync && layers[activeLayer] && typeof layers[activeLayer].params[name] !== "undefined"){
          layers[activeLayer].params[name] = v;
        }
      });
    });
  }

  function initLayers(){
    var initialParams = layerParamsFromKnobs();

    layerNames.forEach(function(layerName){
      var profile = getLayerProfile(layerName);
      var layerParams = Object.assign({}, initialParams, {
        size: profile.size,
        density: profile.density,
        jitter: profile.jitter
      });
      layers[layerName] = createGrainLayer(null, layerParams, layerName);
      layers[layerName].name = layerLabel(layerName);
    });

    bindLayerAwareKnobs();
    syncLayerSources();
    renderMixerSidebar();
    syncKnobsFromActiveLayer();
  }

  document.getElementById("window-select").addEventListener("change", function(e){
    windowShape = e.target.value;
    if(layers[activeLayer]) layers[activeLayer].params.windowShape = e.target.value;
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
  var micEnabled = false;
  var micStream = null;
  var micSource = null;
  var micProcessor = null;
  var micMuteGain = null;
  var micRing = null;
  var micRingSize = 0;
  var micWriteIndex = 0;
  var micFramesAvailable = 0;
  var scanPhase = 0;    // drives the linear-ramp and sine-oscillator scan modes
  var scanMode = "linear"; // "linear" | "sine" | "wander" — how the SCAN knob drives position
  var wanderValue = knobs.position.getValue();  // wander mode's current eased position
  var wanderTarget = wanderValue;               // wander mode's current random target
  var wanderTimer = 0;                          // seconds until wander mode picks a new target
  var scanHistory = [];          // recent {t, p} samples of the scanned position, for the mini indicator
  var SCAN_HISTORY_WINDOW = 4000; // how many ms of trail the indicator shows

  initLayers();
  setUiMode(uiMode);

  var logoSlot = document.getElementById("logo-slot");
  var logoImg = document.getElementById("logo-img");
  var logoUpload = document.getElementById("logo-upload");
  var logoPlaceholder = document.getElementById("logo-placeholder");

  if(logoSlot && logoUpload){
    logoSlot.addEventListener("click", function(){
      logoUpload.click();
    });
    logoSlot.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        logoUpload.click();
      }
    });
    logoUpload.addEventListener("change", function(e){
      var file = e.target.files && e.target.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(evt){
        if(logoImg){
          logoImg.src = evt.target.result;
          logoImg.style.display = "block";
        }
        if(logoSlot){ logoSlot.classList.add("has-image"); }
        if(logoPlaceholder){ logoPlaceholder.style.display = "none"; }
      };
      reader.readAsDataURL(file);
      logoUpload.value = "";
    });
  }

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

    layerNames.forEach(function(layerName){
      var layer = layers[layerName];
      if(!layer) return;
      if(!layer.outputGain){
        layer.outputGain = audioCtx.createGain();
        layer.outputGain.gain.value = layer.volume;
        layer.outputGain.connect(grainBus);
      }
      layer.setVolume(layer.volume);
      layer.setMuted(layer.muted);
    });

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

  function createLiveMicBuffer(startFrame, frameCount){
    var buffer = audioCtx.createBuffer(2, frameCount, audioCtx.sampleRate);
    var left = buffer.getChannelData(0);
    var right = buffer.getChannelData(1);
    for(var i=0; i<frameCount; i++){
      var index = (startFrame + i) % micRingSize;
      left[i] = micRing[0][index];
      right[i] = micRing[1][index];
    }
    return buffer;
  }

  async function startLiveMic(){
    ensureContext();
    if(micEnabled) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      throw new Error("Microphone access requires HTTPS or localhost");
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 2, echoCancellation: false, autoGainControl: false, noiseSuppression: false }
    });
    micSource = audioCtx.createMediaStreamSource(micStream);
    micRingSize = Math.floor(audioCtx.sampleRate * 5);
    micRing = [new Float32Array(micRingSize), new Float32Array(micRingSize)];
    micWriteIndex = 0;
    micFramesAvailable = 0;

    micProcessor = audioCtx.createScriptProcessor(2048, 2, 2);
    micProcessor.onaudioprocess = function(e){
      var input = e.inputBuffer;
      var leftIn = input.getChannelData(0);
      var rightIn = input.numberOfChannels > 1 ? input.getChannelData(1) : leftIn;
      for(var i=0; i<leftIn.length; i++){
        micRing[0][micWriteIndex] = leftIn[i];
        micRing[1][micWriteIndex] = rightIn[i];
        micWriteIndex = (micWriteIndex + 1) % micRingSize;
      }
      micFramesAvailable = Math.min(micRingSize, micFramesAvailable + leftIn.length);
      e.outputBuffer.getChannelData(0).fill(0);
      if(e.outputBuffer.numberOfChannels > 1) e.outputBuffer.getChannelData(1).fill(0);
    };

    micMuteGain = audioCtx.createGain();
    micMuteGain.gain.value = 0;
    micSource.connect(micProcessor);
    micProcessor.connect(micMuteGain);
    micMuteGain.connect(audioCtx.destination);
    micEnabled = true;
    await audioCtx.resume();
    updateStageVisibility();
    renderSourcesBar();
    if(!rafRunning){
      rafRunning = true;
      requestAnimationFrame(visualLoop);
    }
    updatePlayEnabled();
    if(!playing) startPlayback();
  }

  function stopLiveMic(){
    micEnabled = false;
    if(micProcessor){ micProcessor.disconnect(); micProcessor.onaudioprocess = null; micProcessor = null; }
    if(micSource){ micSource.disconnect(); micSource = null; }
    if(micMuteGain){ micMuteGain.disconnect(); micMuteGain = null; }
    if(micStream){ micStream.getTracks().forEach(function(track){ track.stop(); }); micStream = null; }
    micFramesAvailable = 0;
    updateStageVisibility();
    renderSourcesBar();
    updatePlayEnabled();
  }

  function triggerLiveGrain(){
    if(!micEnabled || micFramesAvailable < 128) return;
    if(knobs.fluxMute.getValue() > 0 && Math.random()*100 < knobs.fluxMute.getValue()) return;

    var outDur = knobs.size.getValue()/1000;
    var rate = Math.pow(2, knobs.pitch.getValue()/12);
    var fmRate = knobs.fmRate.getValue();
    var fmDepth = knobs.fmDepth.getValue();
    if(fmDepth > 0 && fmRate > 0){
      rate *= Math.pow(2, (fmDepth * Math.sin(2*Math.PI*fmRate*audioCtx.currentTime))/12);
    }

    var readFrames = Math.max(128, Math.min(micFramesAvailable, Math.floor(outDur * rate * audioCtx.sampleRate)));
    var maxStart = Math.max(0, micFramesAvailable - readFrames);
    var posFrac = knobs.position.getValue() + (Math.random()*2-1) * knobs.jitter.getValue()/100 * 0.5;
    posFrac = Math.min(1, Math.max(0, posFrac));
    var oldest = (micWriteIndex - micFramesAvailable + micRingSize) % micRingSize;
    var startFrame = (oldest + Math.floor(posFrac * maxStart)) % micRingSize;
    var buffer = createLiveMicBuffer(startFrame, readFrames);
    if(Math.random()*100 < knobs.reverse.getValue()) buffer = buildReversedSlice(buffer, 0, buffer.duration);

    var startTime = audioCtx.currentTime + 0.0008 + Math.random()*knobs.spray.getValue()/1000;
    var fluxAmt = knobs.fluxLevel.getValue()/100;
    var fluxLevel = fluxAmt > 0 ? 1 - Math.random()*fluxAmt : 1;
    var curve = makeCurve(windowShape, 64, knobs.spike.getValue()/100);
    if(fluxLevel !== 1){ for(var ci=0; ci<curve.length; ci++) curve[ci] *= fluxLevel; }

    var gain = audioCtx.createGain();
    gain.gain.setValueCurveAtTime(curve, startTime, outDur);
    var src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    var node = gain;
    if(audioCtx.createStereoPanner){
      var panner = audioCtx.createStereoPanner();
      panner.pan.value = (Math.random()*2-1) * knobs.pan.getValue()/100;
      gain.connect(panner); panner.connect(grainBus); node = panner;
    }else{
      gain.connect(grainBus);
    }
    src.connect(gain);
    src.start(startTime);
    src.stop(startTime + outDur + 0.03);
    src.onended = function(){
      try{ src.disconnect(); gain.disconnect(); if(node !== gain) node.disconnect(); }catch(e){}
    };
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
    if(micEnabled) triggerLiveGrain(); else triggerGrain();
    var interval = 1000 / knobs.density.getValue();
    grainTimer = setTimeout(scheduleLoop, interval);
  }

  var playBtn = document.getElementById("play-btn");
  function startPlayback(){
    if(!micEnabled && !sources.some(function(s){ return s.enabled; })) return;
    ensureContext();
    audioCtx.resume();
    playing = true;

    layerNames.forEach(function(layerName){
      if(layers[layerName]) layers[layerName].start();
    });

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

    layerNames.forEach(function(layerName){
      if(layers[layerName]) layers[layerName].stop();
    });

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
    var anyEnabled = micEnabled || sources.some(function(s){ return s.enabled; });
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
    var hasFiles = sources.length > 0;
    var hasLiveMic = micEnabled;
    var has = hasFiles || hasLiveMic;
    dropzone.style.display = has ? "none" : "flex";
    waveCanvas.style.display = has ? "block" : "none";
    overlayCanvas.style.display = has ? "block" : "none";
    if(hasLiveMic && hasFiles){
      fileNameEl.textContent = "LIVE MIC + " + sources.length + " source" + (sources.length>1?"s":"") + " loaded";
    }else if(hasLiveMic){
      fileNameEl.textContent = "LIVE MIC active";
    }else if(hasFiles){
      fileNameEl.textContent = sources.length + " source" + (sources.length>1?"s":"") + " loaded";
    }else{
      fileNameEl.textContent = "no sources loaded";
    }
  }

  function renderSourcesBar(){
    chipsEl.innerHTML = "";
    if(micEnabled){
      var micChip = document.createElement("div");
      micChip.className = "chip mic-chip enabled viewed";
      micChip.setAttribute("aria-label", "Live microphone active");
      var micName = document.createElement("span");
      micName.className = "chip-name";
      micName.textContent = "LIVE MIC";
      var micDur = document.createElement("span");
      micDur.className = "chip-dur";
      micDur.textContent = "stream";
      micChip.appendChild(micName);
      micChip.appendChild(micDur);
      chipsEl.appendChild(micChip);
    }
    sources.forEach(function(s){
      var chip = document.createElement("div");
      var selected = false;
      layerNames.forEach(function(layerName){
        if(layers[layerName] && layers[layerName].params.source === s){
          selected = layerName === activeLayer;
        }
      });
      chip.className = "chip" + (selected ? " selected" : "") + (s.muted ? " muted" : "") + (s.id===viewedId ? " viewed" : "");
      chip.dataset.id = s.id;

      var name = document.createElement("span");
      name.className = "chip-name";
      name.textContent = s.name;

      var dur = document.createElement("span");
      dur.className = "chip-dur";
      dur.textContent = s.buffer.duration.toFixed(1) + "s";

      var muteBtn = document.createElement("button");
      muteBtn.className = "chip-mute";
      muteBtn.type = "button";
      muteBtn.title = s.muted ? "Unmute source" : "Mute source";
      muteBtn.textContent = s.muted ? "🔇" : "🔊";
      muteBtn.addEventListener("click", function(e){ e.stopPropagation(); toggleMuted(s.id); });

      var del = document.createElement("button");
      del.className = "chip-del";
      del.type = "button";
      del.title = "Remove";
      del.textContent = "\u00d7";
      del.addEventListener("click", function(e){ e.stopPropagation(); removeSource(s.id); });

      chip.appendChild(name);
      chip.appendChild(dur);
      chip.appendChild(muteBtn);
      chip.appendChild(del);
      chip.addEventListener("click", function(){ selectSourceForEditing(s.id); });
      chipsEl.appendChild(chip);
    });
  }

  function addSource(name, buffer){
    sourceCounter++;
    var id = "src" + sourceCounter;
    sources.push({ id: id, name: name, buffer: buffer, enabled: true, muted: false });
    viewedId = id;
    syncLayerSources();
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
    syncLayerSources();
    renderSourcesBar();
    updateStageVisibility();
    if(viewedId) drawWaveform();
    updatePlayEnabled();
  }

  function selectSourceForEditing(id){
    var s = sources.find(function(source){ return source.id === id; });
    if(!s) return;
    viewedId = id;
    var layerName = null;
    layerNames.forEach(function(name){
      if(layers[name] && layers[name].params.source === s){
        layerName = name;
      }
    });
    if(layerName) setActiveLayer(layerName);
    renderSourcesBar();
    if(viewedId === id) drawWaveform();
  }

  function toggleMuted(id){
    var s = sources.find(function(source){ return source.id === id; });
    if(!s) return;
    s.muted = !s.muted;
    syncLayerSources();
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

  var micBtn = document.getElementById("mic-btn");
  if(!micBtn){
    micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.className = "bar-btn mic";
    micBtn.textContent = "\uD83C\uDFA4 LIVE MIC";
    micBtn.title = "Use the microphone as a live granular source";
    recordBtn.parentElement.insertBefore(micBtn, recordBtn);
  }
  micBtn.addEventListener("click", async function(){
    if(micEnabled){
      stopLiveMic();
      micBtn.textContent = "\uD83C\uDFA4 LIVE MIC";
      micBtn.classList.remove("recording");
      statusEl.textContent = "live microphone stopped";
      return;
    }
    try{
      await startLiveMic();
      micBtn.textContent = "\u25A0 STOP MIC";
      micBtn.classList.add("recording");
      statusEl.textContent = "live microphone granular input active";
    }catch(err){
      console.error(err);
      statusEl.textContent = "microphone access denied";
    }
  });

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
