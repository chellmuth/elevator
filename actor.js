function random_color() {
    var rgb = _.map(_.range(3), function() {
        return Math.floor(Math.random() * 255);
    });

    return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] +')';
}

function Actor(floor_no, exit, env) {
    this.exit = exit
    var direction = exit > floor_no ? Elevator.UP : Elevator.DOWN;

    this.states = [
        new GetWaitingSlotState(floor_no, env),
        new ArrivingState(floor_no),
        new WaitingState(floor_no, exit, direction, env),
        new EnteringState(floor_no, exit, direction, env),
        new RidingState(exit, env),
        new ExitingState(exit, env),
        new LeavingState()
    ];

    this.finished = false;

    this.fillStyle = random_color();
}

Actor.prototype.update = function(delta) {
    var state = this.states[0];
    state.update(delta);

    delta = delta / 3600;
    if (state.finished) {
        this.states.shift();
        if (this.states.length > 0) {
            this.states[0].init(state.args);
        }
    }

    if (!this.states.length) {
        this.finished = true;
    }
};

Actor.prototype.draw = function(ctx, layout) {
    ctx.save();
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = Actor.strokeStyle;

    var position = this.states[0].position(layout);
    if (position === null) { return; }

    ctx.beginPath();

    ctx.rect(
        position.x, position.y,
        Actor.WIDTH, Actor.HEIGHT
    );

    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    ctx.restore();

    ctx.fillText("" + this.exit, position.x, position.y - 2);
};

Actor.strokeStyle = 'rgb(50, 50, 50)';
Actor.WIDTH = 6;
Actor.HEIGHT = 40;

function GetWaitingSlotState(floor_no, env) {
    this.floor_no = floor_no;
    this.env = env;
}

GetWaitingSlotState.prototype.update = function(delta) {
    var slot = this.env.get_waiting_slot(this.floor_no)
    if (slot !== null) {
        this.finished = true;
        this.args = [slot];
    }
};

GetWaitingSlotState.prototype.position = function() { return null; };

function ArrivingState(floor_no) {
    this.floor_no = floor_no;

    this.progress = 0;
    this.velocity = 3;

    this.local_end_x = Actor.WIDTH;

    this.finished = false;
}

ArrivingState.prototype.init = function(args) {
    this.waiting_index = args.pop();
    this.local_end_x = this.local_end_x + this.waiting_index * 2 * Actor.WIDTH ;
};

ArrivingState.prototype.update = function(delta) {
    delta = delta / 3600;

    this.progress += delta * this.velocity;
    if (this.progress >= 1) {
        this.args = [this.local_end_x, this.waiting_index];
        this.finished = true;
    }
};

ArrivingState.prototype.position = function(layout) {
    var start_x = layout.building_to_canvas({x: 0, y: 0}).x - Actor.WIDTH;
    var end_x = layout.building_to_canvas({x: this.local_end_x, y:0}).x;

    return {
        x: (end_x - start_x) * this.progress + start_x,
        y: layout.floor_to_canvas(this.floor_no) - Actor.HEIGHT
    };
};


function WaitingState(floor_no, exit, direction, env)
{
    this.floor_no = floor_no;
    this.exit = exit;
    this.direction = direction;
    this.env = env;

    this.finished = false;

    this.retry_elevator = false;
    this.retry_timer = 1;
}

WaitingState.prototype.init = function(args) {
    this.waiting_index = args.pop();
    this.local_start_x = args.pop();

    this.env.call_elevator(this.floor_no, this.direction);
};

WaitingState.prototype.update = function(delta) {
    delta = delta / 3600;

    if (this.retry_elevator) {
        if (this.retry_timer <= 0) {
            this.env.call_elevator(this.floor_no, this.direction);
            this.retry_elevator = false;
        }
        this.retry_timer -= delta;
    }

    var elevators = this.env.open_elevators(this.floor_no, this.direction);

    var slot = -1;
    var elevator =  _.detect(elevators, function(elevator) {
        slot = this.env.get_elevator_slot(elevator);
        if (slot !== null) { return true; }

        return false;
    }, this);

    if (elevator !== undefined) {
        this.args = [elevator, this.local_start_x, slot];
        this.finished = true;

        this.env.release_waiting_slot(this.floor_no, this.waiting_index);
    }
    else if (elevators.length > 0) { // didnt fit in the elevator
        this.retry_elevator = true;
        this.retry_timer = 1.75; // give the elevator time to leave
    }
};

WaitingState.prototype.position = function(layout) {
    var start_x = layout.building_to_canvas({x: this.local_start_x, y:0}).x;
    return {
        x: start_x,
        y: layout.floor_to_canvas(this.floor_no) - Actor.HEIGHT
    };
};

function EnteringState(floor_no, exit, direction, env) {
    this.floor_no = floor_no;
    this.exit = exit;
    this.direction = direction;
    this.env = env;

    this.progress = 0;
    this.velocity = 10;

    this.finished = false;
}

EnteringState.prototype.init = function(args) {
    this.elevator_index = args.pop();
    this.local_start_x = args.pop();
    this.elevator = args.pop();

    this.end_x = this.env.get_elevator_x(this.elevator) + (Actor.WIDTH * this.elevator_index) + (Actor.WIDTH / 2 * (this.elevator_index + 1));
};

EnteringState.prototype.update = function(delta) {
    delta = delta / 3600;

    this.progress += delta * this.velocity;
    if (this.progress >= 1) {
        this.env.order_elevator(this.elevator, this.exit);

        this.args = [this.elevator, this.end_x, this.elevator_index];
        this.finished = true;
    }
};

EnteringState.prototype.position = function(layout) {
    var start_x = layout.building_to_canvas({x: this.local_start_x, y: 0}).x

    return {
        x: (this.end_x - start_x) * (this.progress / 1) + start_x,
        y: layout.floor_to_canvas(this.floor_no) - Actor.HEIGHT
    };
};

function RidingState(exit, env) {
    this.exit = exit;
    this.env = env;
}

RidingState.prototype.init = function(args) {
    this.elevator_index = args.pop();
    this.start_x = args.pop();
    this.elevator = args.pop();
};

RidingState.prototype.update = function() {
    if (this.env.can_exit_elevator(this.elevator, this.exit)) {
        this.args = [this.elevator, this.start_x];
        this.finished = true;

        this.env.release_elevator_slot(this.elevator, this.elevator_index);
    }
};

RidingState.prototype.position = function(layout) {
    return {
        x: this.start_x,
        y: layout.floor_to_canvas(this.elevator.position) - Actor.HEIGHT
    };
};

function ExitingState(exit, env) {
    this.exit = exit;
    this.env = env;

    this.progress = 0;
    this.velocity = 1;
}

ExitingState.prototype.init = function(args) {
    this.start_x = args.pop();
    this.elevator = args.pop();
};

ExitingState.prototype.update = function(delta) {
    delta = delta / 3600;

    this.progress += delta * this.velocity;
    if (this.progress >= 1) {
        this.finished = true;
    }
};

ExitingState.prototype.position = function(layout) {
    var end_x = layout.building_upper_left.x + layout.sizes.BUILDING_WIDTH;

    return {
        x: (end_x - this.start_x) * this.progress + this.start_x,
        y: layout.floor_to_canvas(this.exit) - Actor.HEIGHT
    }
};

function LeavingState() {}
LeavingState.prototype.init = function() {
    console.log("LEAVING");
    this.finished = true;
};
LeavingState.prototype.update = function() {};
LeavingState.prototype.position = function() { return null; };