---
name: "Osho: the discourses, 1954 to 1990"
description: A one-page chronology of talks, printed like a block-printed cotton cloth.
colors:
  indigo: "#1F3A6B"
  madder: "#C2281D"
  turmeric: "#E9A21A"
  leaf: "#2E7D4F"
  cloth: "#F6E7C8"
  cloth-deep: "#EDD6A8"
  ink: "#2A1A12"
  ink-soft: "#5A4030"
  white: "#FFFFFF"
  row-hover: "#F3E1BA"
  map-land: "#F1D99A"
  map-water: "#CFE0E6"
typography:
  display:
    fontFamily: "Yatra One, Georgia, serif"
    fontSize: "clamp(2.6rem, 8.4vw, 5.6rem)"
    fontWeight: 400
    lineHeight: 0.95
  numeral:
    fontFamily: "Yatra One, Georgia, serif"
    fontSize: "clamp(4.6rem, 47cqi, 13rem)"
    fontWeight: 400
    lineHeight: 0.9
  headline:
    fontFamily: "Yatra One, Georgia, serif"
    fontSize: "clamp(2rem, 3.8vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.05
  title:
    fontFamily: "Yatra One, Georgia, serif"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.15
  body:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  nav:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
  label:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  tag:
    fontFamily: "Hind, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  sm: "4px"
  md: "8px"
  pill: "999px"
spacing:
  gutter: "clamp(1.1rem, 4.5vw, 4rem)"
  band: "3rem"
  print-lg: "30px"
  print-sm: "18px"
components:
  masthead:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.cloth}"
    padding: "clamp(1.1rem, 2.4vw, 1.6rem) clamp(1.1rem, 4.5vw, 4rem) clamp(0.9rem, 1.8vw, 1.2rem)"
  year-pill:
    textColor: "{colors.indigo}"
    typography: "{typography.nav}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.55rem 0.4rem"
  year-pill-hover:
    backgroundColor: "{colors.cloth-deep}"
    textColor: "{colors.indigo}"
  year-pill-current:
    backgroundColor: "{colors.madder}"
    textColor: "{colors.white}"
  table-header:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.cloth}"
    typography: "{typography.label}"
    padding: "0.6rem 0.9rem 0.5rem 0"
  table-row-hover:
    backgroundColor: "{colors.row-hover}"
  camp-row:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
  lang-pill-english:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.ink}"
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "0.12em 0.55em 0.05em"
  lang-pill-hindi:
    backgroundColor: "{colors.madder}"
    textColor: "{colors.white}"
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "0.12em 0.55em 0.05em"
  legend-swatch:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "0.08rem 0.5rem"
  footer:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.cloth}"
---

# Design System: Osho: the discourses, 1954 to 1990

This file describes the page as built. The source of truth is `assets/site.css` (tokens are custom properties on `:root`), `assets/site.js` and the markup written by `scripts/build.py`. If this file and the stylesheet disagree, the stylesheet is right and this file needs correcting.

## Overview

**Creative North Star: "The Block-Printed Cloth"**

The page reads like a length of hand-printed cotton: a warm unbleached ground, four dye colours, and a repeating printed border that opens the page, every year, and the footer. Colour is flat and saturated. Nothing is shaded, blurred or lifted; a frame is a solid band of one dye with a thin band of another around it.

The content is a long reference table, so the decoration stays at the edges. Borders, arches and the big year numeral mark where a year starts; inside a year the table is plain text on cloth with dotted rules, and colour is used only where it carries meaning (a camp, a language, a count).

**Key Characteristics:**
- Cotton ground with indigo, madder, turmeric and leaf green as the only dyes.
- A printed dot-medallion border, drawn with CSS radial-gradient repeats, at every major boundary.
- Arched frames for photographs and maps, each with an indigo band and a turmeric outline.
- Dotted indigo rules instead of solid lines.
- One display face for names and numerals, one text face for everything read at length.

## Colors

Four dyes on cotton. Each dye has a fixed job and the jobs do not swap.

### Primary
- **Indigo** (`indigo`): the structural colour. Masthead and footer ground, table header band, frames, dotted rules, headings, dates, the towns line and the year band links.

### Secondary
- **Madder Red** (`madder`): emphasis and state. The year numeral, talk counts, the current year pill, Hindi language pills, link underlines, list markers, map town dots and the focus ring.

### Tertiary
- **Turmeric** (`turmeric`): the outline dye. The outer ring on every frame, the bands above and below the printed border, the masthead title and footer heading on indigo, English language pills and text selection.
- **Leaf Green** (`leaf`): meditation camps only. Camp rows, camp diamonds on the maps and the legend swatch.

### Neutral
- **Unbleached Cotton** (`cloth`): the page ground, and text on indigo.
- **Deep Cotton** (`cloth-deep`): pill hover and the placeholder behind a photograph.
- **Ink** (`ink`): body text, and text on turmeric.
- **Soft Ink** (`ink-soft`): captions, credits, source lines and row notes.
- **White** (`white`): text on madder and on leaf, and the stroke around map marks.
- **Row Hover** (`row-hover`): the hover tint on an ordinary table row.
- **Map Land** and **Map Water** (`map-land`, `map-water`): the two map fills. The map label halo uses the land colour.

`white`, `row-hover`, `map-land` and `map-water` are literal values in the stylesheet, not custom properties.

### Named Rules
**The Dye Job Rule.** Leaf green means a meditation camp and nothing else. Madder on a number means a talk count. Do not borrow either for decoration.

**The Turmeric Is Not Ink Rule.** Turmeric is text only on indigo (5.1:1). On cotton it is 1.8:1, so there it is an outline or a fill behind ink.

**The Measured Pairs Rule.** Text uses the pairs the build already uses: ink on cotton 13.7:1, soft ink on cotton 7.8:1, indigo on cotton 9.2:1, madder on cotton 4.8:1, cotton on indigo 9.2:1, white on madder 5.8:1, white on leaf 5.1:1, ink on turmeric 7.7:1. Madder on indigo (1.9:1) and madder on leaf (1.2:1) are not text pairs.

## Typography

**Display Font:** Yatra One (with Georgia, serif), weight 400 only.
**Body Font:** Hind (with system-ui, sans-serif), weights 400, 600 and 700.

Both are self-hosted Latin subsets in `assets/fonts/` with `font-display: swap`. Figures are lining and tabular throughout so dates and counts align.

**Character:** Yatra One is a heavy, brush-cut face used large for names and years. Hind is a plain humanist sans that stays out of the way in long tables.

### Hierarchy
- **Display** (400, clamp(2.6rem, 8.4vw, 5.6rem), 0.95): the masthead title. Turmeric first line, cotton second line.
- **Numeral** (400, clamp(4.6rem, 47cqi, 13rem), 0.9): the year in the left rail, in madder. Sized against the rail's width with a container query unit; clamp(4.4rem, 22vw, 9rem) once the rail stacks.
- **Headline** (400, clamp(2rem, 3.8vw, 3rem), 1.05): the heading of each year, in indigo. The reading notes heading and the footer heading are one step smaller.
- **Title** (400, 1.35rem, 1.15): the towns line under the numeral, in indigo.
- **Body** (400, 1.0625rem, 1.55): ledes and table cells. Ledes are capped at 62ch, the rail summary at 34ch, footer paragraphs at 60ch. Body drops to 1rem at 640px and below.
- **Caption** (400, 0.875rem, 1.4): map captions and source lines in soft ink. Photo captions and credits are 0.8rem.
- **Nav** (600, 1rem, 1): year band links.
- **Label** (700, 0.8rem, 0.08em, uppercase): table column headers only.
- **Tag** (700, 0.7rem, 0.06em, uppercase): language pills only.

### Named Rules
**The Weight Is Data Rule.** In a table, weight 700 on a title means a titled series; an untitled talk is weight 400. Dates are 600. Do not bold a title for emphasis.

**The Two Uppercase Places Rule.** Uppercase with letter-spacing appears in column headers and language pills, nowhere else.

## Layout

One page, full width, with a fluid side gutter (clamp(1.1rem, 4.5vw, 4rem)) and no max-width container. Order: masthead, sticky year band, reading notes, one section per year, footer.

- **Masthead:** two columns, title left and a short summary right (16 to 22rem), bottom aligned.
- **Year band:** sticky at the top, at least 3rem tall, one row that scrolls sideways with a hidden scrollbar. Anchor jumps leave room for it (`scroll-padding-top`).
- **Year section:** two columns. A left rail (minmax(16rem, 24%), 30% from 1200px) holds the numeral, towns, summary and map; the body holds the heading, lede, photograph, table and source line. A 3px dotted indigo line divides them. On viewports wider than 860px and taller than 880px the rail content sticks under the year band.
- **Opener:** lede beside the photograph (14 to 26rem); the photograph drops below the lede at 1100px.
- **Tables:** fixed layout. Dates 11.5rem, place 27%, talks 6.6rem right aligned, the series column takes the rest.

Responsive changes:
- **1100px and below:** photograph stacks under the lede and becomes 16:9, capped at 34rem.
- **860px and below:** every grid becomes one column. The rail turns into a header block with the map beside the numeral, and its dotted line moves to the bottom edge.
- **640px and below:** the table header is hidden visually, each row becomes a small grid (dates and count on the first line, then title, then place), and the count gains its unit as text. The map goes full column, capped at 20rem.

Vertical rhythm is set per block rather than from a step scale. The only spacing tokens are the gutter, the band height and the two border heights (30px and 18px).

## Elevation & Depth

Flat. There are no drop shadows and no blur. `box-shadow` is used only as a hard zero-blur ring (`0 0 0 3px` or `0 0 0 4px` in turmeric) to print a second outline around a frame. Layering comes from colour bands: indigo over cotton, leaf rows over cotton, the sticky year band over the page.

### Named Rules
**The Two-Band Frame Rule.** Anything framed gets an indigo border and a turmeric ring outside it: photographs (6px and 4px), maps (3px and 3px), the rail stud (5px and 3px).

## Shapes

- **Arch:** photographs and maps sit in a window with a rounded top and nearly square bottom corners. The photograph is `50% 50% 6px 6px / 66.6% 66.6% 6px 6px` at 4:3; the map is `50% 50% 8px 8px / 30% 30% 8px 8px`.
- **Pill** (999px): year band links and language pills.
- **Soft corner** (8px): the outer top corners of the table header and the ends of a camp row. The legend swatch uses 4px.
- **Circle:** the rail stud, map town dots, the dashed "uncertain" ring. Camps on a map are diamonds (a 9px square turned 45 degrees).
- **Dotted rules:** 2px dotted indigo under the year band and above the legend, 3px on the rail, 2px at 35% opacity between table rows, 1px dotted cotton at 40% between footer links.

## Components

### Printed border
The signature. A horizontal strip of repeating medallions on indigo: a turmeric disc, a cotton disc inside it, a madder dot at the centre, each a `radial-gradient` layer on the same repeat. It is a pseudo-element with no markup.
- **Large** (30px repeat, 3px turmeric bands above and below): under the masthead and at the top of the footer. Adds a small turmeric dot between medallions. Stored as the `--print` custom property.
- **Small** (18px repeat, 2px turmeric bands): at the top of every year section. Written inline in the year rule, not derived from `--print`.
- Hidden in print.

### Masthead and footer
Indigo ground, cotton text. Links in the footer underline and hover in turmeric instead of madder, and the focus ring there is turmeric.

### Year band
- **Style:** cotton ground, indigo links at weight 600, 2px dotted indigo line beneath.
- **States:** hover fills the pill with deep cotton; the current year is a madder pill with white text (`aria-current`, set by the script as sections cross the reading line). The band scrolls itself to keep the current pill centred.
- **Overflow:** while more years lie to the right, a cotton fade covers the right edge.
- **Motion:** background and colour ease over 0.25s with `cubic-bezier(.16, 1, .3, 1)`.

### Year rail
- **Numeral** in madder, with an optional indigo second line for a year range.
- **Stud:** a 27px cotton circle with the two-band frame, sitting on the dotted rail line. It fills madder and grows to 1.15 the first time its year reaches the reading line, over 0.6s, and stays filled.
- **Towns line** in the display face, then a one-paragraph summary.
- **Map:** arched SVG, water and land fills, land outlined in indigo, madder dots for towns, leaf diamonds for camps, bold 11.5px indigo labels with a land-coloured halo.

### Photograph
Colour photograph, `object-fit: cover`, in the arch with a 6px indigo border and 4px turmeric ring. Caption and credit beneath in soft ink at 0.8rem; the credit is on its own line.

### Table
- **Header:** indigo band, cotton uppercase labels, rounded outer top corners.
- **Rows:** 2px dotted rule beneath. Dates in indigo 600, counts in madder 700 right aligned, notes in soft ink at 0.9rem on their own line. Ordinary rows tint on hover.
- **Camp row:** leaf green with white text, 8px rounded ends, separated from its neighbours by a 3px cotton line instead of the dotted rule. No hover tint.
- **Language pill:** after the title where a year mixes languages. Turmeric with ink text for English, madder with white text for Hindi.
- **Uncertain mark:** a small dashed ring in the current text colour after a date, place or count the source marks as uncertain.
- **Outside links:** one quiet line under the title: `Listen`, `Video`, `Wiki`, then any hand-added links, always in that order. Indigo 600 text at 0.86rem with a small icon, no fill or border; madder with underline on hover. White in camp rows. Each link's accessible name includes the series.
- **Series length:** under the count, soft ink at 0.78rem: `of 44 · 71 h`, shown only when the wiki's whole series is longer than the row.
- **Month divider:** in years of more than 20 rows, a madder display-face month name on a dotted madder rule.
- **Repeated place:** when a row's place matches the row above, the cell shows a soft ditto mark; the full place stays in the markup for screen readers.
- **Key:** a one-line reminder of the marks under every year's table.
- **Phone:** the place moves under the title, before the links. Year pills and links are at least 44px tall. The rail's map or month strip runs the full column under the summary, the map capped at 20rem, with its caption shown. The current year in the band is a 36px madder circle drawn inside the 44px link.
- **Month strip:** replaces the map in a year with one place. Twelve madder bars, height by listed talks per month, in the arched frame.
- **Route:** where a year sets `route`, a dashed madder line joins its places in the order he spoke there (1986).
- **Closing:** where a year sets `closing`, its table is replaced by dates in madder display type, each followed by one line. Used for 1990.
- **Reading tour:** under the year band, an opening line in the display face (“A free, non-commercial library of when and where Osho spoke.”) and four arched cards beside three real rows from 1964. One card shows at a time; each has its own tone (indigo, leaf, madder, turmeric), a numbered disc, a line icon and a printed medallion strip on top. The current card dims the other example rows and outlines the part it describes. Back, Next and the arrow keys move through it; without JavaScript all four cards show as a grid.
- **Series search:** a pill input in the masthead under the standfirst, turmeric ring on indigo. Results drop down in a cotton panel with an indigo border, up to 12, each the title in indigo bold over the year and dates. Choosing one jumps straight to the row (no smooth scroll) and tints it gold. Hidden when JavaScript is off.
- **Decade labels:** small madder display-face labels (60s, 70s, 80s, 90s) in the year band; not links.

### Links and focus
Links keep the text colour with a madder underline and turn madder on hover. Focus is a 3px madder outline offset 3px.

### Reduced motion and print
With reduced motion, smooth scrolling and both transitions are off. In print, the year band and printed borders are removed, indigo grounds drop to plain ink on white, camp rows become bold with a solid rule, and each year starts a new page.

## Do's and Don'ts

### Do:
- **Do** take colours from the custom properties in `assets/site.css`; add a new one there before using it.
- **Do** open a new top-level block with the printed border: large (30px) for page-level bands, small (18px) for a year.
- **Do** frame any new image or map in the arch with an indigo border and a turmeric ring.
- **Do** use dotted indigo rules for dividers.
- **Do** keep leaf green for meditation camps and madder numbers for talk counts.
- **Do** check any new text and background pair for WCAG AA before shipping it.
- **Do** keep both transitions and smooth scrolling behind `prefers-reduced-motion`.
- **Do** keep fonts, images and scripts self-hosted; the page makes no external requests.

### Don't:
- **Don't** add blurred shadows or soft glows. The only `box-shadow` here is a hard outline ring.
- **Don't** set turmeric text on cotton, or madder text on indigo or leaf green.
- **Don't** use photographs of Osho, or any photograph whose subject is an identifiable private person.
- **Don't** add ashram, foundation or publisher branding.
- **Don't** use em-dashes in copy.
- **Don't** reorder rows or sections; date order is the structure of the page.
