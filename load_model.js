var gl;
var shoe_model = {};
var shoe_vao;
var shoe_shader;
var done_preprocess = false;

function loadShader(type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`Error compiling shader: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function loadBinaryFile(url, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function() {
        if (this.status == 200) {
            callback(this.response);
        } else {
            console.error('Error loading file:', this.statusText);
        }
    };

    xhr.onerror = function() {
        console.error('Network error while loading file:', url);
    };

    xhr.send();
}

function loadTextFile(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
        if (this.status == 200) {
            callback(this.responseText);
        } else {
            console.error('Error loading file:', this.statusText);
        }
    };

    xhr.onerror = function() {
        console.error('Network error while loading file:', url);
    };

    xhr.send();
}


function join_images(imgs) {

    let res_width = 0;
    let res_height = 0;
    imgs.forEach((img) => {
        res_width = Math.max(img.width, res_width);
        res_height += img.height;
    });

    let canvas = document.createElement('canvas');
    canvas.width = res_width;
    canvas.height = res_height;
    let ctx = canvas.getContext('2d');


    let uv_rects = []

    let accum_height = 0;
    imgs.forEach((img) => {
        ctx.drawImage(img, 0, accum_height);

        uv_rects.push({
            x: 0,
            y: accum_height / canvas.height,
            w: img.width / canvas.width,
            h: img.height / canvas.height})

        accum_height += img.height;
    });

    let joined_img = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
        img: joined_img,
        uv_rects: uv_rects
    };
}


function init_rendering(gltf_json, gltf_buffer, joined) {

    let attr_row_n_elem = (
        3 + // pos
        3 + // blend0
        3 + // blend1

        2 * 6 // uv maps
    );

    // Load the model
    (function() {
        let primitive = gltf_json.meshes[0].primitives[0];
        let attr_map = primitive.attributes;
        let indices_view = primitive.indices;

        let bfw = gltf_json.bufferViews;

        shoe_model.elements = new Uint32Array(gltf_buffer, bfw[indices_view].byteOffset, bfw[indices_view].byteLength / Uint32Array.BYTES_PER_ELEMENT);

        let pos_arr = new Float32Array(gltf_buffer, bfw[attr_map.POSITION].byteOffset, bfw[attr_map.POSITION].byteLength / Float32Array.BYTES_PER_ELEMENT);

        // Holds 3 vector elements
        let blend0_arr = new Float32Array(gltf_buffer, bfw[attr_map.NORMAL].byteOffset, bfw[attr_map.NORMAL].byteLength / Float32Array.BYTES_PER_ELEMENT);

        // Holds 4 vector elements
        let blend1_arr = new Float32Array(gltf_buffer, bfw[attr_map.COLOR_0].byteOffset, bfw[attr_map.COLOR_0].byteLength / Float32Array.BYTES_PER_ELEMENT);


        uv_arrs = []
        for(let i_uv_arr = 0; i_uv_arr < 6; ++i_uv_arr) {
            let key = "TEXCOORD_" + i_uv_arr;
            let uv_arr = new Float32Array(gltf_buffer, bfw[attr_map[key]].byteOffset, bfw[attr_map[key]].byteLength / Float32Array.BYTES_PER_ELEMENT);
            uv_arrs.push(uv_arr);
        }
                 
        let n_verts = pos_arr.length / 3;

        shoe_model.attr = new Float32Array(n_verts * attr_row_n_elem);

        let it = 0;
        for(let i = 0; i < pos_arr.length / 3; ++i) {
//
            shoe_model.attr[it++] = pos_arr[i * 3 + 0];
            shoe_model.attr[it++] = pos_arr[i * 3 + 1];
            shoe_model.attr[it++] = pos_arr[i * 3 + 2];
//
            shoe_model.attr[it++] = blend0_arr[i * 3 + 0];
            shoe_model.attr[it++] = blend0_arr[i * 3 + 1];
            shoe_model.attr[it++] = blend0_arr[i * 3 + 2];
//
            shoe_model.attr[it++] = blend1_arr[i * 4 + 0];
            shoe_model.attr[it++] = blend1_arr[i * 4 + 1];
            shoe_model.attr[it++] = blend1_arr[i * 4 + 2];

            uv_arrs.forEach((uv_arr, i_uv_arr) => {
                let uv_rect = joined.uv_rects[i_uv_arr];
                let u = uv_arr[i * 2 + 0];
                let v = uv_arr[i * 2 + 1];

                if (i_uv_arr == 0){
                    v = 1 - v;
                }

                u = uv_rect.x + u * uv_rect.w;
                v = uv_rect.y + v * uv_rect.h;
                shoe_model.attr[it++] = u;
                shoe_model.attr[it++] = v;
            });
        }
    }());


    // Shader program
    (function() {
        let vertex_shader_s = `#version 300 es
        layout (location = 0) in vec3 position;
        layout (location = 1) in vec3 blend0;
        layout (location = 2) in vec3 blend1;

        layout (location = 3) in vec2 uv0;
        layout (location = 4) in vec2 uv1;
        layout (location = 5) in vec2 uv2;
        layout (location = 6) in vec2 uv3;
        layout (location = 7) in vec2 uv4;
        layout (location = 8) in vec2 uv5;

        uniform mat4 trans;

        out vec3 Blend0;
        out vec3 Blend1;

        out vec2 UV0;
        out vec2 UV1;
        out vec2 UV2;
        out vec2 UV3;
        out vec2 UV4;
        out vec2 UV5;

        void main() {
          Blend0 = blend0;
          Blend1 = blend1;

          UV0 = uv0;
          UV1 = uv1;
          UV2 = uv2;
          UV3 = uv3;
          UV4 = uv4;
          UV5 = uv5;

          vec4 pos = trans * vec4(position.xy, -position.z, 1.0);

          pos.z /= 100.0;
          gl_Position = vec4(pos.xyz, 1.0);
        }
        `;

        let vertex_shader = loadShader(gl.VERTEX_SHADER, vertex_shader_s);

        let fragmant_shader_s = `#version 300 es
        precision mediump float;

        in vec3 Blend0;
        in vec3 Blend1;

        in vec2 UV0;
        in vec2 UV1;
        in vec2 UV2;
        in vec2 UV3;
        in vec2 UV4;
        in vec2 UV5;

        out vec4 outColor;

        uniform sampler2D tex;

        void main() {
          vec3 right_color = texture(tex, UV0).rgb;
          vec3 left_color = texture(tex, UV1).rgb;
          vec3 up_color = texture(tex, UV2).rgb;
          vec3 down_color = texture(tex, UV3).rgb;
          vec3 back_color = texture(tex, UV4).rgb;
          vec3 front_color = texture(tex, UV5).rgb;

          float blend_vals[6];
          blend_vals[0] = Blend0.x;
          blend_vals[1] = Blend0.y;
          blend_vals[2] = Blend0.z;
          blend_vals[3] = Blend1.x;
          blend_vals[4] = Blend1.y;
          blend_vals[5] = Blend1.z;

          vec3 all_colors[6];
          all_colors[0] = right_color;
          all_colors[1] = left_color;
          all_colors[2] = up_color;
          all_colors[3] = down_color;
          all_colors[4] = back_color;
          all_colors[5] = front_color;

          outColor = vec4(0, 0, 0, 1);
          for(int i = 0; i < 6; ++i ) {
            outColor.rgb += blend_vals[i] * all_colors[i];
          }
        }
        `
        let fragmant_shader = loadShader(gl.FRAGMENT_SHADER, fragmant_shader_s);

        shoe_shader = gl.createProgram();
        gl.attachShader(shoe_shader, vertex_shader);
        gl.attachShader(shoe_shader, fragmant_shader);
        gl.linkProgram(shoe_shader);
        gl.useProgram(shoe_shader);

    }());


    // Load shoe model
    (function() {
        let sizeof_r32 = 4;
        let sizeof_s32 = 4;

        shoe_vao = gl.createVertexArray();
        gl.bindVertexArray(shoe_vao);
        
        let vbo = gl.createBuffer();
        let ebo = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, shoe_model.attr, gl.STATIC_DRAW);
 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shoe_model.elements, gl.STATIC_DRAW);

        let sizeof_attr = attr_row_n_elem * sizeof_r32;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, sizeof_attr, 0);

        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, sizeof_attr, 3 * sizeof_r32);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, sizeof_attr, 6 * sizeof_r32);
        // UV
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, sizeof_attr, 9 * sizeof_r32);

        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 2, gl.FLOAT, false, sizeof_attr, 11 * sizeof_r32);

        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(5, 2, gl.FLOAT, false, sizeof_attr, 13 * sizeof_r32);

        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 2, gl.FLOAT, false, sizeof_attr, 15 * sizeof_r32);

        gl.enableVertexAttribArray(7);
        gl.vertexAttribPointer(7, 2, gl.FLOAT, false, sizeof_attr, 17 * sizeof_r32);

        gl.enableVertexAttribArray(8);
        gl.vertexAttribPointer(8, 2, gl.FLOAT, false, sizeof_attr, 19 * sizeof_r32);
    }());


    // Set texture map
    (function() {
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, joined.img);

        // Set the texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        let uni_sampler = gl.getUniformLocation(shoe_shader, "tex");
        gl.uniform1i(uni_sampler, 0);
    }());

    done_preprocess = true;
}

window.onload = function() {
	// Create canvas


    var right_img = new Image();
    var right_loaded = false;
    var left_img = new Image();
    var left_loaded = false;
    var up_img = new Image();
    var up_loaded = false;
    var down_img = new Image();
    var down_loaded = false;
    var back_img = new Image();
    var back_loaded = false;
    var front_img = new Image();
    var front_loaded = false;


    var gltf_json = undefined;
    var gltf_buffer = undefined;

    loadBinaryFile("data/gltf_buffer.bin", (data) => {
        gltf_buffer = data;
        console.log(gltf_buffer);
    });

    loadTextFile("data/model.gltf", (data) => {
        gltf_json = JSON.parse(data);
    });

    right_img.onload = () => {
        right_loaded = true;
    };

    left_img.onload = () => {
        left_loaded = true;
    }
    up_img.onload = () => {
        up_loaded = true;
    }

    down_img.onload = () => {
        down_loaded = true;
    }

    back_img.onload = () => {
        back_loaded = true;
    }
    front_img.onload = () => {
        front_loaded = true;
    }

    right_img.src = "data/right.jpg";
    left_img.src = "data/left.jpg"
    up_img.src = "data/up.jpg"
    down_img.src = "data/down.jpg"
    back_img.src = "data/back.jpg"
    front_img.src = "data/front.jpg"


    // This runs after everything is loaded
    let state = "wait_load";

    // Main loop
    let last_time = Date.now();
    let periodic_time = 0;

	let canvas = document.createElement('canvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);

    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    setInterval(function(){
        let delta_time = Date.now() - last_time;
        delta_time /= 1000;
        periodic_time += delta_time;
        if (periodic_time > 10000) {
            periodic_time -= 10000;
        }

        let tt = 2 * Math.PI * periodic_time * 0.5;
        last_time = Date.now();

        if (state == "wait_load") {

            // Draw load animation
            (function() {
                let ctx = canvas.getContext('2d');
                let centerX = canvas.width / 2;
                let centerY = canvas.height / 2;
                let radius = 20;
                let lineWidth = 5;
                let circleColor = '#333';

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 2 * tt, 2 * tt + Math.PI);
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = circleColor;
                ctx.stroke();
            }());


            if (
                left_loaded && 
                right_loaded && 
                up_loaded && 
                down_loaded && 
                back_loaded && 
                front_loaded &&
                (gltf_json != undefined) &&
                (gltf_buffer != undefined)
            ) {
                document.body.removeChild(canvas);
                canvas = document.createElement('canvas');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                document.body.appendChild(canvas);
                
                state = "init";
            }
        } else if (state == "init" ) {


            gl = canvas.getContext('webgl2');
             
            joined = join_images([
                right_img,
                left_img,
                up_img,
                down_img,
                back_img,
                front_img
            ]);

            init_rendering(gltf_json, gltf_buffer, joined);
            state = "show_model"
        } else if (state == "show_model") {

            gl.viewport(0, 0, canvas.width, canvas.height);
            let aspect = canvas.height / canvas.width;
            gl.clearColor(
                0.5 + 0.1 * Math.sin(2 * Math.PI * periodic_time * 0.1),
                0.5 + 0.1 * Math.sin(2 * Math.PI * periodic_time * 0.1),
                0.5 + 0.1 * Math.sin(2 * Math.PI * periodic_time * 0.1),
                1.0);

            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.clear(gl.DEPTH_BUFFER_BIT);

            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LESS);
            gl.depthRange(0, 1);

            gl.bindVertexArray(shoe_vao);
            gl.useProgram(shoe_shader);

            let uni_trans = gl.getUniformLocation(shoe_shader, "trans");

            let cos = Math.cos;
            let sin = Math.sin;

            let angle = 0.2 * tt;

            let X = [cos(angle), 0, sin(angle)];
            let Y = [0, 1, 0];
            let Z = [-sin(angle), 0, cos(angle)];


            for (let i =0; i < 3; ++i) {
                X[i] *= 4;
                Y[i] *= 4;
                Z[i] *= 4;
            }


            let trans = new Float32Array([
                X[0], X[1], X[2], 0,
                Y[0], Y[1], Y[2], 0,
                Z[0], Z[1], Z[2], 0,
                0, 0, 0, 1,
            ]);

            trans[0 * 4 + 0] *= aspect;
            trans[1 * 4 + 0] *= aspect;
            trans[2 * 4 + 0] *= aspect;
            trans[3 * 4 + 0] *= aspect;

            gl.uniformMatrix4fv(uni_trans, false, trans);

            gl.drawElements(gl.TRIANGLES, shoe_model.elements.length, gl.UNSIGNED_INT, 0);
        }
    }, 1);
};
