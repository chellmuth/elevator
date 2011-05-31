function Elevator() {
    this.position = 1;
    this.direction = Elevator.IDLE;
    this.traveling = Elevator.IDLE;
    this.doors = Elevator.CLOSED;

    this.open_amount = 0;
    this.open_velocity = 3.;
    this.open_length = .2;
    this.open_remaining = 0;

    this.destination = null;
    this.cb = null;
    this.velocity = 2.5;

    this.current_job = [];
}

Elevator.prototype.is_ready = function() {
    return this.direction === Elevator.IDLE
        && this.doors === Elevator.CLOSED
        && this.current_job.length === 0
    ;
};

Elevator.prototype.is_serving_request = function(floor_no, direction) {
    return this.destination === floor_no && this.direction === direction;
};

Elevator.prototype.can_take_call = function(floor_no, direction) {
    if (this.is_ready()) { return true; }

    if (this.direction !== this.traveling) { return false; }

    if (this.direction === direction) {
        if (this.traveling === Elevator.UP && floor_no >= this.position) {
            return true;
        }
        if (this.traveling === Elevator.DOWN && floor_no <= this.position) {
            return true;
        }
    }

    return false;
};

Elevator.prototype.can_take_order = function(floor_no) {
    if (this.is_ready()) { return true; }

    if (this.traveling === Elevator.DOWN && floor_no < this.position) {
        return true;
    }
    if (this.traveling === Elevator.UP && floor_no > this.position) {
        return true;
    }

    if (this.traveling === Elevator.IDLE) {
        if (this.direction == Elevator.DOWN && floor_no < this.position) {
            return true;
        }
        if (this.direction === Elevator.UP && floor_no > this.position) {
            return true;
        }
    }

    return false;
};

Elevator.prototype.order = function(floor_no, cb) {
    this._add_floor(floor_no, cb);
};

Elevator.prototype.call_ = function(floor_no, direction, cb) {
    this.direction = direction;

    this._add_floor(floor_no, cb);
};

Elevator.prototype._add_floor = function(floor_no, cb) {
    if (this.destination) {
        this.current_job.push({
            destination: this.destination,
            cb: this.cb
        });
    }
    this.current_job.push({ destination: floor_no, cb: cb });

    this.current_job = _.sortBy(this.current_job, function(job) {
        return this.direction === Elevator.DOWN
            ? job.destination
            : -job.destination
        ;
    }, this);


    // filter on floor no
    var floors = [];
    this.current_job = _.select(this.current_job, function(job) {
        if (floors[job.destination]) {
            return false;
        }
        floors[job.destination] = 1;
        return true;
    });

    var job = this.current_job.pop();
    this.destination = job.destination;
    this.traveling = this.position < job.destination ? Elevator.UP : Elevator.DOWN;
    this.cb = job.cb;
};

Elevator.prototype.update = function(delta) {
    var seconds = delta / 3600;

    if (this.doors != Elevator.CLOSED) {
        if (this.doors == Elevator.OPENING) {
            var offset = this.open_velocity * seconds;
            this.open_amount += offset;
            if (this.open_amount >= 1) {
                this.open_amount = 1;
                this.doors = Elevator.OPEN;
                this.open_remaining = this.open_length;
            }
        }
        else if (this.doors == Elevator.OPEN) {
            this.open_remaining -= seconds;
            if (this.open_remaining <= 0) {
                this.open_remaining = 0;
                this.doors = Elevator.CLOSING;
            }
        }
        else if (this.doors == Elevator.CLOSING) {
            var offset = this.open_velocity * seconds;
            this.open_amount -= offset;
            if (this.open_amount <= 0) {
                this.open_amount = 0;
                this.doors = Elevator.CLOSED;

                if (this.current_job.length > 0) {
                    var job = this.current_job.pop();
                    this.order(job.destination, job.cb);
                }
                else {
                    // todo: i have better ideas
                    if (!this.destination) {
                        this.direction = Elevator.IDLE;
                    }
                }
            }
        }
    }
    else {
        var offset = this.velocity * seconds;

        var done = false;
        if (this.traveling == Elevator.UP) {
            this.position += offset;
            if (this.position >= this.destination) {
                done = true;
            }
        }
        else if (this.traveling == Elevator.DOWN) {
            this.position += -offset;
            if (this.position <= this.destination) {
                done = true;
            }
        }

        if (done) {
            this.position = this.destination;
            this.traveling = Elevator.IDLE;
            this.destination = null;

            this.cb();
            this.cb = null;

            this.doors = Elevator.OPENING;
        }
    }
};

Elevator.UP = "UP";
Elevator.DOWN = "DOWN";
Elevator.IDLE = "IDLE";

Elevator.OPENING = "OPENING";
Elevator.OPEN = "OPEN";
Elevator.CLOSED  = "CLOSED";
Elevator.CLOSING  = "CLOSING";


function ElevatorController(elevators) {
    this.elevators = elevators;

    this.call_queue = [];
}

ElevatorController.prototype.order_elevator = function(elevator, floor_no, cb) {
    if (elevator.can_take_order(floor_no)) {
        elevator.order(floor_no, cb);
    }
    else {
        console.log("Invalid order!");
    }
};

ElevatorController.prototype.call_elevator = function(floor_no, direction, cb) {
    var already_called = _.any(this.elevators, function(elevator) {
        return elevator.is_serving_request(floor_no, direction);
    });
    if (already_called) { return; }

    var available = _.select(this.elevators, function(elevator) {
        if (elevator.can_take_call(floor_no, direction)) {
            return true;
        }
        return false;
    });

    if (available.length > 0) {
        var elevator = available.shift();
        elevator.call_(floor_no, direction, cb);
    }
    else {
        this.call_queue.unshift({
            floor_no: floor_no,
            direction: direction,
            cb: cb
        });
    }
};

ElevatorController.prototype.update = function(delta) {
    var to_process = this.call_queue;
    this.call_queue = [];
    _.each(to_process, function(call) {
        this.call_elevator(call.floor_no, call.direction, call.cb);
    }, this);

    _.each(this.elevators, function(elevator) {
        elevator.update(delta);
    });
};
