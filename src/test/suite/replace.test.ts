import assert from "assert";
import { replace } from "@xliic/openapi-ast-node";

suite("Replace Test Suite", () => {
  test("yaml replace value", () => {
    assert.equal(`foo: baz`, replace("foo: bar", "yaml", [{ pointer: "/foo", value: "baz" }]));
  });

  test("yaml replace quoted value", () => {
    assert.equal(`foo: "baz"`, replace(`foo: "bar"`, "yaml", [{ pointer: "/foo", value: "baz" }]));
    assert.equal(`foo: 'baz'`, replace(`foo: 'bar'`, "yaml", [{ pointer: "/foo", value: "baz" }]));
  });

  test("yaml replace unquoted value", () => {
    assert.equal(`foo: true`, replace(`foo: false`, "yaml", [{ pointer: "/foo", value: "true" }]));
    assert.equal(`foo: 123`, replace(`foo: 321`, "yaml", [{ pointer: "/foo", value: "123" }]));
  });

  test("yaml replace value, multiple replacements", () => {
    assert.equal(
      `boom: baz`,
      replace("foo: bar", "yaml", [
        { pointer: "/foo", value: "baz" },
        { pointer: "/foo", value: "boom", replaceKey: true },
      ])
    );
  });

  test("yaml replace value, flow", () => {
    assert.equal(
      `foo: {"bar": "boom"}`,
      replace(`foo: {"bar": "baz"}`, "yaml", [{ pointer: "/foo/bar", value: "boom" }])
    );
  });

  test("yaml replace value, flow, array", () => {
    const yaml = `foo: ["bar", "baz"]`;
    assert.equal(
      `foo: ["boom", "baz"]`,
      replace(yaml, "yaml", [{ pointer: "/foo/0", value: "boom" }])
    );
    assert.equal(
      `foo: ["bar", "boom"]`,
      replace(yaml, "yaml", [{ pointer: "/foo/1", value: "boom" }])
    );
  });

  test("yaml replace key", () => {
    assert.equal(
      `baz: bar`,
      replace("foo: bar", "yaml", [{ pointer: "/foo", value: "baz", replaceKey: true }])
    );
  });

  test("yaml replace quoted key", () => {
    assert.equal(
      `"300": bar`,
      replace('"200": bar', "yaml", [{ pointer: "/200", value: "300", replaceKey: true }])
    );
  });

  test("yaml replace key, flow", () => {
    const yaml = `foo: {"bar": "baz"}`;
    assert.equal(
      `foo: {"boom": "baz"}`,
      replace(yaml, "yaml", [{ pointer: "/foo/bar", value: "boom", replaceKey: true }])
    );
  });

  test("yaml replace value in array", () => {
    const yaml = `
foo: one
bar:
  - one
  - two
baz: three`;

    assert.equal(
      `
foo: one
bar:
  - one
  - baz
baz: three`,
      replace(yaml, "yaml", [{ pointer: "/bar/1", value: "baz" }])
    );

    assert.equal(
      `
foo: one
bar:
  - baz
  - two
baz: three`,
      replace(yaml, "yaml", [{ pointer: "/bar/0", value: "baz" }])
    );
  });

  test("json replace value", () => {
    assert.equal(
      '{"foo": "baz"}',
      replace('{"foo": "bar"}', "json", [{ pointer: "/foo", value: "baz" }])
    );
  });

  test("json replace unqoted value", () => {
    assert.equal(
      '{"foo": true}',
      replace('{"foo": false}', "json", [{ pointer: "/foo", value: "true" }])
    );
    assert.equal(
      '{"foo": 123}',
      replace('{"foo": 321}', "json", [{ pointer: "/foo", value: "123" }])
    );
  });

  test("json replace value, multiple replacements", () => {
    assert.equal(
      '{"boom": "baz"}',
      replace('{"foo": "bar"}', "json", [
        { pointer: "/foo", value: "baz" },
        { pointer: "/foo", value: "boom", replaceKey: true },
      ])
    );
  });

  test("json replace value in array", () => {
    assert.equal(
      '{"foo": ["boom", "baz"]}',
      replace('{"foo": ["bar", "baz"]}', "json", [{ pointer: "/foo/0", value: "boom" }])
    );
    assert.equal(
      '{"foo": ["bar", "boom"]}',
      replace('{"foo": ["bar", "baz"]}', "json", [{ pointer: "/foo/1", value: "boom" }])
    );
  });

  test("json replace key", () => {
    assert.equal(
      '{"baz": "bar"}',
      replace('{"foo": "bar"}', "json", [{ pointer: "/foo", value: "baz", replaceKey: true }])
    );
    assert.equal(
      '{"foo": {"baz": "baz"}}',
      replace('{"foo": {"bar": "baz"}}', "json", [
        { pointer: "/foo/bar", value: "baz", replaceKey: true },
      ])
    );
  });
});
