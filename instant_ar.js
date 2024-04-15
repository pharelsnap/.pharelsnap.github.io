let S = {
  image_pool: {}
};

let main_div = undefined;

function put_image(key, src) {
  let image = new Image();

  image.style.pointerEvents = 'none';
  image.style.userSelect = "none";        // Standard
  image.style.webkitUserSelect = "none";  // Safari/Chrome
  image.style.mozUserSelect = "none";     // Firefox
  image.style.msUserSelect = "none";      // IE/Edge

  image.onload = function() {
    S[key] = image;
    image.original_width  = image.width;
    image.original_height = image.height;
  }
  image.src = src;
}

function clone_image(image) {
  let cloned = image.cloneNode();
  cloned.style.pointerEvents = 'none';
  cloned.style.userSelect = "none";        // Standard
  cloned.style.webkitUserSelect = "none";  // Safari/Chrome
  cloned.style.mozUserSelect = "none";     // Firefox
  cloned.style.msUserSelect = "none";      // IE/Edge
  return cloned;
}

window.onload = function() {

  main_div = document.createElement('div');
  main_div.style.width = '100vw';
  main_div.style.height = '100vh';
  main_div.style.position = 'absolute';
  main_div.style.background = 'lightyellow';
  main_div.style.top = 0;
  main_div.style.left = 0;
  document.body.appendChild(main_div);

  img_resources = [
    ['person_image0' , 'resources/person.webp'],
    ['person_image2' , 'resources/person_mouth.webp'],
    ['eyebrows_icon' , 'resources/icon_brows.webp'],
    ['mouth_icon'    , 'resources/icon_mouth.webp'],
    ['regular_icon'  , 'resources/icon_regular.webp'],
    ['title'         , 'resources/label.webp'],
    ['create_icon'   , 'resources/button_create-lens.webp'],
    ['close_icon'    , 'resources/close-button-png-30225.webp'],
  ];

  img_resources.forEach(function(x) {
    put_image(x[0], x[1]);
  });

  window.addEventListener("dragenter", function(e) {
    e.preventDefault();

    I.drag_event_queue.push({
      type: "drag_enter"
    });
  }, false);
  
  window.addEventListener("dragover", function(e) {
    e.preventDefault();

    I.drag_event_queue.push({
      type: "drag_over"
    });

    I.mouse_event_queue.push({
      type: 'move',
      x: e.clientX,
      y: e.clientY
    });
  });

  window.addEventListener("dragleave", function(e) {
    e.preventDefault();
    I.drag_event_queue.push({
      type: "drag_leave"
    });
  });
  
  window.addEventListener("drop", function(e) {
    e.preventDefault();
    e.dataTransfer.effectAllowed = "none";
    e.dataTransfer.dropEffect = "none";



    let file = undefined;
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; ++i) {
        let curr_item = e.dataTransfer.items[i];
        let curr_file = curr_item.getAsFile();
        if (curr_file.type.startsWith('image/')) {
          file = curr_file;
        }
      }
    }

    I.drag_event_queue.push({
      type: "drag_drop",
      file: file
    });
  });

 
};

I = {
  mouse_event_queue: [],
  drag_event_queue: [],
  is_lmouse_down: false,
  is_rmouse_down: false,
  is_lmouse_pressed: false,
  is_rmouse_pressed: false,
  is_lmouse_released: false,
  is_rmouse_released: false,


  drag_enter_count: 0,
  drag_leave_count: 0,
  is_dragging: false,
  

  mpos        : { x: 0, y: 0 },
  lpress_mpos : { x: 0, y: 0 },
}

function read_input() {
  let wd = window_dims();

  I.is_lmouse_pressed  = false;
  I.is_rmouse_pressed  = false;
  I.is_lmouse_released = false;
  I.is_rmouse_released = false;

  I.mouse_event_queue.forEach(function(me, i) {
    if (false) {
    } else if (me.type === 'move') {
      I.mpos = {
        x: me.x / wd.w,
        y: me.y / wd.h
      };
    } else if (me.type === 'mouse_down') {
      if (me.button == 0) {
        if (!I.is_lmouse_down) {
          I.is_lmouse_pressed = true;
          I.lpress_mpos = I.mpos;
          I.is_lmouse_down = true;
        }
        I.is_lmouse_released = false;
      }
    } else if (me.type === 'mouse_up') {
      if (me.button == 0) {
        if (I.is_lmouse_down) {
          I.is_lmouse_down = false;
          I.is_lmouse_released = true;
        }
        I.is_lmouse_pressed = false;
      }
    }
  });


  I.was_drag_dropped = false;
  I.dragged_file = undefined;
  I.drag_event_queue.forEach(function(de, i) {
    if (false) {
    } else if(de.type === "drag_over") {
    } else if(de.type === "drag_enter") {
      I.drag_enter_count += 1;
    } else if (de.type === "drag_leave") {
      I.drag_leave_count += 1;
    } else if (de.type === "drag_drop") {
      I.is_dragging = false;
      I.was_drag_dropped = true;
      I.dragged_file = de.file;
    }
  });

  I.is_dragging = I.drag_enter_count > I.drag_leave_count;
  I.is_dragging &= !I.was_drag_dropped;

  if (!I.is_dragging) {
    I.drag_enter_count = 0;
    I.drag_leave_count = 0;
  }

  I.mouse_event_queue.length = 0;
  I.drag_event_queue.length  = 0;
}

UI = {
  buttons   : [],
  drag_intos: []
};

function reset_ui() {
  UI.buttons.length    = 0;
  UI.drag_intos.length = 0;
}

function update_ui() {
  UI.buttons.forEach(function(btn) {
  });
};


function is_in_rect(pos, rect) {
  let is_in = true;
  is_in &= rect.x <= pos.x;
  is_in &= pos.x  <= rect.x + rect.w;

  is_in &= rect.y <= pos.y;
  is_in &= pos.y  <= rect.y + rect.h;

  return is_in;
}

function button(icon, btn_rect, is_enabled) {

  let res = false;
  let btn = {
    rect: btn_rect,
    is_hovered: false,
    is_pressed: false,
    is_enabled: is_enabled,
    icon: icon
  };

  let is_pressed = false;

  if (is_enabled) {
    if (!I.is_lmouse_down) {
      btn.is_hovered = is_in_rect(I.mpos, btn_rect);
    }

    
    is_pressed = true;
    is_pressed &= is_in_rect(I.lpress_mpos, btn_rect);
    is_pressed &= is_in_rect(I.mpos, btn_rect);

    if (I.is_lmouse_down && is_pressed) {
      btn.is_pressed = true;
    }
  }

  UI.buttons.push(btn);

  return is_pressed && I.is_lmouse_released;
}

function drag_into(d_rect) {
  let res = {
    was_dragged: false,
    dragged_file: undefined
  };

  let drg = {
    rect: d_rect,
    is_drag_potential: I.is_dragging,
    is_hovered: false
  };

  if (drg.is_drag_potential) {
    drg.is_hovered = is_in_rect(I.mpos, d_rect);
  }

  if (I.was_drag_dropped) {
    if (is_in_rect(I.mpos, d_rect)) {
      res.was_dragged = true;
      res.dragged_file = I.dragged_file;
    }
  }


  UI.drag_intos.push(drg);

  return res;
}


// Encodes in pixexl (x, y) and (x + 1, y)
// Alpha value must be 255 because of Canvas behaviour
function encode_num(ctx, num, x, y) {
  let d0 = ctx.createImageData(1, 1);
  let d1 = ctx.createImageData(1, 1);
  d0.data[3] = 255;
  d1.data[3] = 255;
  for (let i = 0; i < 3; ++i) {
    d0.data[i] = (num >> (i * 8)) & 0xFF;
  }
  d1.data[0] = (num >> (3 * 8)) & 0xFF;

  ctx.putImageData(d0, x + 0, y);
  ctx.putImageData(d1, x + 1, y);

}

function update() {
  reset_ui();

  if (S.download_img) {

    return;
  }
  if (!S.person_image0) {
    return;
  }

  if (!S.selected_person) {
    S.selected_person = S.person_image0;
    S.i_selected_person = 0;
  }

  let wa = window_aspect();

  let img_size = img_size_from_height(S.person_image0, 0.85);
  let img_pos = [
    0.5 - img_size[0] * 0.5,
    0.5 - img_size[1] * 0.5];
  S.person_image_rect = rect(img_pos, img_size);

  // These are relative to the image
  // x, //y // size
  S.drag_positions = [
    [0.35, 0.05, 0.18],
    [0.18, 0.31 , 0.08],
    [0.69, 0.32, 0.08],

    [0.365, 0.285 , 0.06],
    [0.549, 0.29 , 0.06],

    [0.433, 0.41 , 0.08],

  ];

  S.drag_rects = [];
  S.drag_positions.forEach(function(pos, i_pos) {
    let pos_in_img = [
      img_pos[0] + pos[0] * img_size[0],
      img_pos[1] + pos[1] * img_size[1],
    ];

    let i_selected_person = S.i_selected_person;
    let img_name = `img_${i_selected_person}_${i_pos}`;


    let drag_rect = rect(
      pos_in_img,
      square_size(pos[2] * img_size[1]));

    let drag_res = drag_into(drag_rect);
    if (drag_res.was_dragged) {
      let reader = new FileReader();
      reader.onload = function(e) {
        put_image(img_name, e.target.result);
      };
      reader.readAsDataURL(drag_res.dragged_file);
    }

    S.drag_rects.push(drag_rect);

    if (S[img_name]) {
      let button_rect_dims = [drag_rect.w * 0.25, drag_rect.h * 0.25];
      let button_rect_pos  = [
        drag_rect.x + drag_rect.w - button_rect_dims[0],
        drag_rect.y,
      ];

      if (button("close_icon", rect(button_rect_pos, button_rect_dims), true)) {
        S[img_name] = undefined;
      }
    }

  });
  // Draggables

  let btn_size = square_size(S.person_image_rect.h * 0.08);
  let btn_pos  = [
   S.person_image_rect.x + btn_size[0] * 0.1,
   S.person_image_rect.y + btn_size[1] * 0.1];

  if (button("regular_icon", rect(btn_pos, btn_size), true)) {
    S.selected_person = S.person_image0;
    S.i_selected_person = 0;
  }

  btn_pos[1] += btn_size[1] * 1.1;

  if (button("mouth_icon", rect(btn_pos, btn_size), S.person_image2 !== undefined)) {
    S.selected_person = S.person_image2;
    S.i_selected_person = 2;
  }


  // Draggables

  // Create the lens
  if (S.create_icon) {

    let size = img_size_from_width(S.create_icon, S.person_image_rect.w * 0.52);
    let pos = [0, 0];
    pos[0] = S.person_image_rect.x + 0.5 * S.person_image_rect.w - size[0] * 0.5;
    pos[1] = S.person_image_rect.y + S.person_image_rect.h - size[1] * 1.2;
    if (button('create_icon', rect(pos, size), true)) {
      // Download the images to zip
      window.open("slack://channel?id=C06U4BDG9CN&team=E029WK52KHS");

      let imgs = [];
      for (let i_person = 0; i_person < 3; ++i_person) {
        for (let i_rect = 0; i_rect < 6; ++ i_rect) {
          let img_key = `img_${i_person}_${i_rect}`;
          let img = S[img_key];
          if (img) {
            imgs.push([img_key, img]);
          }
        }
      }

      let canvas = document.createElement('canvas');
      canvas.style.colorRendering = 'exact';
      canvas.style.imageRendering = 'pixelated';

      // The header of the png will be metadata
      // of (i_pos, i_rect, width, height)
      let canvas_width = 8;
      let canvas_height = 1 + imgs.length; // first row is num of images

      imgs.forEach(function(x) {
        let img = x[1];

        canvas_height += img.naturalHeight;
        if (img.naturalWidth > canvas_width) {
          canvas_width = img.naturalWidth;
        }
      });

      canvas.width  = canvas_width;
      canvas.height = canvas_height;
      let ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      ctx.oImageSmoothingEnabled = false;

      let curr_y = 0;

      // put num of images
      {
        encode_num(ctx, imgs.length, 0, curr_y);
        curr_y += 1;
      }

      // Write metadata
      imgs.forEach(function(x) {
        let img_key = x[0];
        let img     = x[1];

        let key_parts = img_key.split("_");

        let i_pos  = parseInt(key_parts[1], 10);
        let i_rect = parseInt(key_parts[2], 10);
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        let nums = [i_pos, i_rect, w, h];

        let curr_x = 0;
        nums.forEach(function(num) {
          encode_num(ctx, num, curr_x, curr_y);
          curr_x += 2;
        });

        curr_y += 1;
      });

      // Write images
      imgs.forEach(function(x) {
        let img = x[1];
        ctx.drawImage(img, 0, curr_y, img.naturalWidth, img.naturalHeight);
        curr_y += img.naturalHeight;
      });


      let data_url = canvas.toDataURL('image/png');
      let downloadLink = document.createElement('a');
      downloadLink.href = data_url;
      downloadLink.download = 'downloaded_image.png';
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }

  update_ui();
}

function window_dims() {
  return {
    w: window.innerWidth,
    h: window.innerHeight
  };
}

function set_div_size_to_rect(div, rect) {
  let wd = window_dims();
  let w = Math.floor(rect.w * wd.w);
  let h = Math.floor(rect.h * wd.h);
  let x = Math.floor(rect.x * wd.w);
  let y = Math.floor(rect.y * wd.h);

  let s = div.style;
  s.position = 'absolute';
  s.left   = x + 'px';
  s.top    = y + 'px';
  s.width  = w + 'px';
  s.height = h + 'px';
}
function rgba2color_str(rgba) {
    // Multiply RGB values by 255 and round them
    const r = Math.round(rgba[0] * 255);
    const g = Math.round(rgba[1] * 255);
    const b = Math.round(rgba[2] * 255);
    const a = rgba[3];

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}


let n_divs = 0;
let divs = [];
function create_div() {
  n_divs += 1;
  if (n_divs > divs.length) {
    divs.push(document.createElement('div'));
    let new_div = divs[n_divs - 1];
    main_div.appendChild(new_div);
  }
  new_div = divs[n_divs - 1];

  // Remove style
  for (let style in new_div.style) {
    if (new_div.style.hasOwnProperty(style)) {
      new_div.style[style] = '';
    }
  }

  // Remove children
  while (new_div.firstChild) {
    new_div.removeChild(new_div.firstChild);
  }


  return new_div;
}

function render_rect(rect, color) {
  let div = create_div();
  set_div_size_to_rect(div, rect);
  div.style.backgroundColor = rgba2color_str(color);
}

function render_image(image, rect) {
  if (!image) {
    return;
  }

  if (!S.image_pool[image.src]) {
    S.image_pool[image.src] = {
      n_used: 0,
      clones: []
    };
  }
  let pool_item = S.image_pool[image.src];

  if (pool_item.n_used == pool_item.clones.length) {
    pool_item.clones.push(clone_image(image));
  }

  let render_image = pool_item.clones[pool_item.n_used++];

  render_image.style.width  = '100%';
  render_image.style.height = '100%';

  let div = create_div();
  div.appendChild(render_image);
  set_div_size_to_rect(div, rect);
}

function clear_screen() {
  divs.forEach(function(div) {
    set_div_size_to_rect(div, rect([-1, -1], [0, 0]));
  });
  n_divs = 0;
}

function window_aspect() {
  let wd = window_dims();
  return wd.h / wd.w;
}

function image_aspect(image) {
  return image.original_height / image.original_width;
}

function rect(pos, size) {
  return {
    x: pos[0],
    y: pos[1],
    w: size[0],
    h: size[1]};
}

function img_size_from_height(image, height) {
  let size = [height / image_aspect(image), height];
  size[0] *= window_aspect();
  return size;
}

function img_size_from_width(image, width) {
  let size = [width, width * image_aspect(image)];
  size[1] /= window_aspect();
  return size;
}


function render_put_here_icon(rect, color) {
  let wd = window_dims();

  let border_radius = Math.floor(rect.w * 0.1 * window_dims().w);
  let border_pixels = 5;
  let div = create_div();
  div.style.border = `${border_pixels}px dashed #000000`;
  div.style.borderRadius = border_radius + 'px';
  div.style.backgroundColor = rgba2color_str(color);

  rect.x -= 2 * (border_pixels / wd.w);
  rect.y -= 2 * (border_pixels / wd.h);
  rect.w +=  2 *  border_pixels / wd.w;
  rect.h +=  2 *  border_pixels / wd.h;
  set_div_size_to_rect(div, rect);
}


function square_size(size) {
  return [size * window_aspect(), size];
}

function rect_pos(rect) {
  return [rect[0], rect[1]];
}
function rect_size(rect) {
  return [rect[2], rect[3]];
}

function render_ui() {
  UI.buttons.forEach(function(btn) {
    if (S[btn.icon]) {
      render_image(S[btn.icon], btn.rect);
    } else {
      render_rect(btn.rect, [0, 0, 0, 0.5]);
    }

    let color = [0.5, 0.5, 0, 0.1];

    if (btn.is_hovered) {
      color = [0.7, 0.5, 0, 0.2];
    }

    if (btn.is_pressed) {
      color = [0.7, 0.1, 0.4, 0.2];
    }

    if (!btn.is_enabled) {
      color = [0.2, 0.2, 0.2, 0.7];
    }
    render_rect(btn.rect, color);
  });


  UI.drag_intos.forEach(function(di) {
    
    let color = [0, 0, 0, 0];
    if (di.is_drag_potential) {
      color = [1, 0.8, 0.2, 0.5];
    }

    if (di.is_hovered) {
      color = [1, 0.3, 0.1, 0.6];
    }
    render_put_here_icon(di.rect, color);
  });
}

function render() {
  Object.keys(S.image_pool).forEach(function(key) {
    S.image_pool[key].n_used = 0;
  });

  clear_screen();
  let wa = window_aspect();

  if (S.person_image0) {
    render_image(S.selected_person, S.person_image_rect);


    if (S.title) {
      let title_size = img_size_from_width(S.title, 1.05 * S.person_image_rect.w);
      render_image(
        S.title,
        rect(
        [(S.person_image_rect.x + 0.5 * S.person_image_rect.w) - title_size[0] * 0.5,
         S.person_image_rect.y - 1.2 * title_size[1]],
        title_size));
    }


    S.drag_rects.forEach(function(d_rect, i_rect) {
      img_key = `img_${S.i_selected_person}_${i_rect}`;
      if (S[img_key]) {
        let img = S[img_key];
        let img_size = [0, 0];

        if (img.original_width >= img.original_height) {
          img_size = img_size_from_width(img, d_rect.w);
        } else {
          img_size = img_size_from_height(img, d_rect.h);
        }

        let img_pos = [
          d_rect.x + 0.5 * d_rect.w - 0.5 * img_size[0],
          d_rect.y + 0.5 * d_rect.h - 0.5 * img_size[1],
        ];

        render_image(S[img_key], rect(img_pos, img_size));
      }
    });
  }

  render_ui();

}


function do_loop() {
  if (!main_div) {
    return;
  }
  set_div_size_to_rect(main_div, rect([0, 0,], [1, 1]));

  read_input();
  update();
  render();
}

window.addEventListener('resize', do_loop);


window.addEventListener('mousedown', function(event) {

  I.mouse_event_queue.push({
    type: 'mouse_down',
    button: event.button
  });
});

window.addEventListener('mouseup', function(event) {
  I.mouse_event_queue.push({
    type: 'mouse_up',
    button: event.button
  });
});



window.addEventListener('mousemove', function(event) {
  I.mouse_event_queue.push({
    type: 'move',
    x: event.clientX,
    y: event.clientY
  });
});

window.addEventListener('blur', function() {
  for (let i = 0; i < 3; ++i) {
    I.mouse_event_queue.push({
      type: 'mouse_up',
      button: i
    });
  }

});

// do loop will be called each frame
function do_loop_each_frame() {
  do_loop();
  requestAnimationFrame(do_loop_each_frame);
}
requestAnimationFrame(do_loop_each_frame);
