import assert from "assert";
import app from "../../src/app";

describe("'author-courses' service", () => {
  it("registered the service", () => {
    const service = app.service("author-courses");

    assert.ok(service, "Registered the service");
  });
});
