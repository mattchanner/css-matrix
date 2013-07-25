(function (global) {

    /**
     * Provides basic funtionality for subscribing, unsubscribing and
     * publishing events
     */
    var EventEmitter = (function () {
        var events = {},
            slice = Array.prototype.slice;

        return {

            // Subscribes handler to event with name
            bind: function (name, handler) {
                var handlers;

                if (events[name]) {
                    handlers = events[name];
                } else {
                    handlers = [];
                    events[name] = handlers;
                }

                handlers.push(handler);
            },

            // Triggers the event to each subscriber
            trigger: function (name) {
                var handlers,
                    args = slice.call(arguments, 1, arguments.length);

                if (events[name]) {
                    handlers = events[name];

                    for (var index = 0; index < handlers.length; index++) {
                        handlers[index].apply(handlers, args);
                    }
                }
            },

            unbind: function (name, handler) {
                var handlers;

                if (events[name]) {
                    handlers = events[name];

                    for (var index = handlers.length; index > 0; index--) {
                        if (handlers[index] === handler) {
                            handlers = handlers.splice(index, 1);
                        }
                    }
                }
            }
        };
    });

    /*
     * Constructs a new Matrix instance with either a source 2d array (3x3), or
     * 6 individual arguments (a, b, c, d, tx, ty) which form the top 2 rows
     * of the matrix:
     *
     * | a,  c,  tx |
     * | b,  d,  ty |
     * | 0,  0,  1  |
     */
    var Matrix = function (/* arguments */) {
        if (arguments.length === 1 && arguments[0].length) {
            var im = arguments[0];
            this.m = [[im[0][0], im[0][1], im[0][2]],
                      [im[1][0], im[1][1], im[1][2]],
                      [im[2][0], im[2][1], im[2][2]]];
        } else if (arguments.length === 6) {
            this.m = [[arguments[0], arguments[2], arguments[4]],
                      [arguments[1], arguments[3], arguments[5]],
                      [0, 0, 1]];
        }
    };

    Matrix.prototype = {
        constructor: Matrix,
        a: function a () { return this.m[0][0]; },
        b: function b () { return this.m[1][0]; },
        c: function c () { return this.m[0][1]; },
        d: function d () { return this.m[1][1]; },
        tx: function tx () { return this.m[0][2]; },
        ty: function ty () { return this.m[1][2]; },
        height: function height () { return 3; },
        width:  function width () { return 3; },
        mul: function mul (other) {
            var result = [], i, j, k;
            for (i = 0; i < this.height(); i++) {
                result[i] = [];
                for (j = 0; j < other.width(); j++) {
                    var sum = 0;
                    for (k = 0; k < this.width(); k++) {
                        sum += this.m[i][k] * other.m[k][j];
                    }
                    result[i][j] = sum;
                }
            }
            return new Matrix(
                result[0][0],
                result[1][0],
                result[0][1],
                result[1][1],
                result[0][2],
                result[1][2]);
        },
        toString: function () {
            return "matrix(" + this.a() + ", " + this.b() + ", " +
                    this.c() + ", " + this.d() + ", " + Math.floor(this.tx()) + ", " +
                    Math.floor(this.ty()) + ")";
        }
    };

    Matrix.identity = function () {
        return new Matrix(1, 0, 0, 1, 0, 0);
    };

    Matrix.rotate = function (degrees) {
        var radians = degrees * Math.PI / 180,
            a = Math.cos(radians).toFixed(5),
            b = Math.sin(radians).toFixed(5),
            c = -b,
            d = a;

        return new Matrix(a, b, c, d, 0, 0);
    };

    Matrix.translate = function (tx, ty) {
        return new Matrix(1, 0, 0, 1, tx, ty);
    };

    Matrix.scale = function (s) {
        return new Matrix(s, 0, 0, s, 0, 0);
    };

    var Transform = (function () {

        var rotations = {
            0:   [90,  270, Matrix.rotate0],
            90:  [180, 360, Matrix.rotate90],
            180: [270, 90,  Matrix.rotate180],
            270: [360, 180, Matrix.rotate270],
            360: [90,  270, Matrix.rotate0]
        };

        var floating = "(\\-?[\\d\\.e]+)";
        var commaSpace = "\\,?\\s*";
        var rmatrix = new RegExp(
            "^matrix\\(" +
            floating + commaSpace +
            floating + commaSpace +
            floating + commaSpace +
            floating + commaSpace +
            floating + commaSpace +
            floating + "\\)$"
        );

        var rotation = 0,
            transX = 0,
            transY = 0,
            scale = 1,
            scaleIncrement = 1.2,
            transformIncrement = 100,
            minScale = 0.4,
            maxScale = 5,
            selector = "";

        if (arguments.length === 1) {
            var options = arguments[0];

            selector = options.selector || selector;
            transX   = options.transX || transX;
            transY   = options.transY || transY;
            scale    = options.scale || scale;
            rotation = options.rotation || rotation;
            transformIncrement = options.transformIncrement || transformIncrement;
        }

        var my = new EventEmitter ();

        var isDefined = function (what) {
            return what == 'undefined';
        };

        var isUndefined = function (what) {
            return !isDefined(what);
        };

        var clamp = function clamp (min, value, max) {
            return value < min ? min : value > max ? max : value;
        };

        var inferRotation = function (matrix, scale) {
            if (matrix[0] === scale && matrix[1] === 0 && matrix[2] === 0 && matrix[3] === scale) {
                return 0;
            } else if (matrix[0] === 0 && matrix[1] === scale && matrix[2] === -(scale) && matrix[3] === 0) {
                return 90;
            } else if (matrix[0] === -(scale) && matrix[1] === 0 && matrix[2] === 0 && matrix[3] === -(scale)) {
                return 180;
            } else if (matrix[0] === 0 && matrix[1] === -(scale) && matrix[2] === scale && matrix[3] === 0) {
                return 270;
            } else {
                return 0;
            }
        };

        var parseTransform = function parseTransform (str) {
            var matrix, scale, transX, transY, rotation, i;

            matrix = rmatrix.exec(str);

            if (matrix) {
                // strip regex to contain only arguments
                matrix.shift();

                // convert strings to floats for better equality
                // tests
                for (i = 0; i < matrix.length; i++) {
                    try {
                        matrix[i] = parseFloat(matrix[i]);
                    } catch (e) {
                        console.error(e);
                    }
                }
            } else {
                // identity matrix
                matrix = [ 1, 0, 0, 1, 0, 0 ];
            }

            // as the rotation matrix is expected to be one of 4
            // possible scenarios, the scale can be inferred as either
            // the first or second value (made absolute in case of negatives)
            scale = Math.abs(matrix[0] || matrix[1]) || 1;

            // Apply scale back to tx and ty in order to get the non scaled
            // values to use as the source
            transX = Math.floor(matrix[4] / scale);
            transY = Math.floor(matrix[5] / scale);

            // Determine the degree of rotation based on the "shape" of the
            // matrix
            rotation = inferRotation(matrix, scale);

            return {
                scale: scale,
                rotation: rotation,
                transX: transX,
                transY: transY
            };
        };

        // Reads the current transform from the dom element and updates
        // the local variables to reflect this.  Needed for the case where
        // the element has been modified outside of this instance, in order
        // for any changes to be made here to apply to what is really present
        // in the dom rather than what this instance thinks is there.
        var updateState = function updateState () {
            if (selector) {
                var elem = document.querySelector(selector),
                    state = parseTransform(elem.style.webkitTransform ||
                                           elem.style.mozTransform ||
                                           elem.style.MsTransform ||
                                           elem.style.transform);

                transX = state.transX;
                transY = state.transY;
                scale = state.scale;
                rotation = state.rotation;
            }
        };

        my.rotate = function rotate (options) {            
            updateState();

            var clockwise = options && options.clockwise;

            rotation += (clockwise ? 90 : -90);

            this.trigger("change");
        };

        my.zoomOut = function _zoomOut () {
            updateState();
            scale = clamp(minScale, scale / scaleIncrement, maxScale);
            this.trigger("change");
        };

        my.zoomIn = function _zoomIn () {
            updateState();
            scale = clamp(minScale, scale * scaleIncrement, maxScale);
            this.trigger("change");
        };

        my.zoom = function (percent) {
            updateState();
            scale = clamp(minScale, percent, maxScale);
            this.trigger("change");
        };

        my.up = function _up () {
            updateState();
            transY -= transformIncrement;
            this.trigger("change");
        };

        my.down = function _down () {
            updateState();
            transY += transformIncrement;
            this.trigger("change");
        };

        my.left = function _left () {
            updateState();
            transX -= transformIncrement;
            this.trigger("change");
        };

        my.right = function _right () {
            updateState();
            transX += transformIncrement;
            this.trigger("change");
        };

        my.details = function () {
            return {
                scale: scale,
                transform: {x: transX, y: transY},
                rotation: rotation
            };
        };

        my.matrix = function matrix () {

            var m = Matrix.identity()
                        .mul(Matrix.scale(scale))
                        .mul(Matrix.translate(transX, transY))
                        .mul(Matrix.rotate(rotation));

            return m;
        };

        my.reset = function () {
            scale = 1;
            transX = 0;
            transY = 0;
            rotation = 0;
            this.trigger("change");
        };

        my.toCss = function _toCss () {
            return  my.matrix().toString();
        };

        my.toString = function () {
            return "rotation: " + rotation +
                   ", scale: " + scale +
                   ", translate: (" + transX + "," + transY + ")";
        };

        return my;
    });

    global.Transform = Transform;
    global._Matrix = Matrix;

})(this);
