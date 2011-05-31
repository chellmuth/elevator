$(document).ready(function() {
    var cb = function() {};

    function floors(current_job) {
        return _.map(current_job, function(job) {
            return job.destination || job.floor_no;
        });
    }

    test("2 people push the same button - 1 Elevator", function() {
        var elevator = new Elevator();
        var controller = new ElevatorController([elevator]);
        controller.call_elevator(2, Elevator.UP, cb);
        controller.call_elevator(2, Elevator.UP, cb);

        equal(elevator.destination, 2, "current destination");
        deepEqual(elevator.current_job, [], "no jobs");
        deepEqual(controller.call_queue, [], "no queued floors");
    });

    test("2 people push the same button - multiple elevators", function() {
        var elevators = [new Elevator(), new Elevator()];
        var controller = new ElevatorController(elevators);
        controller.call_elevator(2, Elevator.UP, cb);
        controller.call_elevator(2, Elevator.UP, cb);

        deepEqual(controller.call_queue, [], "no queued floors");

        equal(elevators[0].destination, 2, "filled current destination");
        deepEqual(elevators[0].current_job, [], "filled no jobs");

        equal(elevators[1].direction, Elevator.IDLE, "2nd idle");
        equal(elevators[1].destination, null, "idle current destination");
        deepEqual(elevators[1].current_job, [], "idle no jobs");
    });

    test("preempt an order if it's on the way", function() {
        var elevator = new Elevator();
        var controller = new ElevatorController([elevator]);

        elevator.direction = Elevator.UP;
        controller.order_elevator(elevator, 4, cb);

        controller.call_elevator(2, Elevator.DOWN, cb);
        controller.call_elevator(3, Elevator.DOWN, cb);

        while(elevator.direction === Elevator.UP) {
            controller.update(100);
        }
        controller.update(1);

        deepEqual(controller.call_queue, [], "no queued floors");
        equal(elevator.destination, 3, "3 preempts 2");
        deepEqual(floors(elevator.current_job), [2], "2 is queued");
    });
});