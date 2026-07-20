# Static Route-Clearance Implementation Plan

**Goal:** Keep all fixed routes clear of third-city markers using precomputed city coordinates and no runtime geometry pass.

## Implementation

- Add a source contract proving `scenario.ts` contains no runtime route-splitting helpers and returns `uniqueRoutes(routes)`.
- Keep a geometric regression test that checks all 12/21/33-city and sparse/standard/dense combinations against the 36-unit clearance rule.
- Remove the runtime projection, distance, sorting, and repeated splitting code.
- Store the verified final coordinates directly in `CITY_DEFINITIONS`.
- Build browser modules, run the full test suite, and verify the LAN preview returns HTTP 200.
