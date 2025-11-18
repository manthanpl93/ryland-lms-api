import assert from "assert";
import app from "../../src/app";

describe("'notification scheduler' service", () => {
  it("registered the service", () => {
    const service = app.service("notification-scheduler");

    assert.ok(service, "Registered the service");
  });
});
