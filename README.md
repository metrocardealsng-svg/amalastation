# Amala Station

Website for Amala Station, Jolly J's Bakery & Restaurant.
1 Circular Road, Elekahia Housing Estate, Port Harcourt. Orders: 0806 597 1529.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## What's inside
- `index.html` page structure and SEO data
- `styles.css` all styling (Montserrat + Kaushan Script, self-hosted)
- `app.js` scroll walkthrough, menu data, WhatsApp order builder
- `feast.js` food showcase section (GSAP ScrollTrigger), plates and cards feed the same order
- `assets/feast` 120 frames from the food video + plate thumbnails
- `catering.js` catering and events reels section (edit the words in the `CLIPS` list)
- `assets/catering` five short reels cut from your event videos, plus posters
- `flash.js` flash sale section: set `FLASH_ENDS_AT` at the top for a countdown
- `assets/flash` Chop Life poster, CEO video and its poster image
- `assets/vendor` GSAP, ScrollTrigger and ScrollToPlugin, bundled locally
- `assets/frames` 96 frames cut from the walkthrough video
- `assets/img` logo, signboard and interior photos

## Change a price or add a dish
Open `app.js` and edit the `MAINS` or `EXTRAS` lists. One line per dish.

## Change the phone number
Search for `2348065971529` in `app.js` and `index.html`.

## Put it online (Vercel)
Vercel > Add New > Project > import this repo > Framework: Other > Deploy. No build command, no output folder.
Every change you commit to `main` goes live by itself.

## Or GitHub Pages
Repo Settings > Pages > Deploy from a branch > `main` / root.
Or import the repo into Vercel or Netlify. No settings needed.

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000
