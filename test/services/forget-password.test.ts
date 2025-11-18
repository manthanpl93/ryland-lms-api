import assert from "assert";
import app from "../../src/app";

describe("'forget-password' service", () => {
  it("registered the service", () => {
    const service = app.service("forget-password");

    assert.ok(service, "Registered the service");
  });
});
