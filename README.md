# Personal-website

Personal portfolio site for Joseph Collyer: a static site built with plain HTML, CSS and JavaScript.

## Files

- `index.html`: page content (about, experience, education, skills, contact)
- `styles.css`: styling, with automatic light/dark mode and a responsive layout
- `perf.js`: picks a performance tier for the visitor's device before anything else loads (see below)
- `script.js`: mobile menu and all animations (preloader, text reveals, smooth scroll, marquee, custom cursor, magnetic buttons, grid overlay)
- `terminal.js`: the hidden terminal (press **`** or click **>_** in the nav; try `help`, `neofetch`, `traceroute joseph`)
- `network.js`: the interactive career network map in the Experience section
- `spotify.js`: the "Now playing" card in the bottom-left corner showing what I'm listening to on Spotify (see below)
- `pc3d.js`: the interactive 3D model of my PC, built with [three.js](https://threejs.org): drag to orbit, numbered hotspots with each part's real name and specs, an exploded view that takes the build apart in build order, a power switch for the fans and RGB, and typing pulses the motherboard RGB
- `pc3d/`: the model itself, all made in code with no downloaded 3D models
  - `build.js`: every part at its published real-world size (O11 Dynamic Mini V2 case, ATX board on standoffs, AM5 CPU, 360 mm AIO in the roof, RAM in A2/B2, M.2 SSD, vertically mounted RTX PRO 6000 on a PCIe 5.0 riser, EDGE GOLD PSU and 3.5" drive in the back chamber, sleeved 24-pin / EPS / 12V-2x6 / SATA cables)
  - `parts.js`: the hotspot text and specs for each part
  - `geo.js`, `textures.js`: rounded boxes, tubes, cable bundles, fan blades, and canvas-drawn PCB, labels and brushed metal
  - `hdr.js`, `bloom.js`: a small Radiance `.hdr` loader for the studio lighting, and the HDR bloom pass
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: site icons
- `vendor/`: local copies of [GSAP](https://gsap.com) (with ScrollTrigger and SplitText), [Lenis](https://lenis.darkroom.engineering) smooth scroll, and a trimmed three.js r186 build (`three.bundle.min.js`, loaded only when the 3D section is near)
- `assets/studio_small_08_1k.hdr`: studio lighting for the 3D model

### three.js bundle

`vendor/three.bundle.min.js` was made with esbuild from an entry file that re-exports only the classes the site uses, plus `OrbitControls`. The 3D model also needs these core classes, which are exported from the same bundle: `BufferGeometry`, `BufferAttribute`, `Float32BufferAttribute`, `Box3`, `Color`, `DataTexture`, `Texture`, `Euler`, `Matrix3`, `Matrix4`, `Quaternion`, `Vector4`, `Object3D`, `OrthographicCamera`, `ShaderMaterial`, `WebGLRenderTarget`, and the constants `AdditiveBlending`, `AgXToneMapping`, `NeutralToneMapping`, `ClampToEdgeWrapping`, `RepeatWrapping`, `EquirectangularReflectionMapping`, `HalfFloatType`, `LinearFilter`, `LinearSRGBColorSpace`. If you rebuild the bundle, keep all of these in the entry file:

```sh
esbuild entry.js --bundle --minify --format=esm --legal-comments=inline --outfile=vendor/three.bundle.min.js
```

Press **G** (or click the Grid button in the nav) to show the 12-column layout grid. Animations are switched off automatically for visitors who have reduced motion enabled.

## Performance tiers

`perf.js` scores the device on CPU threads, memory, the graphics chip WebGL reports and Save-Data / slow connections, then sets `data-perf="high|mid|low"` on `<html>` and `window.perf` for the other scripts:

| Tier | What changes |
|------|--------------|
| high | everything on |
| mid | lighter 3D model: lower resolution and less detailed geometry, textures, bloom and shadows |
| low | native scrolling instead of Lenis, no custom cursor or magnetic buttons, no frosted-glass blur, 3D without bloom, fewer network-map packets. If graphics are software-rendered, the 3D model only loads when the visitor clicks "Load 3D model" |

After the intro animation it also watches about 2 seconds of frames and drops one tier for the rest of the visit if the page runs below ~38 fps. To test a tier, add `?quality=low`, `?quality=mid` or `?quality=high` to the URL (remembered until `?quality=auto`), or type `quality` in the site terminal.

## Now playing

Spotify's API needs a server to hold a secret token, which a GitHub Pages site doesn't have, so the card reads from [Last.fm](https://www.last.fm) instead. Spotify sends every track you play to Last.fm, and Last.fm's API can be called straight from the browser. To turn it on:

1. Make a free Last.fm account.
2. In Spotify, go to **Settings → Apps** (or [spotify.com/account/apps](https://www.spotify.com/account/apps)) and connect **Last.fm**. Play a song and check it shows up on your Last.fm profile.
3. Get an API key at [last.fm/api/account/create](https://www.last.fm/api/account/create) (any app name; the callback URL can be left blank).
4. Put your Last.fm username and API key at the top of `spotify.js`:

   ```js
   const LASTFM_USER = "your-username";
   const LASTFM_API_KEY = "your-api-key";
   ```

The API key is only for reading public listening history, so it's fine for it to be in the page. The card shows "Now playing" with moving bars while a song is on, "Last played" for up to 6 hours afterwards, and hides itself after that or if the values above are empty. It checks every 30 seconds, only while the tab is open.

## Viewing locally

The 3D section uses JavaScript modules, which browsers won't load from `file://`, so run a local server:

```sh
python3 -m http.server
```

then visit http://localhost:8000.

## Publishing

In the GitHub repo, go to **Settings → Pages**, set the source to the `main` branch (root folder), and the site will be published at `https://<username>.github.io/Personal-website/`.

## Credits

- Studio lighting: [Studio Small 08](https://polyhaven.com/a/studio_small_08) HDRI from [Poly Haven](https://polyhaven.com), CC0 (1k version).
