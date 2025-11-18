import assert from "assert";
import app from "../../src/app";

describe("'array-state' service", () => {
  it("registered the service", () => {
    const service = app.service("array-state");

    assert.ok(service, "Registered the service");
  });
});
