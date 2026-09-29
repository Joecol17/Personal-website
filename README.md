# Personal-website

Personal portfolio site for Joseph Collyer: a static site built with plain HTML, CSS and JavaScript.

## Files

- `index.html`: page content (about, experience, education, skills, contact)
- `styles.css`: styling, with automatic light/dark mode and a responsive layout
- `script.js`: mobile menu and all animations (preloader, text reveals, smooth scroll, marquee, custom cursor, magnetic buttons, grid overlay)
- `terminal.js`: the hidden terminal (press **`** or click **>_** in the nav; try `help`, `neofetch`, `traceroute joseph`)
- `network.js`: the interactive career network map in the Experience section
- `pc3d.js`: the 3D desk setup (orbit, hotspots, exploded view, and a keyboard that types along with yours), built with [three.js](https://threejs.org)
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: site icons
- `vendor/`: local copies of [GSAP](https://gsap.com) (with ScrollTrigger and SplitText), [Lenis](https://lenis.darkroom.engineering) smooth scroll, and a trimmed three.js build (`three.bundle.min.js`, loaded only when the 3D section is near)

Press **G** (or click the Grid button in the nav) to show the 12-column layout grid. Animations are switched off automatically for visitors who have reduced motion enabled.

## Viewing locally

The 3D section uses JavaScript modules, which browsers won't load from `file://`, so run a local server:

```sh
python3 -m http.server
```

then visit http://localhost:8000.

## Publishing

In the GitHub repo, go to **Settings → Pages**, set the source to the `main` branch (root folder), and the site will be published at `https://<username>.github.io/Personal-website/`.
