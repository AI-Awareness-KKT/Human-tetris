# Verification — 28 October 2026

- All 16 shared game-rule tests pass in this independent folder.
- Browser runtime passes Node.js syntax checking.
- Local file references in index.html and play.html resolve inside this folder.
- HTTP 200 confirmed for details page, play page, runtime, rules and banner.
- Browser preview confirmed each independent game loads and its demo Start button enters the countdown.
- Details-page styling inspected at the preview browser width.
- Local preview helper tested with the default port already occupied: it selected port 8095 and served this project's details page.

The shared engine previously received full keyboard-session tests in the original arcade. This packaging pass checks loading and startup; it does not repeat every full game session. Live webcam tracking, camera permission and classroom/device conditions still need testing on your computer. No project has been published to GitHub.

## Update — 29 October 2026

- Simplified play screen: arena, camera, short instructions and collapsed optional settings.
- AI and dataset explanations removed from the web pages and the new presentation notes removed from project files.
- 19 game-rule tests pass; JavaScript syntax and local HTML asset links pass.
- Added four grounded poses (eight total), keys/buttons 1–8, and non-repeating eight-pose sessions. Tests check all pose pairs, small landmark jitter, feet on the floor and complete sessions. Browser checked the eight buttons, demo startup and Optional settings. Live webcam performance still needs hands-on testing.
