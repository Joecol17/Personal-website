# Personal-website

Personal portfolio site for Joseph Collyer: a static site built with plain HTML, CSS and JavaScript.

## Files

- `index.html`: page content (about, experience, education, skills, contact)
- `styles.css`: styling, with automatic light/dark mode and a responsive layout
- `script.js`: mobile menu and all animations (preloader, text reveals, smooth scroll, marquee, custom cursor, magnetic buttons, grid overlay)
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: site icons
- `vendor/`: local copies of [GSAP](https://gsap.com) (with ScrollTrigger and SplitText) and [Lenis](https://lenis.darkroom.engineering) smooth scroll

Press **G** (or click the Grid button in the nav) to show the 12-column layout grid. Animations are switched off automatically for visitors who have reduced motion enabled.

## Viewing locally

Open `index.html` in a browser, or run:

```sh
python3 -m http.server
```

then visit http://localhost:8000.

## Publishing

In the GitHub repo, go to **Settings → Pages**, set the source to the `main` branch (root folder), and the site will be published at `https://<username>.github.io/Personal-website/`.
