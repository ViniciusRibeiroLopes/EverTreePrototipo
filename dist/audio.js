/* Procedural Web Audio: no downloads, autoplay or audio files. */
window.ForestAudio = class {
  constructor() {
    this.enabled = false;
    this.timer = null;
    this.ctx = null;
    this.level = 0;
  }
  async toggle(on) {
    this.enabled = on;
    if (!on) {
      if (this.ctx) {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
        await this.ctx.suspend();
      }
      clearInterval(this.timer);
      this.timer = null;
      return;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error("Áudio não disponível neste navegador.");
    if (!this.ctx) {
      this.ctx = new Audio();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(
          1,
          this.ctx.sampleRate * 3,
          this.ctx.sampleRate,
        ),
        data = buffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < data.length; i++) {
        prev = (prev + Math.random() * 0.04 - 0.02) / 1.02;
        data[i] = prev * 3;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 480;
      this.wind = this.ctx.createGain();
      this.wind.gain.value = 0.4;
      noise.connect(filter);
      filter.connect(this.wind);
      this.wind.connect(this.master);
      noise.start();
      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = "bandpass";
      waterFilter.frequency.value = 1600;
      waterFilter.Q.value = 0.6;
      this.water = this.ctx.createGain();
      this.water.gain.value = 0;
      noise.connect(waterFilter);
      waterFilter.connect(this.water);
      this.water.connect(this.master);
    }
    await this.ctx.resume();
    this.master.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.4);
    if (!this.timer) this.timer = setInterval(() => this.ambient(), 2100);
  }
  update(recovery, weather) {
    this.level = recovery / 100;
    if (!this.ctx) return;
    this.water.gain.setTargetAtTime(
      this.level * 0.6 + (weather === "chuva" ? 0.2 : 0),
      this.ctx.currentTime,
      2,
    );
    this.wind.gain.setTargetAtTime(
      0.35 - this.level * 0.2,
      this.ctx.currentTime,
      2,
    );
  }
  tone(freq, duration = 0.3, volume = 0.14, type = "sine", slide = null) {
    if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + duration);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  ambient() {
    if (document.hidden) return;
    if (this.level > 0.3 && Math.random() < this.level)
      this.tone(
        1800 + Math.random() * 1000,
        0.18,
        0.12,
        "sine",
        3000 + Math.random() * 800,
      );
    if (this.level > 0.6) {
      const notes = [261.63, 329.63, 392, 523.25, 659.25];
      this.tone(notes[Math.floor(Math.random() * notes.length)], 1.9, 0.09);
    }
  }
  click() {
    this.tone(500 + Math.random() * 150, 0.16, 0.12, "sine", 850);
  }
};
