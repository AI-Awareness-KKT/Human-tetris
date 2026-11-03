# Beginner guide to the three games

The three projects share input and interface code, but each has separate rules. Start with [README.md](../README.md) to run them.

## Follow the information

```text
Camera frame → pretrained pose model → estimated joints → calibration/smoothing
                                                                  ↓
Keyboard demo → generated virtual joints ─────────────────────→ game rules
                                                                  ↓
                                                        SVG scene + score
```

The two input routes are intentionally labelled differently. Keyboard demo input is programmed data, not an AI prediction. Both routes feed the same game-rule functions so the rules can be tested without needing a camera.

## `src/logic.mjs`: model-independent rules

`JOINTS` names the thirteen points used by these games. `EDGES` lists pairs joined by body segments, such as shoulder–elbow and hip–knee. `LANDMARKS` maps those names to the model's 33-point output indices. Normalized coordinates use 0–1 rather than fixed pixel positions.

`NEUTRAL` and `POSES` describe the demo body and 15 Tetris shapes. A pose is a dictionary of named points with `{x, y}` values. `clonePose()` copies the point dictionaries so editing a demo does not change the shared preset. `translated()` and `crouched()` produce moved demo bodies.

### Human Tetris comparison

`normalizedPose()` finds the midpoint of the hips and shoulders, uses their distance as torso length, then centers/scales the other points relative to the hips. This allows two similarly shaped bodies at different camera distances to compare sensibly.

`matchPose()` computes weighted differences in elbows, wrists, knees and ankles. Wrists have more influence because they strongly distinguish the arm shapes. It converts the weighted error to a 0–1 score. A 100% match means the calculated point relationships match; it is not a probability that the model is correct.

Matching also checks the worse-matching arm, so stationary legs cannot mask an incorrect arm in a one-sided pose.

The Tetris session opens a scoring window during the final 1.4 seconds of a wall's approach. A close-enough match must be held for 0.35 seconds inside that window. An early match alone does not earn a clear. The best score in that window influences points, and consecutive successes add a capped streak bonus.

### Goalkeeper saves

`canSave()` measures the distance from the shot target to either wrist. A wrist must be close enough during the final arrival window. The ball's path on screen is a perspective animation; the actual rule is the wrist-to-target check near arrival. Torso position alone does not save the shot.

Targets are generated within constrained normalized ranges. Easy gives more time and a wider arrival opportunity. Hard is faster and uses a smaller reach tolerance.

### Laser collisions

`pointSegmentDistance()` measures how far a point is from a finite line segment. `segmentDistance()` checks crossing and the closest separation of two segments. This matters because a beam can pass through the middle of an arm without touching either endpoint.

`beamCollision()` checks the head and connected segments against the beam, allowing a small body/beam thickness. Warning beams do not count. During the active phase, 0.12 seconds of continuous contact triggers a hit. `hit` prevents repeated shield loss in the same round. A clear active phase earns a successful scan.

The sequence cycles through duck, move left and move right. Three shield losses end the game; otherwise ten scans finish it.

### The `Session` class

An object created with `new Session(game, difficulty)` holds round number, score, streak, shields, timers and targets. `nextRound()` sets up the next challenge. Tetris draws from a pool without replacement, so each 15-wall session includes every shape once. `step(seconds, pose)` advances a small time step and evaluates that game. `takeEvents()` returns messages for the UI to announce.

The UI calls `step()` only while playing and, in camera mode, while tracking is fresh. Paused games do not advance their clocks. Each step is capped at 0.1 seconds, preventing a very slow frame from skipping an entire challenge. Successful round events update score once; finished sessions ignore further steps.

## Camera input and calibration

`readLandmarks()` rejects missing, non-finite or low-visibility required points and mirrors x coordinates. Mirroring makes movement feel like looking into a mirror. Camera visibility values are estimates; they cannot guarantee correct tracking.

`calibrationFor()` records the initial hip center and torso scale. `calibratedPose()` maps future predictions against that **fixed** reference. It does not recenter the body every frame: doing that would erase the sideways movement Laser Escape needs.

`smoothPose()` blends new input with previous input to reduce jitter. Smoothing can introduce a little delay, so the game uses limited rather than extreme smoothing.

## `assets/game.mjs`: input, lifecycle and rendering

The HTML's `data-game` chooses which project to run. All games use this file for consistent camera setup and controls.

`phase` tracks ready, countdown, playing, paused and results states. `mode` distinguishes demo and camera play. `startGame()`, `pauseGame()`, `resumeGame()`, `resetReady()` and `finishGame()` update the buttons, overlays and timing accordingly.

### Camera lifecycle

The camera button requests video only through `getUserMedia()`. `loadModel()` dynamically imports a pinned MediaPipe runtime and creates a VIDEO-mode Pose Landmarker Lite instance. It tries GPU initialization with a CPU fallback. The model is not loaded for keyboard play.

Setup has a generation counter. Cancelling setup invalidates the older asynchronous request; a camera stream arriving after cancellation is immediately stopped. The existing model can be reused on another attempt, avoiding unnecessary reloads. Turning off the camera stops all stream tracks and resets to demo. Leaving the page also stops tracks and closes the tracker.

`detectBody()` runs only for new video frames and at least 65 ms apart. It asks for one pose and no segmentation masks. Full-frame calibration needs the required points in view for two seconds. The user must stand upright with arms relaxed; the app does not prove that the user chose a perfect neutral stance.

After calibration, fresh valid predictions update the avatar. Missing input immediately freezes session progression, then pauses after a short grace period. The Resume button remains unavailable until tracking is valid again. Recalibration pauses the round so resetting the reference does not silently change active gameplay.

### Demo inputs

Keyboard and on-screen controls change a virtual pose. The 15 Tetris buttons select shapes. The goalkeeper pointer/arrows move wrists, with elbows interpolated between shoulders and wrists. Laser controls translate a standing/crouched body. These bodies go through the same collision and scoring rules as camera input.

### SVG graphics

`drawBody()` creates paths between joints and a head circle. `drawTetris()`, `drawGoalkeeper()` and `drawLaser()` create their respective themed arenas. `render()` combines the current arena and body. Graphics use a fixed SVG viewBox with responsive sizing, so they adapt to desktop and mobile widths.

Model outputs are checked as numbers before rendering. The SVG strings contain application-owned text and calculated coordinates, not user-supplied markup. The scenes update at up to about 30 renders per second; actual rates vary with device speed and inference work.

`updateMetrics()` updates score, round and time. An accessible status region announces discrete round events rather than every animation frame. Personal bests use `localStorage`; failures to access storage are caught. Keys include game, mode and difficulty to keep comparisons separate.

## HTML, CSS and build files

`src/game-template.html` contains the common page structure. `src/games.json` supplies each game's title, instructions and theme identity. The shared CSS sets layouts and variables; the root `data-game` changes the accent color. The homepage uses original SVG project artwork.

`tools/build.py` creates this repository’s play.html from its template and copies the source rules into assets/logic.mjs. The model and runtime are downloaded when camera tracking is enabled.

`tools/serve.py` is only a development server. It binds to localhost, starts at port 8094, and tries another port if already occupied. GitHub Pages serves the static files directly and never runs this Python code.

`.zed/tasks.json` provides build/run/test shortcuts. `.nojekyll` tells Pages to serve static content without Jekyll processing. The GitHub check workflow runs Node tests and the Python build and checks that generated files are current. Pages publishing is enabled separately by the repository owner.

## Tests and their limits

The nineteen automated cases test real rules: normalization, different pose discrimination, invalid inputs, segment intersection, duck/sideways escape, wrist saves, visibility rejection, fixed calibration, arrival windows, streaks, shields and complete sessions.

Their injected deterministic random function makes targets reproducible. They do not test webcam accuracy or infer a body from a real video. Browser checks and manual camera checks serve different purposes; see [VERIFICATION.md](../VERIFICATION.md).

## Good first changes

1. Change a game's heading or instructions in `src/games.json`, rebuild and refresh.
2. Adjust theme colors in CSS without touching model logic.
3. Modify a scoring threshold in `src/logic.mjs`, update meaningful tests, and compare ease of play.
4. Add a new Tetris preset, then check that its match score is distinguishable from the others.
5. Build a new challenge type using the same pose input, while keeping the camera and demo labels honest.

## Full-body Tetris rendering

`drawAvatar()` builds a solid character from the pose joints, with capsule limbs, a shaped torso, hands and shoes. `drawTetris()` applies `translate(100 118) scale(.8)` to the player, target and wall opening. The transform reduces the displayed character by 20% while keeping its feet at floor level. It does not alter calibration or `matchPose()` input. Smoothed camera and demo joints animate the full body.

## Shared character proportions

`assets/avatar.mjs` is identical in Human Tetris, Virtual Goalkeeper and Laser Escape. It owns the character geometry, gradients and the common `BODY_TRANSFORM`. Each arena draws interactive geometry in that coordinate space. Camera preview coordinates stay in the raw video space. `calibrationFor()` and `calibratedPose()` use identical torso scale and hip anchoring in all three projects; laser profile tracking additionally uses the returned shoulder and hip ratios. Goalkeeper pointer input passes through `posePoint()` to undo the display projection. Keep the renderer copies in sync when changing proportions.
