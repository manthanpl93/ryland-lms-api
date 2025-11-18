import assert from "assert";
import app from "../../src/app";

describe("'approved-courses' service", () => {
  it("registered the service", () => {
    const service = app.service("approved-courses");

    assert.ok(service, "Registered the service");
  });
});
