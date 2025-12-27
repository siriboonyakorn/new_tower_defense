export class SpaceScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.running = false;
    this.stars = [];
    this.lastTime = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.createStars(450);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createStars(count) {
    this.stars.length = 0;

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 1 + 0.2,   // depth
        r: Math.random() * 1.5 + 0.3, // size
        a: Math.random() * Math.PI * 2
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  loop = (t) => {
    if (!this.running) return;

    const dt = (t - this.lastTime) * 0.001;
    this.lastTime = t;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  };

  update(dt) {
    for (const s of this.stars) {
      s.y += s.z * 12 * dt;
      s.a += dt;

      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    }
  }

  draw() {
    const ctx = this.ctx;

    // space background
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const s of this.stars) {
      const twinkle = Math.sin(s.a) * 0.3 + 0.7;
      const alpha = twinkle * s.z;

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
