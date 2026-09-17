# Verification — 2026-09-17

Tested in the existing shared **ha-testing** container running **Home Assistant
2026.9.1**, with its real Lovelace frontend in the Codex browser. State-change
tests used the `sv_test_` helper entities, not the hardware integration.

## Automated

`npm test`: **12 tests pass** (6 logic tests, 6 DOM/editor tests).
`npm run build`: succeeds; distribution is identical to source.
Home Assistant `check_config`: passes after installing the test package/resource.

## In Home Assistant

- Custom card appears in the Community cards picker.
- Native visual form loads without requiring YAML first.
- Outdoor entity selected through HA's searchable selector persists and updates
  the card preview. An expandable-form flattening defect found here was fixed.
- Switching to the code editor shows the selected entity in `entities`.
- Pasting the full YAML configuration and switching back populates the native
  form with all four temperature entities and renders the complete preview.
- Toggling animation and operating details visually, saving, and leaving edit
  mode persists both settings. Saved card reports CSS animation `none` and no
  metrics section, while retaining its entity assignments.
- Changing synthetic bypass from 0 to 100 updates the live badge and supply
  SVG path to the route around the exchanger.
- Changing supply output from 49 to 0 changes the live value and computed CSS
  animation to `none`, despite the configured ventilation level remaining 3.
- Changing outdoor temperature from 4 to -5 updates its reading and color.
- Turning the synthetic controller connection off displays Offline and the
  stale-readings notice; restoring it clears the notice.
- Final deployed bundle was visually rechecked in light mode with 100% bypass;
  the rerouted airflow and darker temperature labels render correctly.
- Full card, compact Fahrenheit card, missing-sensor card and unconfigured card
  render together in the dedicated dashboard.
- Mobile width 390 px was visually inspected; card fits the single-column view.
- Native light and dark appearance were inspected. Light mode exposed pale
  temperature labels; final labels blend temperature hue with theme text color
  to improve contrast. The browser media override initially caused a partial HA
  theme transition; native light mode plus navigation rendered correctly.
- Reduced-motion emulation yields CSS animation `none` for all rendered airflow
  paths. Browser emulation and viewport overrides were reset afterward.

## Hardware reference

Read the existing Smart Ventilation device page in the user's Chrome Home
Assistant session. Observed bypass at 100%, fan outputs 37% supply / 35% extract,
RPM sensors both 0, connected gateway/controller, four air temperatures, room
temperature, humidity, hygrostat, setpoint, ventilation level, calibration,
clock and filter-register values. This corroborates using output percentage for
animation instead of interpreting provisional RPM zero as stopped.

No services were called against the original hardware and the card was not
installed in production. Entity IDs can differ from the generic README example;
the visual editor is the reliable way to map an installation's entities.

## Repeating the browser checks

1. Run `python3 tests/deploy.py` after building; open the test dashboard.
2. Change bypass, output and temperature helpers. Check route, animation and
   displayed temperatures; restore 0%, 49% and 4 °C afterward.
3. Turn the synthetic controller connection off, check the offline indication,
   then turn it back on.
4. In the existing Test matrix dashboard, edit the saved
   **Ventilation · visual editor test** card to exercise both editors.
5. Check the empty and missing-sensor cards, narrow viewport, light/dark themes,
   and reduced-motion preference.

The YAML test dashboard and helper package are reproducible fixtures in
`examples/`. The additional UI-edited card is saved in Home Assistant's existing
storage dashboard and is not overwritten by deployment.

## Compact layout revision

Moved fan buttons/outputs/RPM into the diagram, replaced the normal curved
routes with straight diagonals, removed the inner recovery rectangle, and added
`show_title` to YAML and the visual editor. All 12 existing tests pass, with the
optional-field and editor round-trip checks extended to cover title visibility.
Rebuilt and deployed to HA 2026.9.1; visually checked normal and active-bypass
routes, integrated fan alignment, unboxed recovery and the headerless compact
example. Restored the bypass helper to 0 after the check.

## Duct and fan refinement

Changed both normal routes to horizontal–diagonal–horizontal segments; reduced
SVG temperature text from 20 to 18 px. Fan centers moved from x=78/282 to
x=112/248 beside the exchanger, on the horizontal outlets. Replaced the floating
fan icons with flanged duct housings and animated six-blade impellers. The
bypass reconnects upstream of the supply fan. All 12 tests pass. Rebuilt,
deployed and visually checked normal and 100% bypass modes in Home Assistant;
restored the bypass test helper to 0 afterward.

## Bypass alignment correction

Replaced the curved bypass detour with straight horizontal/vertical segments.
The branch begins at the same x=130 breakpoint as normal flow, passes above the
exchanger at y=48, returns at the normal outlet breakpoint x=230, and meets the
supply fan on y=171. Six DOM/editor tests pass. Rebuilt and deployed; visually
verified with the synthetic bypass helper at 100%. Left the test preview in
active bypass mode for inspection.

## Heat-transfer design — 2026-09-17

Implemented the selected third concept with fixed straight supply/extract rails,
inline fans, and a central heat-transfer band. Bypass replaces the heat arrow and
recovery estimate with an open-damper symbol and the actual bypass reading.

- All 14 tests passed (6 core + 8 DOM/editor), including stable paths across
  bypass changes, heat-arrow suppression for missing/offline/stopped states,
  and summer heat-transfer direction.
- Rebuilt distribution and deployed to `ha-testing`; HA configuration validated.
- Visually checked normal mode (84% recovery), active bypass (100%), missing
  outdoor sensor, and compact title-hidden Fahrenheit variant in Home Assistant.
- Changed the synthetic bypass helper 0 → 100 → 0 and verified live transitions.
  The test dashboard is left in normal recovery mode.

## Complete concept styling — 2026-09-17

Replaced the remaining original layout with the selected concept's charcoal
surface, cyan/amber temperatures, translucent exchanger, circular three-blade
fans, relocated fan/temperature labels, recovery/bypass header and three-part
icon footer. Secondary values remain in diagnostics. Narrow cards wrap the
header rather than compressing the title. Fixed palette is intentional.
All 15 core/DOM tests pass, including footer layout and retained diagnostics.
Home Assistant configuration validation passed on deployment.
