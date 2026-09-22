const VERSIONS = Object.freeze({
  v1: Object.freeze({ status: "deprecated", sunset: "2026-12-31", successor: "/v2/characters" }),
  v2: Object.freeze({ status: "active" }),
});

export { VERSIONS };
