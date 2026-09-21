function main() {
    var canvas = document.getElementById("myCanvas");
    var gl = canvas.getContext("webgl");

    // ---------- 1. WARNA ----------
    var SOFT_BLUE = [0.72, 0.80, 0.94];
    var SOFT_PINK = [0.98, 0.80, 0.83];
    var SOFT_GREY = [0.92, 0.92, 0.95];

    // ---------- 2. ARAH BAYANGAN ----------
    var SHADOW_OFFSET_X = 8;
    var SHADOW_OFFSET_Y = 5;

    var positions = [];
    var colors = [];

    var shiftX = 0;
    var shiftY = 0;

    // ---------- 3. KOORDINAT DESAIN ----------
    var DESIGN_MIN_X = 20,  DESIGN_MAX_X = 170 + SHADOW_OFFSET_X;
    var DESIGN_MIN_Y = 20,  DESIGN_MAX_Y = 170 + SHADOW_OFFSET_Y;

    var scale = Math.min(
        canvas.width  / (DESIGN_MAX_X - DESIGN_MIN_X),
        canvas.height / (DESIGN_MAX_Y - DESIGN_MIN_Y)
    ) * 0.8; // sisakan margin 10% di tiap sisi

    var offsetX = (canvas.width  - (DESIGN_MAX_X - DESIGN_MIN_X) * scale) / 2 - DESIGN_MIN_X * scale;
    var offsetY = (canvas.height - (DESIGN_MAX_Y - DESIGN_MIN_Y) * scale) / 2 - DESIGN_MIN_Y * scale;

    function tx(x) { return (x + shiftX) * scale + offsetX; }
    function ty(y) { return (y + shiftY) * scale + offsetY; }

    // ---------- 4. FUNGSI 1 SEGITIGA ----------
    function addTriangle(p1, p2, p3, color) {
        positions.push(
            tx(p1[0]), ty(p1[1]), 0.0,
            tx(p2[0]), ty(p2[1]), 0.0,
            tx(p3[0]), ty(p3[1]), 0.0
        );
        for (var i = 0; i < 3; i++) {
            colors.push(color[0], color[1], color[2]);
        }
    }

    // ---------- 5. FUNGSI 1 QUAD (2 SEGITIGA) ----------
    function addQuad(tl, tr, br, bl, color) {
        addTriangle(tl, tr, br, color);
        addTriangle(tl, br, bl, color);
    }

    // ---------- 6. FUNGSI GAMBAR SIMBOL "LA" ----------
    function drawSymbol(colorL, colorA) {
        // ----- Huruf A -----
        // Kaki kiri A ( "/" ) 
        addQuad([114, 68], [136, 68], [82, 175], [60, 175], colorA);

        // Kaki kanan A ( "\" )
        addQuad([114, 68], [136, 68], [180, 175], [158, 175], colorA);

        // ----- Huruf L -----
        // Kaki Vertikal
        addQuad([40, 20], [60, 20], [60, 125], [40, 125], colorL);

        // Kaki horizontal 
        addQuad([40, 115], [155, 115], [155, 135], [40, 135], colorL);
    }

    // ---------- 7. BAYANGAN DULU, LALU SIMBOL ASLI ----------
    // a) Bayangan
    shiftX = SHADOW_OFFSET_X;
    shiftY = SHADOW_OFFSET_Y;
    drawSymbol(SOFT_GREY, SOFT_GREY);

    // b) Simbol asli 
    shiftX = 0;
    shiftY = 0;
    drawSymbol(SOFT_BLUE, SOFT_PINK);

    // ---------- 8. BUFFER POSISI ----------
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // ---------- 9. BUFFER WARNA ----------
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // ---------- 10. SHADER ----------
    var vertexShaderCode = `
        attribute vec3 aPosition;
        attribute vec3 aColor;
        varying vec3 vColor;
        uniform vec2 uResolution;

        void main(){
            vec2 zeroToOne = aPosition.xy / uResolution;
            vec2 zeroToTwo = zeroToOne * 2.0;
            vec2 clipSpace = zeroToTwo - 1.0;

            gl_Position = vec4(clipSpace * vec2(1, -1), aPosition.z, 1.0);
            vColor = aColor;
        }`;

    var fragmentShaderCode = `
        precision mediump float;
        varying vec3 vColor;
        void main(){
            gl_FragColor = vec4(vColor, 1.0);
        }`;

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
    }

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // ---------- 11. HUBUNGKAN BUFFER KE ATTRIBUTE ----------
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    var aColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColor);

    // ---------- 12. KIRIM RESOLUSI CANVAS KE SHADER ----------
    var uResolution = gl.getUniformLocation(program, "uResolution");
    gl.uniform2f(uResolution, canvas.width, canvas.height);

    // ---------- 13. RENDER ----------
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
}