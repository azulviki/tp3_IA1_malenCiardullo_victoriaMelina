// --- VARIABLES GLOBALES ---
let escena = "JUEGO";
let arboles = [];
let gotas = [];
let cantidadArboles = 20;

// Control de la Nube
let nubeX = 200; 
let nubeY;
let radioNube = 60;

// MECÁNICA DE TIEMPO
let tiempoLimite = 80; 
let tiempoRestante;
let frameInicial;

// VARIABLES DE CONTROL (Compartidas)
let manoAbierta = false;
let manoAbiertaAnterior = false;
let tiempoPantallaFinal = 0; 
let últimoTouchTime = 0; 

// --- VARIABLES MEDIA PIPE (Cámara) ---
let video;
let hands;

// --- VARIABLES WEBSOCKET (Comentadas por si acaso) ---
// let ws; // [WS] Descomentar si volvés a WebSockets
// let celularManoX = 0; // [WS] 

// --- CONTROLES DE TECLADO ---
let velocidadNubeTeclado = 8; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  nubeY = 80;
  frameInicial = frameCount;
  
  // ==========================================
  // OPCIÓN A: MEDIA PIPE (Cámara activa por Wi-Fi/USB)
  // ==========================================
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide(); 
  
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  
  hands.onResults(onHandResults);
  
  const camera = new Camera(video.elt, {
    onFrame: async () => {
      await hands.send({ image: video.elt });
    },
    width: 640,
    height: 480
  });
  camera.start();

  // ==========================================
  // OPCIÓN B: WEBSOCKET / OSC (Comentado)
  // ==========================================
  // conectarWS(); // [WS] Descomentar para reactivar OSC

  // Inicializar árboles en fuego
  for (let i = 0; i < cantidadArboles; i++) {
    let x = random(50, width - 50);
    let y = random(height * 0.4, height - 100); 
    let nuevoArbol = new Arbol(x, y);
    nuevoArbol.estado = "FUEGO";
    arboles.push(nuevoArbol);
  }
}

// ==========================================
// FUNCIONES DE CONEXIÓN WEBSOCKET (Guardadas por si acaso)
// ==========================================
/* // [WS] Descomentar todo este bloque si volvés a OSC
function conectarWS() {
  ws = new WebSocket("ws://localhost:3333");

  ws.onmessage = function(event) {
    let unpaquetito = JSON.parse(event.data);
    oscReceived(unpaquetito.address, unpaquetito.value);
  };

  ws.onopen = function() {
    console.log("Conectado al bridge OSC");
  };

  ws.onclose = function() {
    console.log("Se cortó la conexión, reintentando en 2s...");
    setTimeout(conectarWS, 2000); 
  };

  ws.onerror = function(err) {
    console.log("Error de WebSocket:", err);
    ws.close();
  };
}

function oscReceived(address, value) {
  if (address === "/oscControl/la_nube/x") {
    celularManoX = value[0]; 
    nubeX = map(celularManoX, 0, 1, 0, width);
  }
  
  if (address === "/oscControl/la_nube/agua") {
    let estadoBoton = value[0]; 
    últimoTouchTime = millis(); 
    manoAbierta = (estadoBoton === 1);
  }
}
*/

function draw() {
  actualizarControlesTeclado();

  // Margen de seguridad temporal por si usás OSC/Teclado
  if (manoAbierta && (millis() - últimoTouchTime > 200)) {
    // Si usás MediaPipe estricto, podés comentar este bloque IF completo
    // manoAbierta = false; 
  }

  if (escena === "JUEGO") {
    background(0); 
    
    let incendios = 0;
    for (let i = 0; i < arboles.length; i++) {
      if (arboles[i].estado === "FUEGO") incendios++;
    }
    
    if (tiempoRestante <= 0) {
      escena = "DERROTA";
      tiempoPantallaFinal = millis(); 
    } else if (incendios === 0) {
      escena = "VICTORIA";
      tiempoPantallaFinal = millis(); 
    }
    
    actualizarJuego();
  } 
  else if (escena === "VICTORIA") {
    pantallaFinal("¡BOSQUE A SALVO!", color(0, 255, 100), color(0)); 
    intentarReiniciar();
  } 
  else if (escena === "DERROTA") {
    pantallaFinal("EL FUEGO CONSUMIÓ EL BOSQUE", color(255, 50, 50), color(255)); 
    intentarReiniciar();
  }

  manoAbiertaAnterior = manoAbierta;
}

// --- CALLBACK RESULTADOS CÁMARA (MediaPipe) ---
function onHandResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    let puntosMano = results.multiHandLandmarks[0];
    
    // Posición X basada en la muñeca (punto 0)
    let xMuñeca = 1 - puntosMano[0].x; 
    nubeX = lerp(nubeX, map(xMuñeca, 0.2, 0.8, radioNube, width - radioNube), 0.2); 
    
    // Distancia entre pulgar (4) e índice (8)
    let pulgar = puntosMano[4];
    let indice = puntosMano[8];
    let d = dist(pulgar.x, pulgar.y, indice.x, indice.y);
    
    if (d > 0.08) {
      manoAbierta = true;
    } else {
      manoAbierta = false;
    }
    últimoTouchTime = millis();
  }
}

function actualizarControlesTeclado() {
  if (keyIsDown(LEFT_ARROW))  nubeX -= velocidadNubeTeclado;
  if (keyIsDown(RIGHT_ARROW)) nubeX += velocidadNubeTeclado;
  nubeX = constrain(nubeX, radioNube, width - radioNube);

  if (keyIsDown(DOWN_ARROW)) { 
    manoAbierta = true;
    últimoTouchTime = millis();
  }
}

function intentarReiniciar() {
  let seAcabaDeAbrir = manoAbierta && !manoAbiertaAnterior;
  if (seAcabaDeAbrir && (millis() - tiempoPantallaFinal > 1500)) {
    reiniciarJuego();
  }
}

function actualizarJuego() {
  let segundosTranscurridos = floor((frameCount - frameInicial) / 60);
  tiempoRestante = tiempoLimite - segundosTranscurridos;

  if (manoAbierta) {
    if (frameCount % 3 === 0) {
      gotas.push(new Gota(nubeX + random(-radioNube/2, radioNube/2), nubeY + 20));
    }
  }

  // DIBUJAR NUBE
  push();
  noStroke();
  if (manoAbierta) {
    fill(150, 200, 255); 
  } else {
    fill(200); 
  }
  ellipse(nubeX, nubeY, radioNube * 2, radioNube * 1.2);
  pop();

  // ACTUALIZAR GOTAS Y ÁRBOLES
  for (let i = gotas.length - 1; i >= 0; i--) {
    gotas[i].actualizar();
    gotas[i].mostrar();
    for (let j = 0; j < arboles.length; j++) {
      gotas[i].chequearColision(arboles[j]);
    }
    if (gotas[i].fueraDePantalla()) gotas.splice(i, 1);
  }

  let incendiosActivos = 0;
  for (let i = 0; i < arboles.length; i++) {
    arboles[i].mostrar();
    if (arboles[i].estado === "FUEGO") incendiosActivos++;
  }

  fill(255);
  textAlign(LEFT, TOP);
  textSize(24);
  text("Tiempo: " + max(0, tiempoRestante) + "s", 30, 30);
  text("Fuegos activos: " + incendiosActivos, 30, 60);
}

function pantallaFinal(mensaje, colorFondo, colorTexto) {
  background(colorFondo); 
  textAlign(CENTER, CENTER);
  fill(colorTexto);
  
  textSize(48);
  textStyle(BOLD);
  text(mensaje, width / 2, height / 2 - 40);
  
  textStyle(NORMAL);
  textSize(22);
  text("Abrí la mano para volver a jugar", width / 2, height / 2 + 40);
}

function reiniciarJuego() {
  escena = "JUEGO";
  gotas = [];
  manoAbierta = false; 
  manoAbiertaAnterior = false; 
  frameInicial = frameCount; 
  tiempoRestante = tiempoLimite; 
  
  for (let i = 0; i < arboles.length; i++) {
    arboles[i].estado = "FUEGO";
    arboles[i].saludFuego = 100;
  }
}

// --- CLASES ÁRBOL Y GOTA ---
class Arbol {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.tam = random(60, 100);
    this.estado = "FUEGO";
    this.saludFuego = 100;
  }
  mostrar() {
    push(); 
    translate(this.x, this.y); 
    rectMode(CENTER);
    noStroke();
    if (this.estado === "FUEGO") {
      fill(255, 100, 0); 
      rect(0, -this.tam/2, this.tam * 0.6, this.tam);
      fill(255, 200, 0); 
      rect(0, -this.tam/2, this.tam * 0.3, this.tam * 0.7);
    } else {
      fill(40, 40, 40); 
      rect(0, -this.tam/2, this.tam * 0.4, this.tam);
    }
    pop();
  }
  recibirAgua() {
    if (this.estado === "FUEGO") {
      this.saludFuego -= 8;
      if (this.saludFuego <= 0) this.estado = "APAGADO";
    }
  }
}

class Gota {
  constructor(x, y) {
    this.x = x; 
    this.y = y; 
    this.velY = random(7, 11); 
    this.tam = random(10, 18);
  }
  actualizar() { this.y += this.velY; }
  mostrar() { 
    push();
    noStroke();
    fill(0, 150, 255); 
    ellipse(this.x, this.y, this.tam, this.tam * 1.5); 
    pop();
  }
  chequearColision(arbol) {
    if (arbol.estado === "FUEGO") {
      let d = dist(this.x, this.y, arbol.x, arbol.y - arbol.tam/2);
      if (d < arbol.tam / 2) { 
        arbol.recibirAgua(); 
        this.y = height + 100; 
      }
    }
  }
  fueraDePantalla() { return this.y > height; }
}