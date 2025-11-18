import assert from "assert";
import app from "../../src/app";

describe("'countries' service", () => {
  it("registered the service", () => {
    const service = app.service("countries");

    assert.ok(service, "Registered the service");
  });
});
