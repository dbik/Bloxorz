	var gl;
	var wins = 0;
	var looses = 0;

    function initGL(canvas) {
        try {
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } catch (e) {
        }
        if (!gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
    }

    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    var shaderProgram;

    function initShaders() {
        var fragmentShader = getShader(gl, "shader-fs");
        var vertexShader = getShader(gl, "shader-vs");

        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

		shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
		shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
		shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
    }

    function handleLoadedTexture(textures) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, textures);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);//Best quality
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    var crateTextures, floorTextures, finishTexture;

    function initTexture()//loading textures
	{
        var crateImage = new Image();
		var texture = gl.createTexture();
		texture.image = crateImage;
		crateTextures = texture;
        crateImage.onload = function()
		{
            handleLoadedTexture(crateTextures)
        }//cube texture
        crateImage.src = "img/crate.gif";

		var crateImage1 = new Image();
		var texture1 = gl.createTexture();
		texture1.image = crateImage1;
		floorTextures = texture1;
        crateImage1.onload = function()
		{
            handleLoadedTexture(floorTextures)
        }//floor texture
        crateImage1.src = "img/floor1.jpg";

		var crateImage2 = new Image();
		var texture2 = gl.createTexture();
		texture2.image = crateImage2;
		finishTexture = texture2;
        crateImage2.onload = function()
		{
            handleLoadedTexture(finishTexture)
        }//finish texture
        crateImage2.src = "img/cube.jpg";
    }

    var mvMatrix = mat4.create();
    var mvMatrixStack = [];
    var pMatrix = mat4.create();

    function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }

    function mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }

    function setMatrixUniforms() {
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
		var normalMatrix = mat3.create();
        mat4.toInverseMat3(mvMatrix, normalMatrix);
        mat3.transpose(normalMatrix);
        gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
    }

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

	//BASIC GAME MECHANICS
    var xRot = 0, old_xRot = 0;

    var yRot = 0;

	var zRot = -90;

    var filter = 0;


    var currentlyPressedKeys = {};

	var x = 0, y = 1, z = -20;
	var state = 2;

	var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	var cube_pos = [x1, y1][x2, y2];
	var moves = 0;

	var init_timer = 0;

    function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
		//begin timer on key push
		if(init_timer == 0)
		{
			init_timer = 1;
			doTimer();
		}

		if(String.fromCharCode(event.keyCode) == "Z")//View coords btn
		{
			alert("[" + x1 + ", " + y1 + "], [" + x2 + ", " + y2 + "]");
		}
		if(moves_ctr_check == 0)
		{
			if(state == 0)
			{
				if (String.fromCharCode(event.keyCode) == "A" || currentlyPressedKeys[37])
				{
					playSound(1);
					zRot += 90;
					xRot = 0;
					x -= 3;
					y = 1;

					y1--;
					y2 = y1;
					state = 2;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "D" || currentlyPressedKeys[39])
				{
					playSound(1);
					zRot -= 90;
					yRot = 0;
					xRot = 0;
					x += 3;
					y = 1;

					y2++;
					y1 = y2;
					state = 2;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "W" || currentlyPressedKeys[38])
				{
					playSound(1);
					old_xRot = xRot;
					xRot -= 90;
					yRot = 0;
					z -= 2;

					x1--;
					x2--;
					state = 0;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "S" || currentlyPressedKeys[40])
				{
					playSound(1);
					xRot -= 90;
					z += 2;
					yRot = 0;

					x1++;
					x2++;
					state = 0;
					moves++;
					$("#moves").empty().append(moves);
				}
			}
			else if(state == 1)
			{
				if (String.fromCharCode(event.keyCode) == "A" || currentlyPressedKeys[37])
				{
					playSound(1);
					x -= 2;
					y = 0;

					y1--;
					y2--;
					state = 1;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "D" || currentlyPressedKeys[39])
				{
					playSound(1);
					x += 2;
					y = 0;

					y1++;
					y2++;
					state = 1;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "W" || currentlyPressedKeys[38])
				{
					playSound(1);
					xRot -= 90;
					z -= 3;
					y = 1;

					x2--;
					x1 = x2;
					state = 2;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "S" || currentlyPressedKeys[40])
				{
					playSound(1);
					xRot -= 90;
					z += 3;
					y = 1;

					x1++;
					x2 = x1;
					state = 2;
					moves++;
					$("#moves").empty().append(moves);
				}
			}
			else if(state == 2)
			{
				if (String.fromCharCode(event.keyCode) == "A" || currentlyPressedKeys[37])
				{
					playSound(1);
					zRot += 90;
					x -= 3;
					y = 0;

					y2--;
					y1 -=2;
					state = 0;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "D" || currentlyPressedKeys[39])
				{
					playSound(1);
					zRot -= 90;
					x += 3;
					y = 0;

					y1++;
					y2 += 2;
					state = 0;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "W" || currentlyPressedKeys[38])
				{
					playSound(1);
					xRot -= 90;
					z -= 3;
					y = 0;

					x1--;
					x2 -= 2;
					state = 1;
					moves++;
					$("#moves").empty().append(moves);
				}
				else if (String.fromCharCode(event.keyCode) == "S" || currentlyPressedKeys[40])
				{
					playSound(1);
					xRot -= 90;
					z += 3;
					y = 0;

					x2++;
					x1 += 2;
					state = 1;
					moves++;
					$("#moves").empty().append(moves);
				}
			}
		}
	}
	var moves_ctr_check = 0;//check if game is finished
	//UP EVENTS
    function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
		if(x1 == finish_x && x2 == finish_x && y1 == finish_y && y2 == finish_y)//finish point check
		{
			//moves_ctr_check = 1;
			$("#result").fadeOut(500).empty().append("WON").css({color:"green"}).fadeIn(500);
			wins++;
			$("#wins").html(wins);
			timer_is_on = 0;

			xRot = 0, old_xRot = 0;
			yRot = 0;
			zRot = -90;
			filter = 0;
			currentlyPressedKeys = {};
			x = 0, y = 1, z = -20;
			state = 2;
			x1 = 0, x2 = 0, y1 = 0, y2 = 0;
			cube_pos = [x1, y1][x2, y2];
			moves = 0;
			init_timer = 0;

			stage++;
			if(stage == 3)
			{
				stage = 0;
				$("#stage").html(stage + 1);
			}
			else
			{
				$("#stage").html(stage + 1);
			}
		}
		if(x1 < 0 || x2 < 0 || x1 > 4 || x2 > 4 || y1 < 0 || y2 < 0 || y1 > 9 || y2 > 9)//out of the deck check
		{
			//moves_ctr_check = 1;
			x = 100;
			looses++;
			$("#looses").html(looses);
			timer_is_on = 0;
			$("#result").fadeOut(500).empty().append("LOST").css({color:"red"}).fadeIn(500);
			xRot = 0, old_xRot = 0;
			yRot = 0;
			zRot = -90;
			filter = 0;
			currentlyPressedKeys = {};
			x = 0, y = 1, z = -20;
			state = 2;
			x1 = 0, x2 = 0, y1 = 0, y2 = 0;
			cube_pos = [x1, y1][x2, y2];
			moves = 0;
			init_timer = 0;
			stage = 0;
			$("#stage").html(stage + 1);
		}
		for(var k = 0; k <= hole_ctr; k++)//drop hole check
		{
			if(x1 == hole_array[k][0] && y1 == hole_array[k][1] || x2 == hole_array[k][0] && y2 == hole_array[k][1])
			{
				//moves_ctr_check = 1;
				x = 100;
				looses++;
				$("#looses").html(looses);
				timer_is_on = 0;
				$("#result").fadeOut(500).empty().append("LOST").css({color:"red"}).fadeIn(500);
				xRot = 0, old_xRot = 0;
				yRot = 0;
				zRot = -90;
				filter = 0;
				currentlyPressedKeys = {};
				x = 0, y = 1, z = -20;
				state = 2;
				x1 = 0, x2 = 0, y1 = 0, y2 = 0;
				cube_pos = [x1, y1][x2, y2];
				moves = 0;
				init_timer = 0;
				stage = 0;
				$("#stage").html(stage + 1);
			}
		}
    }

    var cubeVertexPositionBuffer;
	var cubeVertexNormalBuffer;
    var cubeVertexTextureCoordBuffer;
    var cubeVertexIndexBuffer;

	var floorVertexPositionBuffer;
    var floorVertexTextureCoordBuffer;
    var floorVertexIndexBuffer;

    function initBuffers() {
		//CUBE CREATION
        cubeVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
        vertices = [
            // Front face
            -2.0, -1.0,  1.0,
             2.0, -1.0,  1.0,
             2.0,  1.0,  1.0,
            -2.0,  1.0,  1.0,

            // Back face
            -2.0, -1.0, -1.0,
            -2.0,  1.0, -1.0,
             2.0,  1.0, -1.0,
             2.0, -1.0, -1.0,

            // Top face
            -2.0,  1.0, -1.0,
            -2.0,  1.0,  1.0,
             2.0,  1.0,  1.0,
             2.0,  1.0, -1.0,

            // Bottom face
            -2.0, -1.0, -1.0,
             2.0, -1.0, -1.0,
             2.0, -1.0,  1.0,
            -2.0, -1.0,  1.0,

            // Right face
             2.0, -1.0, -1.0,
             2.0,  1.0, -1.0,
             2.0,  1.0,  1.0,
             2.0, -1.0,  1.0,

            // Left face
            -2.0, -1.0, -1.0,
            -2.0, -1.0,  1.0,
            -2.0,  1.0,  1.0,
            -2.0,  1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        cubeVertexPositionBuffer.itemSize = 3;
        cubeVertexPositionBuffer.numItems = 24;

		cubeVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
        var vertexNormals = [
            // Front face
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,
             0.0,  0.0,  1.0,

            // Back face
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,
             0.0,  0.0, -1.0,

            // Top face
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,

            // Bottom face
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,

            // Right face
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,

            // Left face
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
        cubeVertexNormalBuffer.itemSize = 3;
        cubeVertexNormalBuffer.numItems = 24;

        cubeVertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);

        var textureCoords = [
            // Front face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,

            // Back face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,

            // Top face
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,

            // Bottom face
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,

            // Right face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,

            // Left face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.DYNAMIC_DRAW);
        cubeVertexTextureCoordBuffer.itemSize = 2;
        cubeVertexTextureCoordBuffer.numItems = 24;

        cubeVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
        var cubeVertexIndices = [
            0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
        ]
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.DYNAMIC_DRAW);
        cubeVertexIndexBuffer.itemSize = 1;
        cubeVertexIndexBuffer.numItems = 36;

		//FLOOR CELL CUBE CREATION
		floorVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexPositionBuffer);
        vertices = [
             // Front face
			 1.0, -1.0,  1.0,
             1.0, -2.0,  1.0,
			-1.0, -2.0,  1.0,
            -1.0, -1.0,  1.0,

            // Back face
            -1.0, -1, -1.0,
             1.0, -1, -1.0,
             1.0, -2, -1.0,
             -1, -2, -1.0,

            // Top face
             -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Bottom face
            -1.0,-2, -1.0,
             1, -2, -1.0,
             -1, -2,  1.0,
            1, -2, 1.0,

            // Right face
            1, -1, -1.0,
            1, -1,  1.0,
            1,  -2, 1.0,
            1, -2, -1.0,

            // Left face
            -1, -1, -1.0,
            -1, -1,  1.0,
            -1,  -2, 1.0,
            -1, -2, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        floorVertexPositionBuffer.itemSize = 3;
        floorVertexPositionBuffer.numItems = 24;

        floorVertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexTextureCoordBuffer);

        var textureCoords = [
            // Front face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,

            // Back face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,

            // Top face
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,

            // Bottom face
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,

            // Right face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,

            // Left face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        floorVertexTextureCoordBuffer.itemSize = 2;
        floorVertexTextureCoordBuffer.numItems = 24;

        floorVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floorVertexIndexBuffer);
        var floorVertexIndices = [
            0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
        ]
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(floorVertexIndices), gl.STATIC_DRAW);
        floorVertexIndexBuffer.itemSize = 1;
        floorVertexIndexBuffer.numItems = 36;
    }
	var table_array = new Array();
	function create_lvl_1()
	{
		hole_array = [];
		hole_ctr = 0;
		var a, b;
		for(a = 0; a <= 5; a++)
		{
			table_array[a] = new Array();
			for(b = 0; b <= 10; b++)
			{
				if(a == 3 && b == 3)
				{
					table_array[a].push('f');
					finish_x = a;
					finish_y = b;
				}
				else if(a == 0 && b == 0)
				{
					table_array[a].push('s');
				}
				else
				{
					table_array[a].push('x');
				}
			}
		}
	}
	var hole_array;
	var hole_ctr;
	var finish_x, finish_y;
	function create_lvl_2()
	{
		hole_array = [];
		hole_ctr = 0;
		var a, b;
		for(a = 0; a <= 5; a++)
		{
			table_array[a] = new Array();
			for(b = 0; b <= 10; b++)
			{
				if(a == 3 && b == 3)
				{
					table_array[a].push('f');
					finish_x = a;
					finish_y = b;
				}
				else if(a == 4 && b == 4)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 4 && b == 7)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 0 && b == 0)
				{
					table_array[a].push('s');
				}
				else
				{
					table_array[a].push('x');
				}
			}
		}
	}
	function create_lvl_3()
	{
		hole_array = [];
		hole_ctr = 0;
		var a, b;
		for(a = 0; a <= 5; a++)
		{
			table_array[a] = new Array();
			for(b = 0; b <= 10; b++)
			{
				if(a == 4 && b == 4)
				{
					table_array[a].push('f');
					finish_x = a;
					finish_y = b;
				}
				else if(a == 4 && b == 9)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 3 && b == 9)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 1 && b == 2)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 1 && b == 1)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 2 && b == 1)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 4 && b == 8)
				{
					table_array[a].push('e');
					hole_array[hole_ctr] = new Array(a, b);
					hole_ctr++;
				}
				else if(a == 0 && b == 0)
				{
					table_array[a].push('s');
				}
				else
				{
					table_array[a].push('x');
				}
			}
		}
	}

    function drawScene()
	{
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(40, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

        mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [-8, -15, -15]);
		mat4.rotate(mvMatrix, degToRad(50), [1, 0, 0]);

		mvPushMatrix();//new
        mat4.translate(mvMatrix, [x, y, z]);
        mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0]);
        mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0]);
		mat4.rotate(mvMatrix, degToRad(zRot), [0, 0, 1]);
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);


        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, crateTextures);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

		var lighting = document.getElementById("lighting").checked;
        gl.uniform1i(shaderProgram.useLightingUniform, lighting);
        if (lighting) {
            gl.uniform3f(
                shaderProgram.ambientColorUniform,
                parseFloat(0.2),
                parseFloat(0.2),
                parseFloat(0.2)
            );

            var adjustedLD = vec3.create();
            vec3.normalize(lightingDirection, adjustedLD);
            vec3.scale(adjustedLD, -1);
            gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

            gl.uniform3f(
                shaderProgram.directionalColorUniform,
                parseFloat(0.8),
                parseFloat(0.8),
                parseFloat(0.8)
            );
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		mvPopMatrix();

		var d = -20;
		for(var i = 0; i < 10; i++)
		{
			for(var j = 0; j < 5; j++)
			{
				if(table_array[j][i] == "x" || table_array[j][i] == "s")//start and normal state floor
				{
					mvPushMatrix();
					mat4.translate(mvMatrix, [2 * i, 0.0 , d + (2 * j)]);//floor creation
					gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexPositionBuffer);
					gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, floorVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

					gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexTextureCoordBuffer);
					gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, floorVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, floorTextures);
					gl.uniform1i(shaderProgram.samplerUniform, 0);

					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floorVertexIndexBuffer);
					setMatrixUniforms();
					gl.drawElements(gl.TRIANGLES, floorVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
					mvPopMatrix();
				}
				else if(table_array[j][i] == "f")//final state floor
				{
					mvPushMatrix();
					mat4.translate(mvMatrix, [2 * i, 0.0 , d + (2 * j)]);
					gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexPositionBuffer);
					gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, floorVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

					gl.bindBuffer(gl.ARRAY_BUFFER, floorVertexTextureCoordBuffer);
					gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, floorVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, finishTexture);
					gl.uniform1i(shaderProgram.samplerUniform, 0);

					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floorVertexIndexBuffer);
					setMatrixUniforms();
					gl.drawElements(gl.TRIANGLES, floorVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
					mvPopMatrix();
				}
				else
				{
					continue;
				}
			}
		}
    }
	var stage = 0;
    function tick() {
        requestAnimFrame(tick);
		if(stage == 0)
		{
			create_lvl_1();
			drawScene();
		}
		else if(stage == 1)
		{
			create_lvl_2();
			drawScene();
		}
		else if(stage == 2)
		{
			create_lvl_3();
			drawScene();
		}
    }

	//function to play sound in each click
	var sound;
	function playSound(volume) {
	  var click=sound.cloneNode();
	  click.volume=volume;
	  click.play();
	}

    function webGLStart() {
		$("#stage_1").click(function(){
			stage = 0;
			xRot = 0, old_xRot = 0;
			yRot = 0;
			zRot = -90;
			filter = 0;
			currentlyPressedKeys = {};
			x = 0, y = 1, z = -20;
			state = 2;
			x1 = 0, x2 = 0, y1 = 0, y2 = 0;
			cube_pos = [x1, y1][x2, y2];
			moves = 0;
			init_timer = 0;
			$("#stage").html(stage + 1);
		});
		$("#stage_2").click(function(){
			stage = 1;
			xRot = 0, old_xRot = 0;
			yRot = 0;
			zRot = -90;
			filter = 0;
			currentlyPressedKeys = {};
			x = 0, y = 1, z = -20;
			state = 2;
			x1 = 0, x2 = 0, y1 = 0, y2 = 0;
			cube_pos = [x1, y1][x2, y2];
			moves = 0;
			init_timer = 0;
			$("#stage").html(stage + 1);
		});
		$("#stage_3").click(function(){
			stage = 2;
			xRot = 0, old_xRot = 0;
			yRot = 0;
			zRot = -90;
			filter = 0;
			currentlyPressedKeys = {};
			x = 0, y = 1, z = -20;
			state = 2;
			x1 = 0, x2 = 0, y1 = 0, y2 = 0;
			cube_pos = [x1, y1][x2, y2];
			moves = 0;
			init_timer = 0;
			$("#stage").html(stage + 1);
		});
		sound = new Audio("mp3/w.mp3");
		sound.preload = 'auto';
		sound.load();
		//load stage

		//defaults
        var canvas = document.getElementById("game");
        initGL(canvas);
        initShaders();
        initBuffers();
        initTexture();

        gl.clearColor(0.0, 0.0, 0.0, 0.1);
        gl.enable(gl.DEPTH_TEST);

        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        tick();
    }

	//Custom timer
	var c = 0;
	var minutes = 0;
	var t;
	var timer_is_on = 0;
	var light_state_ctr = 0;

	function timedCount()
	{
		if(timer_is_on)
		{
			$("#time").html(minutes + ':'+ c);
			c = c + 1;
			if(c % 60 == 0)
			{
				minutes += 1;
				c = 0;
			}
			if(c % 5 == 0)
			{
				light_state_ctr++;
				if(light_state_ctr == 6)
				{
					light_state_ctr = 0;
				}
				animateLightDirection(light_state_ctr);
			}
			t = setTimeout("timedCount()", 1000);
		}
	}

	//init timer
	function doTimer()
	{
		if (!timer_is_on)
		{
			timer_is_on = 1;
			timedCount();
		}
	}
	//initial light direction
	var lightingDirection = [
			parseFloat(0),
			parseFloat(0),
			parseFloat(0)
		];

	//light direction states
	function animateLightDirection(light_state)
	{
		if(light_state == 0)
		{
			lightingDirection = [
				parseFloat(0),
				parseFloat(0),
				parseFloat(0)
			];
		}
		else if(light_state == 1)
		{
			lightingDirection = [
				parseFloat(10),
				parseFloat(-1),
				parseFloat(-2)
			];
		}
		else if(light_state == 2)
		{
			lightingDirection = [
				parseFloat(5),
				parseFloat(-5),
				parseFloat(-5)
			];
		}
		else if(light_state == 3)
		{
			lightingDirection = [
				parseFloat(0),
				parseFloat(-10),
				parseFloat(-5)
			];
		}
		else if(light_state == 4)
		{
			lightingDirection = [
				parseFloat(-10),
				parseFloat(5),
				parseFloat(-10)
			];
		}
		else if(light_state == 5)
		{
			lightingDirection = [
				parseFloat(-10),
				parseFloat(0),
				parseFloat(0)
			];
		}
	}
