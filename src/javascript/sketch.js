{
    "use strict";
    
    const GRAVITY = 1.0
    const CONTRAINT_LIMIT = 20;
    const ITER_RESOLVE = 10;
    const STIFFNESS = 0.7;
    const SIZE = 45;
    const TILE_WIDTH = 30;
    const TILE_HEIGHT = 15;
    const AIR_FRICTION = 0.99;
  
    class Node {
      constructor (x, y, mass) {
        this.x = x;
        this.y = y;
        this.oldx = x;
        this.oldy = y;
        this.mass = mass;
        this.mxd = 0;
        this.myd = 0;
        this.dragged = false;
      }
      integrate () {
        const vx = (this.x - this.oldx) * AIR_FRICTION;
        const vy = (this.y - this.oldy) * AIR_FRICTION;
        this.oldx = this.x;
        this.oldy = this.y;
        this.x += vx;
        this.y += vy + GRAVITY * this.mass;
      }
      checkScreenLimit () {
        if (this.y >= canvas.height - 5) {
          this.y = canvas.height - 5;
          this.x -= (this.x - this.oldx) * 0.1;
        }
        if (this.x >= canvas.width - 1) {
          this.x = canvas.width - 1;
        }
        else if (this.x <= 1) {
          this.x = 1;
        }
      }
    }
  
    class Contraint {
      constructor (n0, n1) {
        this.n0 = n0;
        this.n1 = n1;
        const diffx = n0.x - n1.x;
        const diffy = n0.y - n1.y;
        this.dist = Math.sqrt (diffx * diffx + diffy * diffy);
        this.break = false;
      }
      resolve () {
        const diffx = this.n0.x - this.n1.x;
        const diffy = this.n0.y - this.n1.y;
        const length = Math.sqrt (diffx * diffx + diffy * diffy);
        if (length > this.dist * CONTRAINT_LIMIT) {
          this.break = true;
        }
        else {
          const diff = (this.dist - length) / length;
          const offsetx = diffx * diff * STIFFNESS;
          const offsety = diffy * diff * STIFFNESS;
  
          if (this.n0.mass !== 0) {
            this.n0.x += offsetx * this.n0.mass;
            this.n0.y += offsety * this.n0.mass;
          }
          if (this.n1.mass !== 0) {
            this.n1.x -= offsetx * this.n1.mass;
            this.n1.y -= offsety * this.n1.mass;
          }
        }
      }
      draw () {
        ctx.beginPath ();
        ctx.moveTo (this.n1.x, this.n1.y);
        ctx.lineTo (this.n0.x, this.n0.y);
        ctx.stroke ();
      }
    }
  
    const control = {
      idDown: false,
      pointerColor: "rgba(32, 45, 21, 0.3)",
      radius: 17,
      nodes: null,
      targets: [],
      x: 0,
      y: 0,
      init (nodes, canvas) {
        this.nodes = nodes;
        window.addEventListener ("mousemove", e => this.move (e), false);
        canvas.addEventListener ("touchmove", e => this.move (e), false);
        window.addEventListener ("mousedown", e => this.down (e), false);
        window.addEventListener ("touchstart", e => this.down (e), false);
        window.addEventListener ("mouseup", _ => this.up (), false);
        window.addEventListener ("touchend", _ => this.up (), false);
      },
      down (e) {
        this.move (e);
        for (let n of this.nodes) {
          const diffx = this.x - n.x;
          const diffy = this.y - n.y;
          const length = Math.sqrt (diffx * diffx + diffy * diffy);
          if (length <= this.radius && n.mass > 0) {
            n.mxd = diffx;
            n.myd = diffy;
            n.mass = 0;
            n.dragged = true;
            this.targets.push (n);
            this.isDown = true;
          }
        }
      },
      move (e) {
        let p;
        const mode = e.targetTouches;
        if (mode) {
          e.preventDefault ();
          p = mode [0];
        }
        else p = e;
        const dpr = window. devicePixelRatio || 1;
        this.x = p.clientX * dpr;
        this.y = p.clientY * dpr;
        for (let n of this.targets) {
          n.x = n.oldx = this.x - n.mxd;
          n.y = n.oldy = this.y - n.myd;
        }
      },
      up () {
        this.isDown = false;
        let i = this.targets.length;
        while (i--) {
          const node = this.targets.pop ();
          node.mass = 1;
          node.dragged = false;
        }
      },
      drawPointer () {
        ctx.beginPath ();
        ctx.arc (this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.pointerColor;
        ctx.fill ();
      }
    };
  
    const nodes = [];
    const contraints = [];
  
    // Node
    for (let i = 0; i < SIZE; i++) {
      const y = i * TILE_HEIGHT;
      const mass = (i === 0) ? 0 : 1;
      for (let j = 0; j < SIZE; j++) {
        const x = j * TILE_WIDTH ;
        nodes.push (new Node (x, y, mass));
      }
    }
    // contraints
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - 1; j++) {
        const n2 = nodes [j + i * SIZE];
        const n3 = nodes [j + i * SIZE + 1];
        contraints.push (new Contraint (n2, n3));
      }
    }
    for (let i = 0; i < SIZE - 1; i++) {
      for (let j = 0; j < SIZE; j++) {
        const n0 = nodes [i * SIZE + j];
        const n1 = nodes [(i + 1) * SIZE + j]
        contraints.push (new Contraint (n0, n1));
      }
    }
  
    const canvas = {
      offsetx: 0,
      offsety: 0,
      init () {
        this.element = document.querySelector ("canvas");
        this.ctx = this.element.getContext ("2d");
        this.resize ();
        window.addEventListener ("resize", _ => this.resize (), false);
        this.ctx.strokeStyle = "#222";
        return this.ctx;
      },
      resize () {
        const dpr = window.devicePixelRatio || 1;
        this.width = this.element.offsetWidth * dpr;
        this.height = this.element.offsetHeight * dpr;
        this.element.width = this.width;
        this.element.height = this.height;
        const gridWidth = TILE_WIDTH * SIZE;
        const gridHeight = TILE_HEIGHT * SIZE;
        if (this.width < gridWidth) this.width = gridWidth;
        if (this.height < gridHeight) this.height = gridHeight;
        const offsetx = Math.floor ((this.width - gridWidth) * 0.5);
        const offsety = Math.floor ((this.height - gridHeight) * 0.5);
        const rox = offsetx - this.offsetx;
        const roy = offsety - this.offsety;
        this.offsetx = offsetx;
        this.offsety = offsety;
        for (let n of nodes) {
          n.x += rox;
          n.y += roy;
          n.oldx += rox;
          n.oldy += roy;
        }
      }
    }
  
    const ctx = canvas.init ();
    control.init (nodes, canvas.element);
  
    const run = _ => {
      requestAnimationFrame (run);
      ctx.clearRect (0, 0, canvas.width, canvas.height);
      if (control.isDown) control.drawPointer ();
      for (let n of nodes) {
        if (n.mass === 0) continue;
        n.integrate ();
        n.checkScreenLimit ();
      }
      for (let i = 0; i < ITER_RESOLVE; i++) {
        for (let c of contraints) {
          if (!c.break) c.resolve ();
        }
      }
      for (let c of contraints) {
        if (!c.break) c.draw ();
      } 
    }
  
    requestAnimationFrame (run);
  
  }