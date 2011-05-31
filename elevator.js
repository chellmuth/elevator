function Floor(no) {
    this.no = no;
}

function Frame(elm_id) {
    this.$canvas = $("#" + elm_id);
    this.canvas = document.getElementById(elm_id);

    this.width = this.$canvas.attr("width");
    this.height = this.$canvas.attr("height");
}

function Layout(sizes, frame, elevators, floors) {
    this.sizes = sizes;
    this.frame = frame;
    this.elevators = elevators;
    this.floors = floors;

    this.building_upper_left = {
        x: this.frame.width / 2 - this.sizes.BUILDING_WIDTH / 2,
        y: this.frame.height - this.sizes.BUILDING_HEIGHT
    };

    this.buttons = [];
    _.each(floors, function(floor, i) {
        var up = new ExternalButton(
            floor,
            Elevator.UP,
            this.sizes.BUILDING_WIDTH,
            (floors.length - .75 - i) * this.sizes.FLOOR_HEIGHT
        );

        var down = new ExternalButton(
            floor,
            Elevator.DOWN,
            this.sizes.BUILDING_WIDTH,
            (floors.length - .75 - i) * this.sizes.FLOOR_HEIGHT
        );

        this.buttons.push(up, down);

    }, this);
}

Layout.prototype.floor_to_canvas = function(floor) {
    return this.building_upper_left.y + (this.floors.length - floor + 1) * this.sizes.FLOOR_HEIGHT;
};

Layout.prototype.building_to_canvas = function(point) {
    return {
        x: point.x + this.building_upper_left.x,
        y: point.y + this.building_upper_left.y
    };
};

Layout.prototype.canvas_to_building = function(point) {
    return {
        x: point.x - this.building_upper_left.x,
        y: point.y - this.building_upper_left.y
    };
};

Layout.prototype.find_button = function(floor_no, direction) {
    return this.buttons[(floor_no - 1) * 2 + (direction == Elevator.UP ? 0 : 1)];
};

Layout.prototype.get_button = function(point) {
    var buildingCoords = this.canvas_to_building(point);

    return _.detect(this.buttons, function(button) {
        return button.x <= buildingCoords.x
            && (button.x + button.width) >= buildingCoords.x
            && button.y <= buildingCoords.y
            && (button.y + button.height) >= buildingCoords.y;
    });
}

function ExternalButton(floor, direction, x, y) {
    this.floor = floor;
    this.direction = direction;

    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 30;

    this.active = false;

    this.fn = ElevatorController.prototype.call_elevator;
    this.args = [this.floor.no, this.direction];
}

ExternalButton.prototype.draw = function(ctx, layout) {
    var point = layout.building_to_canvas(this);

    if (this.direction == Elevator.UP) {
        point.x -= 60;
        point.y += 5;

        draw_up_arrow(ctx, this.active, point.x, point.y, this.width, this.height);
    }
    else { // direction == Elevator.DOWN
        point.x -= 30;
        point.y += 5;

        draw_down_arrow(ctx, this.active, point.x, point.y, this.width, this.height);
    }
}

function Sizes(elev_count, floor_count) {
    this.FLOOR_HEIGHT = 75;
    this.ELEVATOR_HEIGHT = 55;
    this.ELEVATOR_WIDTH = 40;
    this.ELEVATOR_PADDING = 80;
    this.ELEVATOR_GAP = 20;

    this.BUILDING_WIDTH = elev_count * this.ELEVATOR_WIDTH
        + 2 * this.ELEVATOR_PADDING
        + (elev_count - 1) * this.ELEVATOR_GAP;
    this.BUILDING_HEIGHT = floor_count * this.FLOOR_HEIGHT;
}

function draw_up_arrow(ctx, active, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = active
        ? 'rgb(50, 240, 50)'
        : 'rgb(200, 200, 200)'
    ;

    // start at arrow tip, move clockwise
    ctx.beginPath();

    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + 3 / 4 * width, y + height / 2);
    ctx.lineTo(x + 3 / 4 * width, y + height);
    ctx.lineTo(x + 1 / 4 * width, y + height);
    ctx.lineTo(x + 1 / 4 * width, y + height / 2);
    ctx.lineTo(x, y + height / 2);
    ctx.lineTo(x + width / 2, y);

    ctx.fill();
    ctx.stroke();

    ctx.closePath();

    ctx.restore();
}

function draw_down_arrow(ctx, active, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = active
        ? 'rgb(240, 50, 50)'
        : 'rgb(200, 200, 200)'
    ;

    ctx.beginPath();

    ctx.moveTo(x + width / 2, y + height);
    ctx.lineTo(x, y + height / 2);
    ctx.lineTo(x + 1 / 4 * width, y + height / 2);
    ctx.lineTo(x + 1 / 4 * width, y);
    ctx.lineTo(x + 3 / 4 * width, y);
    ctx.lineTo(x + 3 / 4 * width, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width / 2, y + height);

    ctx.fill();
    ctx.stroke();

    ctx.closePath();
}

function ElevatorAnimator(sizes, floors, elevator, col) {
    this.elevator = elevator;
    this.col = col;

    this.sizes = sizes;
    this.floors = floors;
}

ElevatorAnimator.prototype.upper_left = function(layout) {
    var sizes = this.sizes;
    var building_upper_left = layout.building_upper_left;

    return {
        x: building_upper_left.x + sizes.ELEVATOR_PADDING +
            this.col * sizes.ELEVATOR_GAP + this.col * sizes.ELEVATOR_WIDTH,
        y: building_upper_left.y + (this.floors.length - (this.elevator.position - 1)) * sizes.FLOOR_HEIGHT - sizes.ELEVATOR_HEIGHT
    };
};

function draw_elevator_doors(ctx, layout) {
    var sizes = this.sizes;
    var upper_left = this.upper_left(layout);

    ctx.fillRect(
        upper_left.x,
        upper_left.y,
        sizes.ELEVATOR_WIDTH * ((1 - this.elevator.open_amount) / 2),
        sizes.ELEVATOR_HEIGHT
    );

    ctx.fillRect(
        upper_left.x + sizes.ELEVATOR_WIDTH - sizes.ELEVATOR_WIDTH * ((1 - this.elevator.open_amount) / 2),
        upper_left.y,
        sizes.ELEVATOR_WIDTH * ((1 - this.elevator.open_amount) / 2),
        sizes.ELEVATOR_HEIGHT
    );
};

function draw_elevator_carriage(ctx, layout) {
    var sizes = this.sizes;
    var upper_left = this.upper_left(layout);

    ctx.save();
    ctx.fillStyle = 'rgb(200, 200, 200)';
    ctx.fillRect(
        upper_left.x, upper_left.y,
        sizes.ELEVATOR_WIDTH, sizes.ELEVATOR_HEIGHT
    );
    ctx.restore();

    var draw_arrow = function () {};
    if (this.elevator.direction === Elevator.UP) {
        draw_arrow = draw_up_arrow;
    }
    else if (this.elevator.direction === Elevator.DOWN) {
        draw_arrow = draw_down_arrow;
    }

    var width = 10;
    var height = 15;
    var x = upper_left.x + (sizes.ELEVATOR_WIDTH / 2) - (width / 2);
    var y = upper_left.y - height - 2;

    draw_arrow(ctx, true, x, y, width, height);
};

function Renderer(frame, sizes, layout, elevators, floors) {
    this.frame = frame;
    this.sizes = sizes;
    this.layout = layout;

    this.elevators = elevators;
    this.floors = floors;

    this.to_render = [];
}

Renderer.prototype.add_to_render = function(obj) {
    this.to_render.push(obj);
};

Renderer.prototype.render = function() {
    var sizes = this.sizes;

    var ctx = this.frame.canvas.getContext("2d")

    ctx.clearRect(0, 0, this.frame.width, this.frame.height)

    ctx.strokeStyle = "rgb(80, 80, 80)"
    ctx.strokeRect(0, 0, this.frame.width, this.frame.height)

    var building_upper_left = this.layout.building_upper_left;

    ctx.strokeRect(
        building_upper_left.x, building_upper_left.y,
        sizes.BUILDING_WIDTH, sizes.BUILDING_HEIGHT
    );

    // floor lines
    _(this.floors.length - 1).times(function(i) {
        ctx.beginPath();
        ctx.moveTo(building_upper_left.x, building_upper_left.y + (i + 1) * sizes.FLOOR_HEIGHT);
        ctx.lineTo(
            building_upper_left.x + sizes.BUILDING_WIDTH,
            building_upper_left.y + (i + 1) * sizes.FLOOR_HEIGHT
        );
        ctx.stroke();
        ctx.closePath();
    });

    _.each(this.elevators, function(elevator, i) {
        // elevator doors
        _(this.floors.length).times(function(floor) {
            ctx.strokeRect(
                building_upper_left.x + sizes.ELEVATOR_PADDING + i * sizes.ELEVATOR_GAP + i * sizes.ELEVATOR_WIDTH,
                building_upper_left.y + (floor + 1) * sizes.FLOOR_HEIGHT - sizes.ELEVATOR_HEIGHT,
                sizes.ELEVATOR_WIDTH,
                sizes.ELEVATOR_HEIGHT
            );
        });
    }, this);

    _.each(_.flatten(this.to_render), function(obj) {
        ctx.save();
        obj.draw(ctx, this.layout);
        ctx.restore();
    }, this);
};

function Env(controller, elevators, floors, elevator_animators, layout) {
    this.controller = controller;
    this.elevators = elevators;
    this.floors = floors;
    this.elevator_animators = elevator_animators;
    this.layout = layout;

    this.waiting_slots = _.map(_.range(this.floors.length), function() {
        return [ true, true, true, true, true ];
    });

    _.each(this.elevators, function(elevator) {
        elevator.slots = [ true, true, true, true ];
    }, this);
}

Env.prototype.get_elevator_slot = function(elevator) {
    var slots = elevator.slots;

    var index = _.lastIndexOf(slots, true);
    if (index === -1) { return null; }
    slots[index] = false;

    return index;
}

Env.prototype.release_elevator_slot = function(elevator, index) {
    elevator.slots[index] = true;
};

Env.prototype.get_waiting_slot = function(floor_no) {
    var slots = this.waiting_slots[floor_no - 1];

    var index = _.lastIndexOf(slots, true);
    if (index === -1) { return null; }
    slots[index] = false;

    return index;
}

Env.prototype.release_waiting_slot = function(floor_no, index) {
    this.waiting_slots[floor_no - 1][index] = true;
};

Env.prototype.call_elevator = function(floor_no, direction) {
    var button = this.layout.find_button(floor_no, direction);
    button.active = true;
    var cb = function() { button.active = false; }
    this.controller.call_elevator(floor_no, direction, cb);
};

Env.prototype.open_elevators = function(floor_no, direction) {
    return _.select(this.elevators, function(elevator) {
        return elevator.doors === Elevator.OPEN
            && elevator.position === floor_no
            && elevator.direction === direction
        ;
    });
};

Env.prototype.get_elevator_x = function(elevator) {
    var animator = _.detect(this.elevator_animators, function(animator) {
        return animator.elevator === elevator;
    });

    return animator.upper_left(this.layout).x
};

Env.prototype.order_elevator = function(elevator, floor_no) {
    var cb = function() {};
    this.controller.order_elevator(elevator, floor_no, cb);
};

Env.prototype.can_exit_elevator = function(elevator, floor_no) {
    return elevator.doors === Elevator.OPEN && elevator.position === floor_no;
};

function main(counts) {
    if (counts.elevators === undefined) counts.elevators = 1;
    if (counts.floors === undefined) counts.floors = 2;

    var elevators = [];
    _(counts.elevators).times(function(i) {
        var elevator = new Elevator();
        elevators.push(elevator);
    });

    var floors = [];
    _(counts.floors).times(function(i) {
        floors.push(new Floor(i + 1));
    });

    var sizes = new Sizes(elevators.length, floors.length);

    var carriage_animators = _.map(elevators, function(elevator, i) {
        var animator = new ElevatorAnimator(sizes, floors, elevator, i);
        animator.draw = draw_elevator_carriage;
        return animator;
    });

    var door_animators = _.map(elevators, function(elevator, i) {
        var animator = new ElevatorAnimator(sizes, floors, elevator, i);
        animator.draw = draw_elevator_doors;
        return animator;
    });

    var frame = new Frame("canvas");
    var layout = new Layout(sizes, frame, elevators, floors);

    var controller = new ElevatorController(elevators);
    var env = new Env(controller, elevators, floors, carriage_animators, layout);

    var actors = [];
    // var actors = [ new Actor(1, 3, env), new Actor(1, 3, env), new Actor(1, 3, env), new Actor(1, 2, env), new Actor(2, 4, env) ];  // arrow stays on
    // var actors = [ new Actor(1, 3, env), new Actor(2, 1, env), new Actor(3, 4, env), new Actor(3, 1, env) ];
    // var actors = [ new Actor(2, 1, env), new Actor(3, 1, env) ];
    // var actors = [new Actor(1, 4, env), new Actor(2, 5, env), new Actor(3, 6, env)];

    setInterval(function() {
        var floors = _.map(_.range(2), function() {
            return Math.floor(Math.random() * counts.floors) + 1;
        });
        if (floors[0] === floors[1]) { return; }

        actors.push(new Actor(floors[0], floors[1], env));
    }, 2000);


    var renderer = new Renderer(frame, sizes, layout, elevators, floors);
    renderer.add_to_render(carriage_animators);
    renderer.add_to_render(layout.buttons);
    renderer.add_to_render(actors);
    renderer.add_to_render(door_animators);

    game_loop.last = new Date()
    game_loop(controller, renderer, actors);
}


function game_loop(controller, renderer, actors) {
    var current = new Date();
    var delta = current - game_loop.last;

    controller.update(delta);
    _.each(actors, function(actor) { actor.update(delta); });

    // remove finished actors
    var finished = _.select(actors, function(actor) { return actor.finished; });
    _.each(finished, function(actor) {
        var index = actors.indexOf(actor);
        actors.splice(index, 1);
    });
    console.log(actors.length);

    renderer.render();

    game_loop.last = current;
    setTimeout(function() {
        game_loop(controller, renderer, actors);
    }, 30);
}