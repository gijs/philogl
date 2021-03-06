//o3d.js
//Scene Objects

(function () {
  //Define some locals
  var Vec3 = PhiloGL.Vec3,
      Mat4 = PhiloGL.Mat4;
      cos = Math.cos,
      sin = Math.sin,
      pi = Math.PI,
      max = Math.max,
      flatten = function(arr) {
        if (arr && arr.length && $.type(arr[0]) == 'array') 
          return [].concat.apply([], arr);
        return arr;
      };
  
  //Model repository
  var O3D = {};

  //Model abstract O3D Class
  O3D.Model = function(opt) {
    this.$$family = 'model';

    this.vertices = flatten(opt.vertices);
    this.faces = flatten(opt.faces);
    this.normals = flatten(opt.normals);
    this.textures = opt.textures && $.splat(opt.textures);
    this.centroids = flatten(opt.centroids);
    this.colors = flatten(opt.colors);
    this.indices = flatten(opt.indices);
    this.shininess = opt.shininess || 0;
    this.uniforms = opt.uniforms || {};
    this.render = opt.render;
    this.drawType = opt.drawType;
    if (opt.texCoords) {
      this.texCoords = $.type(opt.texCoords) == 'object'? opt.texCoords : flatten(opt.texCoords);
    }
    this.onBeforeRender = opt.onBeforeRender || $.empty;
    this.onAfterRender = opt.onAfterRender || $.empty;

    this.position = new Vec3;
    this.rotation = new Vec3;
    this.scale = new Vec3(1, 1, 1);
    this.matrix = new Mat4;
    
    //Set a color per vertex if this is not the case
    this.normalizeColors();

    if (opt.computeCentroids) {
      this.computeCentroids();
    }
    if (opt.computeNormals) {
      this.computeNormals();
    }
  
  };

  //Shader setter mixin
  var setters = {
    
    setUniforms: function(program) {
      program.setUniforms(this.uniforms);
    },
    
    setShininess: function(program) {
      program.setUniform('shininess', this.shininess || 0);
    },
    
    setVertices: function(program, force) {
      if (!this.vertices) return;

      if (force || this.dynamic) {
        program.setBuffer('vertices-' + this.id, {
          attribute: 'position',
          value: this.toFloat32Array('vertices'),
          size: 3
        });
      } else {
        program.setBuffer('vertices-' + this.id);
      }
    },
    
    setNormals: function(program, force) {
      if (!this.normals) return;

      if (force || this.dynamic) {
        program.setBuffer('normals-' + this.id, {
          attribute: 'normal',
          value: this.toFloat32Array('normals'),
          size: 3
        });
      } else {
        program.setBuffer('normals-' + this.id);
      }
    },

    setIndices: function(program, force) {
      if (!this.indices) return;

      if (force || this.dynamic) {
        program.setBuffer('indices-' + this.id, {
          bufferType: gl.ELEMENT_ARRAY_BUFFER,
          drawType: gl.STATIC_DRAW,
          value: this.toUint16Array('indices'),
          size: 1
        });
      } else {
        program.setBuffer('indices-' + this.id);
      }
    },

   setColors: function(program, force) {
      if (!this.colors) return;

      if (force || this.dynamic) {
        program.setBuffer('colors-' + this.id, {
          attribute: 'color',
          value: this.toFloat32Array('colors'),
          size: 4
        });
      } else {
        program.setBuffer('colors-' + this.id);
      }
    },

    setTexCoords: function(program, force) {
      if (!this.texCoords) return;

      var id = this.id;

      if (force || this.dynamic) {
        //If is an object containing textureName -> textureCoordArray
        //Set all textures, samplers and textureCoords.
        if ($.type(this.texCoords) == 'object') {
          this.textures.forEach(function(tex, i) {
            program.setBuffer('texCoords-' + i + '-' + id, {
              attribute: 'texCoord' + (i + 1),
              value: new Float32Array(this.texCoords[tex]),
              size: 2
            });
          });
        //An array of textureCoordinates
        } else {
          program.setBuffer('texCoords-' + id, {
            attribute: 'texCoord1',
            value: this.toFloat32Array('texCoords'),
            size: 2
          });
        }
      } else {
        if ($.type(this.texCoords) == 'object') {
          this.textures.forEach(function(tex, i) {
            program.setBuffer('texCoords-' + i + '-' + id);
          });
        } else {
          program.setBuffer('texCoords-' + id);
        }
      }
    },

    setTextures: function(program, force) {
      this.textures = this.textures? $.splat(this.textures) : [];
      for (var i = 0, texs = this.textures, l = texs.length; i < PhiloGL.Scene.MAX_TEXTURES; i++) {
        if (i < l) {
          program.setUniform('hasTexture' + (i + 1), true);
          program.setUniform('sampler' + (i + 1), i);
          program.setTexture(texs[i], gl['TEXTURE' + i]);
        } else {
          program.setUniform('hasTexture' + (i + 1), false);
        }
      }
    }
 };


  O3D.Model.prototype = {
    
    update: function() {
      var matrix = this.matrix,
          pos = this.position,
          rot = this.rotation,
          scale = this.scale;

      matrix.id();
      matrix.$translate(pos.x, pos.y, pos.z);
      matrix.$rotateXYZ(rot.x, rot.y, rot.z);
      matrix.$scale(scale.x, scale.y, scale.z);
    },

    toFloat32Array: function(name) {
      return new Float32Array(this[name]);
    },

    toUint16Array: function(name) {
      return new Uint16Array(this[name]);
    },
    
    normalizeColors: function() {
      if (!this.vertices) return;

      var lv = this.vertices.length * 4 / 3;
      if (this.colors && this.colors.length < lv) {
        var times = lv / this.colors.length,
            colors = this.colors,
            colorsCopy = colors.slice();
        while (--times) {
          colors.push.apply(colors, colorsCopy);
        }
      }
    },
 
    computeCentroids: function() {
      var faces = this.faces,
          vertices = this.vertices,
          centroids = [];

      faces.forEach(function(face) {
        var centroid = [0, 0, 0],
            acum = 0;
        
        face.forEach(function(idx) {
          var vertex = vertices[idx];
          
          centroid[0] += vertex[0];
          centroid[1] += vertex[1];
          centroid[2] += vertex[2];
          acum++;
        
        });

        centroid[0] /= acum;
        centroid[1] /= acum;
        centroid[2] /= acum;

        centroids.push(centroid);
      
      });

      this.centroids = centroids;
    },

    computeNormals: function() {
      var faces = this.faces,
          vertices = this.vertices,
          normals = [];

      faces.forEach(function(face) {
        var v1 = vertices[face[0]],
            v2 = vertices[face[1]],
            v3 = vertices[face[2]],
            dir1 = {
              x: v3[0] - v2[0],
              y: v3[1] - v2[1],
              z: v3[1] - v2[2]
            },
            dir2 = {
              x: v1[0] - v2[0],
              y: v1[1] - v2[1],
              z: v1[2] - v2[2]
            };

        Vec3.$cross(dir2, dir1);
        
        if (Vec3.norm(dir2) > 1e-6) {
          Vec3.unit(dir2);
        }
        
        normals.push([dir2.x, dir2.y, dir2.z]);
      
      });

      this.normals = normals;
    }

  };
  
  //Apply our setters mixin
  $.extend(O3D.Model.prototype, setters);
/*
  //O3D.Group will group O3D elements into one group
  O3D.Group = function(opt) {
    O3D.Model.call(this, opt);
    this.models = [];
  };

  O3D.Group.prototype = Object.create(O3D.Model.prototype, {
    //Add model(s)
    add: {
      value: function() {
        this.models.push.apply(this.models, Array.prototype.slice.call(arguments));
      }
    },
    updateProperties: {
      value: function(propertyNames) {
        var vertices = [],
            normals = [],
            colors = [],
            texCoords = [],
            textures = [],
            indices = [],
            lastIndex = 0,

            doVertices = 'vertices' in propertyNames,
            doNormals = 'normals' in propertyNames,
            doColors = 'colors' in propertyNames,
            doTexCoords = 'texCoords' in propertyNames,
            doTextures = 'textures' in propertyNames,
            doIndices = 'indices' in propertyNames,

            view = new PhiloGL.Mat4;

        for (var i = 0, models = this.models, l = models.length; i < l; i++) {
          var model = models[i];
          //transform vertices and transform normals
          vertices.push.apply(vertices, model.vertices || []);
          normals.push.apply(normals, model.normals || []);

          texCoords.push.apply(texCoords, model.texCoords || []);
          textures.push.apply(textures, model.textures || []);
          colors.push.apply(colors, model.colors || []);
          //Update indices
          (function(model, lastIndex) {
            indices.push.apply(indices, (model.indices || []).map(function(n) { return n + lastIndex; }));
          })(model, lastIndex);
          lastIndex = Math.max.apply(Math, indices) +1;
        }

        this.vertices = !!vertices.length && vertices;
        this.normals = !!normals.length && normals;
        this.texCoords = !!texCoords.length && texCoords;
        this.textures = !!textures.length && textures;
        this.colors = !!colors.length && colors;
        this.indices = !!indices.length && indices;
      }
    }
});    
*/
  //Now some primitives, Cube, Sphere
  //Cube
  O3D.Cube = function(config) {
    O3D.Model.call(this, $.extend({
      vertices: [-1, -1,  1,
                 1, -1,  1,
                 1,  1,  1,
                -1,  1,  1,

                -1, -1, -1,
                -1,  1, -1,
                 1,  1, -1,
                 1, -1, -1,

                -1,  1, -1,
                -1,  1,  1,
                 1,  1,  1,
                 1,  1, -1,

                -1, -1, -1,
                 1, -1, -1,
                 1, -1,  1,
                -1, -1,  1,

                 1, -1, -1,
                 1,  1, -1,
                 1,  1,  1,
                 1, -1,  1,

                -1, -1, -1,
                -1, -1,  1,
                -1,  1,  1,
                -1,  1, -1],

      texCoords: [0.0, 0.0,
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
                  0.0, 1.0],

      normals: [
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
      ],
      
      indices: [0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                8, 9, 10, 8, 10, 11,
                12, 13, 14, 12, 14, 15,
                16, 17, 18, 16, 18, 19,
                20, 21, 22, 20, 22, 23]

    }, config || {}));
  };

  O3D.Cube.prototype = Object.create(O3D.Model.prototype);
  
  O3D.Sphere = function(opt) {
       var nlat = opt.nlat || 10,
           nlong = opt.nlong || 10,
           radius = opt.radius || 1,
           startLat = 0,
           endLat = pi,
           latRange = endLat - startLat,
           startLong = 0,
           endLong = 2 * pi,
           longRange = endLong - startLong,
           numVertices = (nlat + 1) * (nlong + 1),
           vertices = [],
           normals = [],
           texCoords = [],
           indices = [];

      if (typeof radius == 'number') {
        var value = radius;
        radius = function(n1, n2, n3, u, v) {
          return value;
        };
      }
      //Create vertices, normals and texCoords
      for (var y = 0; y <= nlong; y++) {
        for (var x = 0; x <= nlat; x++) {
          var u = x / nlat,
              v = y / nlong,
              theta = longRange * u,
              phi = latRange * v,
              sinTheta = sin(theta),
              cosTheta = cos(theta),
              sinPhi = sin(phi),
              cosPhi = cos(phi),
              ux = cosTheta * sinPhi,
              uy = cosPhi,
              uz = sinTheta * sinPhi,
              r = radius(ux, uy, uz, u, v);

          vertices.push(r * ux, r * uy, r * uz);
          normals.push(ux, uy, uz);
          texCoords.push(u, v);
        }
      }

      //Create indices
      var numVertsAround = nlat + 1;
      for (x = 0; x < nlat; x++) {
        for (y = 0; y < nlong; y++) {
          
          indices.push(y * numVertsAround + x,
                      y * numVertsAround + x + 1,
                      (y + 1) * numVertsAround + x);

          indices.push((y + 1) * numVertsAround + x,
                       y * numVertsAround + x + 1,
                      (y + 1) * numVertsAround + x + 1);
        }
      }

      O3D.Model.call(this, $.extend({
        vertices: vertices,
        indices: indices,
        normals: normals,
        texCoords: texCoords
      }, opt || {}));
  };

  O3D.Sphere.prototype = Object.create(O3D.Model.prototype);

  //Assign to namespace
  PhiloGL.O3D = O3D;
})();
