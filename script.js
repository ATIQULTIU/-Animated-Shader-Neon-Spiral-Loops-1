const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
    console.error('WebGL 2 not supported');
    document.body.innerHTML = 'WebGL 2 is not supported in your browser.';
}

const vertexShaderSource = `#version 300 es
in vec4 aPosition;
void main() {
    gl_Position = aPosition;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
out vec4 fragColor;

/*--- BEGIN OF SHADERTOY ---*/

void mainImage(out vec4 O, vec2 U) {
    
    float t = iTime * 0.5 + 0.0, l, a, d, v, ds = 1.0;
    float r0 = 20.0, r1 = 5.0, n = 3.1416;
    float A = 6.1832, H = 3.1416 * cos(A * 0.05);
    
    vec3 q = iResolution;
    vec2 uv = U / q.xy;
    vec2 mouse = (iMouse.xy / q.xy - 0.5) * 2.0;
    float mousePulse = length(mouse) * 0.8;
    float angle = 0.25 * t + 0.3 * mouse.x;
    mat2 R = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

    vec3 D = normalize(vec3(0.3 * (U + U - q.xy) / q.y, -1.0)).zxy;
    vec3 c;
    vec3 p = vec3(-4.0 * (iTime - 2.0), -2.0 + mousePulse * 2.0, -12.0);
    
    D.yz *= R;
    O = vec4(0.0);
    
    for (int i = 0; i < 80; i++) {
        if (t <= 0.01) break;
        
        q = p;
        
        c = q;
        c.z += r0;
        a = atan(c.y, c.z);
        q.z = length(c.zy) - r0;
        q.y = r0 * a;
        q.x = mod(q.x - a * r0 / 6.3, r0) - r0 * 0.5;
        
        c = q;
        c.x += r1 + 0.1;
        a = atan(c.z, c.x);
        q.x = length(c.xz) - r1;
        q.z = r1 * a;
        q.y = mod(q.y - a * r1 / 6.3, r1) - r1 * 0.5;
        
        l = length(q.xy);
        a = atan(q.y, q.x);
        d = a - q.z;
        
        d = min(abs(mod(d, 6.28) - 3.14), abs(mod(d - A, 6.28) - 3.14));
        
        t = length(vec3(l - 2.0, d, fract(n * a) - 0.5)) - 0.9;
        
        float d2 = a - round(q.z * n) / n - A * 0.5 - 3.14 + 0.5 / n;
        d2 = 0.6 * (length(vec2((fract(q.z * n - 0.5) - 0.5) / n, l * cos(d2) - H)) - 0.05) / n;
        
        v = max(l - 4.0, d2);
        t = min(t, v);
        
        p += 0.5 * ds * t * D;
        
        float hue = fract(0.2 * a + iTime * 0.1 + l * 0.05 + mousePulse * 0.18);
        vec3 col = 0.50 + 0.50 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
        col *= 1.5 + mousePulse * 0.7;
        
        float glow = exp(-8.0 * abs(t));
        O.rgb += col * glow * 0.1;
    }
    
    O.a = 1.0;
}

/*--- END OF SHADERTOY ---*/

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, 'aPosition');
const resolutionUniformLocation = gl.getUniformLocation(program, 'iResolution');
const timeUniformLocation = gl.getUniformLocation(program, 'iTime');
const mouseUniformLocation = gl.getUniformLocation(program, 'iMouse');

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

gl.useProgram(program);

gl.enableVertexAttribArray(positionAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = canvas.height - e.clientY;  // Flip Y coordinate
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();  // Call once to set initial size

function render(time) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height, 1.0);
    gl.uniform1f(timeUniformLocation, time * 0.001);
    gl.uniform4f(mouseUniformLocation, mouseX, mouseY, 0.0, 0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);

// Fullscreen toggle functionality
const fullscreenBtn = document.getElementById('fullscreenBtn');
fullscreenBtn.addEventListener('click', toggleFullScreen);

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}