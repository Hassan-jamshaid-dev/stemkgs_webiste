# Image audit

Inspected the files referenced from HTML, CSS, and JS under `assets/images/`. Each file was opened (full frame, or a contact sheet plus a corner zoom). The two WhatsApp zips from 27 Sep 2026 were checked for a cleaner file of the same scene. No second image folder was added. `logo.jpg` was not replaced. Nothing was committed or deployed.

Hero images stay `loading="eager"`. Existing per-photo `object-position` values were left as they are. Gallery cards that would crop certificate or banner text use `object-fit: contain`.

## Cropped

| Path | Where used | Problem | Action | Remaining issue |
| --- | --- | --- | --- | --- |
| assets/images/event-rush.jpg | Home hero, gallery | Solid black bars at the top and bottom of a phone screenshot | Cropped to 738×1553 | None seen |
| assets/images/kgso-blue-polos.jpg | Home hero, gallery | Solid black bar across the top | Cropped off the top 19px (720×723). Backdrop lettering kept | None seen |
| assets/images/kgso-audience-collage.jpg | Home hero, gallery | Instagram post: username, music line, like/comment/repost/save row | Cropped the header and footer (720×490) | `3/13` badge, child-face sticker, and mute icon sit on the photos. Neither zip has this collage without the interface |
| assets/images/kgso-teams-collage.jpg | Home hero, gallery | Same Instagram chrome as the audience collage | Cropped the header and footer (720×492) | `7/13` badge, sticker, and mute icon remain on the photos. No cleaner original in the zips |
| assets/images/formula-pakistan-team.jpg | Home hero, gallery | Story counter `2/6` in the top-right of the black ceiling | Cropped the top 82px (720×578). Heads and the paper in hand kept | None seen |
| assets/images/lab-workshop.jpg | Gallery | Phone screenshot: large black letterbox and the home indicator | Cropped to the photograph (739×554) | None seen |
| assets/images/chem-member-1.jpg, chem-member-2.jpg, chem-member-3.jpg, chem-member-4.jpg | chemistry.html | Story counter and a black strip under the orange rule | Counter and black strip cropped (696×801). Orange rule kept | Mute icon in the bottom-right corner |
| assets/images/chem-team.jpg | chemistry.html | Story counter and black strip | Cropped (696×809). Whole group kept | Mute icon |
| assets/images/chem-team-orange.jpg | chemistry.html | Story counter and black strip | Cropped (696×808). “CHEM TEAM” kept | Mute icon |
| assets/images/maths-member-1.jpg through maths-member-5.jpg, maths-team.jpg | maths.html | Story counter in the top corner | Top cropped (696×802). Role text and the group kept | Mute icon. A repost arrow sits on the society mark, so the mark was not cropped away |
| assets/images/maths-team-red.jpg | maths.html | Story counter | Top cropped (696×799). “MATH TEAM” kept | Mute icon and repost arrow on the society mark |
| assets/images/physics-member-1.jpg through physics-member-6.jpg | physics.html | Partial story counter at the top edge | Top cropped (696×814). Names kept | Mute circle at the bottom-right, on or beside the shirt |
| assets/images/physics-team.jpg | physics.html | Partial counter above the group | Top cropped (696×820). All six people kept | Mute circle |
| assets/images/physics-team-title.jpg | physics.html | Partial counter | Top cropped (696×824). “PHYSICS TEAM” kept | A small edge sliver and a partial mute circle |
| assets/images/crime-member-1.jpg through crime-member-5.jpg, crime-team.jpg, crime-team-red.jpg | crime.html | Pale counter remnant along the top | Top 18px cropped (696×852). Maroon rule and “CRIME TEAM” kept | Partial mute icon at the bottom-right |
| assets/images/cs-member-1.jpg through cs-member-5.jpg, cs-team.jpg, cs-team-title.jpg | computer-science.html | Thin black sliver of a counter at the top | Top 14px cropped (696×856). Blue side rules kept as part of the graphic | Mute icon at the bottom-right |
| assets/images/bio-member-2.jpg through bio-member-5.jpg, bio-team-green.jpg | biology.html | Pale counter remnant at the top | Top cropped (692×686). Role text and “BIOLOGY TEAM” kept | bio-member-2.jpg still has a “11” fragment and a white square beside the name. Those sit on the portrait |
| assets/images/bio-member-1.jpg | biology.html | Pale counter remnant | Top cropped (692×682) | A small tan sliver at the top-right and a white square at the bottom-right |
| assets/images/bio-team.jpg | biology.html | Pale counter remnant | Top cropped (692×680). All five people kept | A small light sliver remains at the top-right |

## Needs a better original

These could not be cropped without cutting a head, a name, the society mark, or award text. They were not painted over.

- `assets/images/kgso-audience-collage.jpg` and `assets/images/kgso-teams-collage.jpg` — sticker, carousel badge, and mute icon on the photographs. The 27 Sep zips do not contain a clean copy of either collage.
- Team story graphics listed above — mute icons, and the repost arrow on the maths graphics. The corner icons overlap the person or the society mark.
- `assets/images/science-bowl-1.jpg` (interhouse.html) — a dark rectangle in the top-right sits on a student’s hair. Cropping that edge would cut other heads. science-bowl-2.jpg, science-bowl-3.jpg, and science-bowl-4.jpg did not show that rectangle.

## Inspected, not changed

No Instagram chrome was found. Event logos, poster lettering, and photographer framing were left as they are.

| Path | Where used | Note |
| --- | --- | --- |
| assets/images/logo.jpg | Favicon and brand mark on every page | Society mark. Left as-is |
| assets/images/nsb-trophy.jpg | Home hero, gallery | Trophy and NSB backdrop kept |
| assets/images/science-fair-certificates.jpg | Home hero (cover), gallery (contain) | Source photo already cuts the right side of the backdrop. Gallery card no longer crops the certificates |
| assets/images/award-ceremony.jpg | Home hero, gallery | Group and framed award kept |
| assets/images/formula-pakistan-award.jpg | Home hero, gallery | Black area is the tent ceiling, not a status bar |
| assets/images/formula-pakistan-habib.jpg | Home hero, gallery | Sponsor wall is part of the photo. The right edge is already cut in the file |
| assets/images/psifi-night.jpg | Home hero, gallery | 1600×1200 group photo. Not resized |
| assets/images/psifi-certificates.jpg | Gallery, contain | Certificates kept whole in the card |
| assets/images/psifi-airport.jpg | Gallery | Not a screenshot. The pixels are an outdoor booth (tent, balloons, “Rainbows Hair”), not the airport group described in the alt text. A different picture in the 27 Sep zip shows the airport group. The file was not swapped |
| assets/images/hackx-winners.jpg | Gallery, contain | Prize board kept whole in the wide card. Dark top is the tent |
| assets/images/science-fair-brain.jpg | Gallery | Booth photo, no interface chrome |
| assets/images/stem-booth.jpg | Gallery | Booth, banner, and balloons kept |
| assets/images/kgso-delegation.jpg | Gallery, kgso.html | Group and subject banners kept |
| assets/images/kgso-banner.jpg | Gallery, contain | Banner text kept whole in the card |
| assets/images/gauntlet-math.jpg, gauntlet-exam.jpg, gauntlet-focus.jpg, gauntlet-corridor.jpg, gauntlet-thumbs-up.jpg, gauntlet-chem.jpg, gauntlet-classroom.jpg, gauntlet-writing.jpg | Gallery; corridor, exam, focus, and thumbs-up also on gauntlet.html | Same bytes as the zip originals. Whiteboard text kept. Gallery width/height for math and writing was corrected to the real pixels (1280×720 and 1600×900) |
| assets/images/auditorium-stage.jpg, students-laptop.jpg, classroom-laptops.jpg, students-papers.jpg, lab-glassware.jpg, hall-green-seats.jpg, lab-teamwork.jpg | kgso.html | Small photographs, no interface chrome. Not upscaled |
| assets/images/science-bowl-2.jpg, science-bowl-3.jpg, science-bowl-4.jpg | interhouse.html | Wide classroom strips, no interface chrome |

## Not done

The library was not converted to WebP. No image was resized only because it is large. No unused file was deleted, because every cropped file is still referenced. A full pass of every viewport was not done: the browser tab would not open. `index.html`, `gallery.html`, and `gauntlet.html` were fetched from `http://127.0.0.1:8765/` and returned 200, with the hero still eager and the gallery contain rule present.
