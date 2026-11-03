# Human Tetris

Match 15 different silhouettes, once each in a random order. Keep both feet on the floor and hold each pose steady as the wall arrives.

This folder is a complete, independent repository. It does not depend on either of the other games. The blue-and-white details page and institutional banner follow the supplied website reference; the playable arena keeps its game theme.

## Preview locally in VS Code (Mac)

1. Extract the ZIP first. Open this extracted folder using **File → Open Folder** in VS Code.
2. Choose **Terminal → New Terminal**. Make sure the terminal is in the folder containing this README.
3. Run:

```bash
python3 tools/serve.py
```

4. Open the exact URL printed in the terminal, normally **http://127.0.0.1:8094/**. This is the project details page. Click **Play Game** to test.
5. Keep the terminal open. Press **Control+C** in that terminal to stop the server.

Alternatively choose **Terminal → Run Task → Preview project locally**. No Python virtual environment, pip install, npm install, GPU account or training is required. Python 3 only serves static files; the model runs in the browser. On Windows use `py tools/serve.py` if `python3` is unavailable.

If the address is already in use, this helper automatically tries the next 19 ports and prints the working one. To choose a different starting port use `python3 tools/serve.py --port 9000`. Do not stop an unrelated server. If Python is missing, install Python 3 and reopen VS Code.

## Test the game

Start with **Try keyboard demo**. There is a three-second countdown. Use keys 1–9 and 0 for the first ten poses, then Z, X, C, V and B for the last five. You can also select any of the 15 pose buttons below the arena. The demo is clearly labelled and does not run the camera model.

For body controls: use Chrome or Edge, click **Open camera**, allow camera permission, and wait for the model. Stand upright with head, hands and feet in frame until calibration completes. Start the camera game. Copy the target silhouette with both feet on the floor. New shapes use one arm raised or one arm raised with the other extended sideways. Left and right refer to the mirrored on-screen silhouette. Hold the match during the last moments before the wall reaches you. No jumping, single-leg balancing, spinning or floor poses are required.

Use a well-lit room and comfortable movements. Internet is needed for MediaPipe JavaScript/WASM, the pretrained model, and optional fonts. Camera access needs localhost or HTTPS: do not double-click play.html or use a plain HTTP Wi-Fi address. If the camera is busy, close other camera apps/tabs. Tracking loss pauses the game; return to full view and resume.

## Files and editing

- `index.html`: project details page, ready to share on the projects website.
- `play.html`: generated playable page; edit its source template instead.
- `assets/arcade.css`: styling, including the light presentation overrides at the end.
- `assets/game.mjs`: camera lifecycle, inputs, UI and SVG rendering.
- `src/logic.mjs`: game rules. The reusable engine includes all three rule types; only this project's configuration is enabled here.
- `src/game-template.html` and `src/games.json`: play page source and this project's text.
- `assets/logic.mjs`: generated browser copy of the game rules.
- `assets/*.svg` and banner: local artwork and educational diagram.
- `docs/CODE_GUIDE.md`: beginner guide to the shared engine (examples discuss all three original games).
- `docs/PROJECT_DETAILS.md` and `website/`: reusable website descriptions, details fragment, metadata and card template.
- `docs/GITHUB_SETUP.md`: publish this folder as its own repository.
- `.vscode/tasks.json`: preview, build and test shortcuts.

All playable files are already built. After editing src rules, configuration or template, run:

```bash
python3 tools/build.py
```

Refresh the browser. Edit index.html directly for details-page changes. Do not delete assets or move play.html away from them.

## Optional developer checks

With Node.js 18 or newer installed:

```bash
node --test tests/logic.test.mjs
node --check assets/game.mjs
```

## Camera privacy

Camera frames are processed in your browser. The app does not record or upload video or request a microphone. Internet is needed to download the tracking runtime and model. Personal bests are stored in this browser.

## Verification and licences

See VERIFICATION.md for checks actually performed. Live webcam tracking and classroom conditions require hands-on testing on your machine. App code and original SVG art use the included MIT licence. See docs/ASSETS.md for external assets and institutional logo rights.

## Simple play screen

The main screen contains the arena, score/round information, camera and difficulty. Skeleton visibility and recalibration are under Optional settings. The details page contains a short game description and instructions.

## 15 grounded target poses

| Key | Pose | Movement |
| --- | --- | --- |
| 1 | Wings out | Both arms sideways |
| 2 | Reach up | Both arms upward |
| 3 | Make a star | Arms diagonally upward; step feet apart comfortably |
| 4 | Goal posts | Elbows sideways, forearms upward |
| 5 | Left reach | Screen-left arm upward, other arm relaxed |
| 6 | Right reach | Screen-right arm upward, other arm relaxed |
| 7 | Left L | Screen-left arm upward, other arm sideways |
| 8 | Right L | Screen-right arm upward, other arm sideways |
| 9 | Left high, right low | Screen-left arm upward, other arm diagonally downward |
| 0 | Low V | Both arms diagonally downward and outward |
| Z | Left diagonal | Screen-left arm diagonally upward, other arm relaxed |
| X | Right diagonal | Screen-right arm diagonally upward, other arm relaxed |
| C | Left cross reach | Screen-left hand reaches across the chest |
| V | Right cross reach | Screen-right hand reaches across the chest |
| B | Hands at chest | Bring both hands near the upper chest, elbows apart |

Follow the mirrored silhouette. Both feet remain on the floor; there is no jumping, single-leg balancing, spinning or floor work. Every session uses all 15 poses once in random order. A wrong arm cannot be averaged away by correct stationary legs. Live webcam tolerance should be tested on the actual player and device.

## Full-body character

The arena uses a shaded, articulated character with a head, torso, hands, arms, legs and shoes. Its display size is 20% smaller, anchored at the floor. Camera joints and the keyboard demo drive the same character. The target silhouette and wall opening use that same display transform so they line up at arrival; pose matching still uses the original tracked coordinates.

## Consistent body proportions

All three projects use the same full-body character geometry, 80% arena scale and floor anchor. They use the same torso-based camera calibration and smoothing. Only the outfit colours and game equipment differ. Tetris openings, goalkeeper targets, gloves and ball paths, and laser fields use the same display projection as the character, preserving their interaction positions. The goalkeeper pointer converts back through that projection before moving the hands.
