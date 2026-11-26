'use strict';

class RoomError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireRoom(condition, status, message) {
  if (!condition) throw new RoomError(status, message);
}

module.exports = { RoomError, requireRoom };
