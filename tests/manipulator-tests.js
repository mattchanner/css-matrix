test("transforms - initially 0 for all variables", function () {
    var trans = new Transform();
    equal(trans.details().rotation,   0, "Rotation is 0 by default");
    equal(trans.details().transform.x, 0, "Trans X is 0 by default");
    equal(trans.details().transform.x, 0, "Trans Y is 0 by default");
    equal(trans.details().scale,     1, "Scale is 1 by default");
});

test("transfroms - rotate tests - clockwise", function () {
    var trans = new Transform();
    trans.rotate({clockwise: true});
    equal(trans.details().rotation, 90, "Rotation is 90 degrees after a single rotation");

    trans.rotate({clockwise: true});
    equal(trans.details().rotation, 180, "Rotation is 180 degrees after a second rotation");

    trans.rotate({clockwise: true});
    equal(trans.details().rotation, 270, "Rotation is 270 degrees after a third rotation");

    trans.rotate({clockwise: true});
    equal(trans.details().rotation, 360, "Rotation is 0 degrees after a fourth rotation");
});

test("transfroms - rotate tests - anti-clockwise", function () {
    var trans = new Transform();
    trans.rotate({clockwise: false});
    equal(trans.details().rotation, -90, "Rotation is 270 degrees after a single rotation");

    trans.rotate({clockwise: false});
    equal(trans.details().rotation, -180, "Rotation is 180 degrees after a second rotation");

    trans.rotate({clockwise: false});
    equal(trans.details().rotation, -270, "Rotation is 90 degrees after a third rotation");

    trans.rotate({clockwise: false});
    equal(trans.details().rotation, -360, "Rotation is 0 degrees after a fourth rotation");
});

test("transforms - zoom", function () {

    var trans = new Transform();
    equal(trans.details().scale, 1, "Scale is initially 1");

    trans.zoomIn();
    ok(trans.details().scale > 1, "Scale is > 1 when zoomed in");

    trans.zoomOut();
    equal(trans.details().scale, 1, "Scale is reset to 1 when zoomed out again");

    trans.zoomOut();
    ok(trans.details().scale < 1, "Scale is < 1 when zoomed");
});

test("transforms - moving", function () {
    var trans = new Transform();
    equal(trans.details().transform.x, 0, "No x transform present when first constructed");
    equal(trans.details().transform.y, 0, "No y transform present when first constructed");

    trans.up();
    ok(trans.details().transform.y < 0, "Y position is negative after moving up");
    equal(trans.details().transform.x, 0, "X position is 0 after moving up");

    trans.reset();
    trans.down();
    ok(trans.details().transform.y > 0, "Y position is positive after moving down");
    equal(trans.details().transform.x, 0, "X position is 0 after moving down");

    trans.reset();
    trans.left();
    ok(trans.details().transform.x < 0, "X position is less than 0 when moving left");
    equal(trans.details().transform.y, 0, "Y position is 0 when moving left");

    trans.reset();
    trans.right();
    ok(trans.details().transform.x > 0, "X position is greater than 0 when moving right");
    equal(trans.details().transform.y, 0, "Y position is 0 when moving right");
});

test("transforms - event emitter", function () {
    var trans = new Transform(),
        called = false;

    trans.bind("click", function (a, b) {
        equal(a, 1, "First argument is set correctly when sent to the handler");
        equal(b, 2, "Second argument is set correctly when sent to the handler");
        called = true;
    });

    trans.trigger("click", 1, 2);
    ok(called, "Handler is called when event is triggered");
});

test("transforms - rotation fires change event", function () {
    var trans = new Transform(),
        changeFired = false;

    trans.bind("change", function () {
        changeFired = true;
    });

    trans.rotate();

    ok(changeFired, "Change event is fired when a rotation is made");
});

test("matrix - initial", function () {
    var trans = new Transform();

    var m = trans.matrix();
    equal(m.a(), 1, "Initial (identity) matrix: a = 1");
    equal(m.b(), 0, "Initial (identity) matrix: b = 0");
    equal(m.c(), 0, "Initial (identity) matrix: c = 0");
    equal(m.d(), 1, "Initial (identity) matrix: d = 1");
    equal(m.tx(), 0, "Initial (identity) matrix: tx = 0");
    equal(m.ty(), 0, "Initial (identity) matrix: ty = 0");
});

test("matrix - moving", function () {
    var trans = new Transform();

    trans.up();
    trans.right();

    var m = trans.matrix();
    ok(m.tx() !== 0, "tx <> 0 when move right called");
    ok(m.ty() !== 0, "ty <> 0 when move up called");
});
