# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v6.1.1] - 2026-09-18

### Added

- Make the White, Result and Black columns of the game archives table sortable, so the games can be ordered by either player's name or by outcome
- Remember how the game archives were last filtered and sorted, and open them that way on the next visit

### Changed

- Cap the opening column of the game archives table at a fixed width, with a longer opening cut short and given in full in a tooltip
- Show each game on its own, with the link to analyse it on Lichess and the link back to the archives listed together beneath the board, in place of the arrows to the games either side
- Order the figures above the game archives as games, players, tournaments and years
- Deepen the striped rows of tables in dark mode, so loading placeholders stand out on every row

### Fixed

- Highlight the whole row of the game archives table on hover, in the row's own text colour
- Keep the page in place when the game archives table is sorted
- Give the Releases heading on the website changelog page the same spacing as Behind the scenes

## [v6.1.0] - 2026-09-18

### Added

- Move the game archive into the database, with every player linked to their member profile so a name change carries through to their games
- Rebuild the Game Archives page around a table of every game, styled like the members table, that can be filtered by player, year and result and sorted by date, event, opening or length, with the filters kept in the page address and the page staying put as they change
- Give every game its own page with its details, a board to step through it, a link to analyse it on Lichess, arrows to the games either side within the current results that keep your place on the page, and a link back to the archives
- Offer a "Try again" button wherever a page or section fails to load, instead of leaving it loading
- Show upload progress while photos are being added to an album

### Changed

- Replace the full-screen dimming overlay with placeholders shaped like the content being loaded, now also shown in the editors, the schedule list and calendar, the members table and the image explorer
- Keep the article, event and member pages in place with a "Try again" button when they fail to load, instead of moving to the list page, while a link to something that no longer exists still leads home
- Keep content that is already on screen in place while it refreshes in the background
- Keep confirmation dialogs open, with a spinner on the confirm button, until saving, deleting, bookmarking or exporting has finished
- Show a spinner on the ratings import button while the file is being prepared
- Keep the pull-to-refresh spinner visible until the refreshed content has arrived
- Frame the introduction of the website changelog page in a card like its releases, and mark Game Archives with an archive icon in the navigation bar
- Give search fields, dropdowns, segmented controls and table paginators the same background as the site's other inputs in dark mode

### Fixed

- Stop the screen from dimming at unexpected times, such as during background refreshes
- Centre loading placeholders on the line of text they stand in for
- Fix the colours of the current page button under tables in dark mode
- Stop a page from loading forever when the server never responds
- Show the right error message when a CSV export fails

## [v6.0.4] - 2026-09-16

### Changed

- Show admins the same member profile pages that everyone else sees
- Display placeholder cards while a member profile is still loading
- Link the footer version to its release on the website changelog page, where each release now has its own link

### Fixed

- Fix blank fields in the edit member form for details that were already saved
- Load admin-only member details as soon as an admin logs in, with no page refresh needed

## [v6.0.3] - 2026-09-16

### Added

- Choose whether your year of birth appears on your member profile, from your account page

### Changed

- Show a placeholder while an article is still loading

### Fixed

- Fix blank page when opening an article from a direct link

## [v6.0.2] - 2026-09-16

### Changed

- Streamline website deployments

## [v6.0.1] - 2026-09-16

### Changed

- Collapse an open release on the website changelog page by clicking anywhere on its header

### Fixed

- Fix issues with loading photos and editing/deleting articles and events
- Redirect to the home page straight away when a member profile doesn't exist

## [v6.0.0] - 2026-09-15

### Added

- Introduce a slide-in login drawer with email code verification and a guided password reset flow, replacing the standalone login and change-password pages
- Build out an account page for managing your profile, avatar, email address, password, and active sessions, including an avatar editor that keeps the original photo for future re-cropping
- Support admin and non-admin user roles, with admin-only editing controls enforced across the site and API
- Let visitors request a member account from the login drawer, with email-code verification before each request reaches the club for review
- Email members when their details or rating change
- Add a Website Changelog page covering how the site is built and what has changed, with the tools behind it named as you hover them and every release listed as a card that opens with a click anywhere on it
- Add profile pages for members with an account, with ratings, activity status, and a trophy beside the reigning city champion, linked from their names across the site and always showing their current name
- Let members review their personal details and request changes from the account page, with the private details on their profile marked as such
- Add a Support the site link to the footer
- Show author avatars beside article bylines and edit history
- Back up the database and photo storage weekly to encrypted off-site storage

### Changed

- Consolidate the website and API into a single repository
- Update packages
- Replace AWS Cognito with Clerk for admin authentication and user management
- Redesign the navigation bar around a single menu, shown as your avatar once logged in, holding log in, theme, view, and safe mode controls
- Swap every Material icon for an Eagami UI icon across the site
- Switch site notifications to Eagami UI toasts, with clearer and friendlier wording throughout
- Make the table paginator buttons uniform squares
- Unify loading placeholders across the site with a consistent pulsing style
- Cap photo gallery album covers at 200px wide so wide view no longer stretches them
- Move photo storage from AWS S3 to Cloudflare R2

### Fixed

- Send unknown and malformed page addresses home instead of leaving an error on screen
- Correct two misspelled champion names on the City Champion page
- Keep login and logout confirmation toasts visible by completing auth redirects inside the app
- Refresh expired photo links at startup and stop duplicate or cancelled image requests
- Align the page content with the navigation bar in Safari, with or without a scrollbar
- Stop the link underline drifting upward when hovered in Safari

## [v5.13.8] - 2026-09-12

### Fixed

- Prevent the upcoming event banner from continuing to show an event that has been deleted

## [v5.13.7] - 2026-06-18

### Fixed

- Prevent schedule and home page event details from being cut off on narrow viewports
- Stretch the schedule events table to full width in wide view
- Scale article and image-explorer thumbnails to fill their image area instead of leaving gaps around small images

### Changed

- Update packages

## [v5.13.6] - 2026-05-17

### Fixed

- Opt the page out of automatic browser translation to prevent crashes from translator-induced DOM mutations

### Changed

- Update packages

## [v5.13.5] - 2026-05-03

### Added

- Display the backend version in the footer next to the frontend version
- Integrate Sentry for frontend error tracking

### Fixed

- Stop article card skeletons from collapsing into a row of 4-6 narrow cards on mobile while banner images load

## [v5.13.4] - 2026-05-03

### Changed

- Update packages

## [v5.13.3] - 2026-04-16

### Changed

- Link footer version number to the corresponding GitHub release page

## [v5.13.2] - 2026-04-16

### Fixed

- Ensure article cards span the full available width on mobile instead of shrinking to their text content
- Remove forced square aspect ratio on photo grid album covers so images display at their natural proportions
- Prevent the image component's shimmer overlay from flickering between the thumbnail and full-size image when the main URL loads asynchronously from the store

## [v5.13.1] - 2026-04-16

### Fixed

- Preserve app settings (dark mode, safe mode, banner preferences) across version upgrades
- Allow photo carousel keyboard navigation (arrow keys, Enter) to work after clicking any element in the carousel, not just the photo itself
- Prevent the events table on the Home page from forcing a horizontal scrollbar on narrow viewports

### Changed

- Update packages

## [v5.13.0] - 2026-04-15

### Added

- Introduce a shared image component that renders thumbnails immediately and then swaps in full-resolution images once they load, with a graceful fallback chain when either fails

### Changed

- Refresh presigned S3 image URLs based on the backend-reported expiration timestamp instead of parsing the URL, so URLs stay valid across browser sessions
- Only retry failed article banner images while the user is actually on a page that displays them, instead of polling in the background on every route
- Convert the largest static images on the City Champion, Lifetime Achievement Awards, and Game Archives pages to WebP, shrinking their combined weight from 3.6 MB to 264 KB (~93% smaller)
- Build shimmer skeleton loading states into the article grid, photo grid, and events table so every page that uses them shows contextual placeholders while data loads

### Fixed

- Keep the shimmer placeholder visible until an article banner image has actually loaded, instead of briefly flashing the fallback image while the home page warms up
- Prevent leaked prefetch timers in the image viewer when navigating away mid-prefetch
- Show the image component fallback asset immediately when no image is provided, instead of leaving the shimmer running indefinitely

## [v5.12.13] - 2026-04-13

### Changed

- Update packages

## [v5.12.12] - 2026-04-08

### Changed

- Update packages

## [v5.12.11] - 2026-04-02

### Changed

- Update packages

## [v5.12.10] - 2026-03-22

### Fixed

- Fix infinite loading spinner when publishing or updating an article fails due to session expiry
- Fix Image Explorer showing perpetual "Loading..." when opened from the article editor

## [v5.12.9] - 2026-03-20

### Fixed

- Remove incorrect 2025 winner from active championship past winners table

## [v5.12.8] - 2026-03-17

### Changed

- Update Active Championship and Junior Championship past winners tables on City Champion page
- Update publishable API keys for new GCP and Clerk accounts

## [v5.12.7] - 2026-03-06

### Changed

- Improve article card styling
- Always load up the 10 latest articles on the homepage and display them in a single, scrollable row instead of wrapping
- Link the event titles in the Upcoming Event Banner directly to the event's associated article instead of the Schedule page

### Fixed

- Prevent potential localStorage quota exceeded errors by removing old state keys before setting the corresponding new ones

## [v5.12.6] - 2026-03-06

### Fixed

- Fix a couple article card layout issues

## [v5.12.5] - 2026-03-05

### Added

- Automatically parse out the top-5 finishers from the results tables (open section) of blitz tournament articles, and use that as the summary for the article in the Article Grid

### Changed

- Improve the layout and formatting of the summary section for all other types of articles in the Article Grid

## [v5.12.4] - 2026-03-01

### Changed

- Update some wording on About and City Champion pages

## [v5.12.3] - 2026-02-28

### Changed

- Improve contrast between event type colours

### Fixed

- Fix race condition preventing items from being fetched when Members, News and Schedule pages are initially loaded

## [v5.12.2] - 2026-02-25

### Changed

- Reduce height of schedule section on Home page when on mobile

### Fixed

- Include event modification info in cache key in Events Calendar component to ensure ordering of same-day events is updated whenever any of the events change

## [v5.12.1] - 2026-02-25

### Changed

- Increase contrast between rapid tournament and championship event colours

### Fixed

- Ensure that initial batch of articles, events and members are loaded on their respective pages
- Keep ordering of same-day events the same in Upcoming Event Banner, Events Calendar and Events Table components

## [v5.12.0] - 2026-02-25

### Added

- Simplify the layout of events in the Events Table
- Improve handling of multiple events that occur on the same day
- Display multiple next events in the Upcoming Event Banner if they happen to fall on the same day and start time
- Display a striped background in the Upcoming Event Banner using the colours from each event

### Changed

- Only make the first two table columns sticky for the Results and Ratings Report tables in articles (i.e. allow other tables that begin with a '#' header to behave normally)
- Extend the list of allowable characters in the article body

### Fixed

- Ensure article banner re-fetch mechanism is not dependent on whether Home page or News page have already been loaded

## [v5.11.14] - 2026-02-07

### Changed

- Increase size of social link icons in footer
- On the Game Archives page, automatically expand games from the first available year whenever the filter changes and the currently open year no longer has any games to show

### Fixed

- Resolve some more version control and cache-related issues

## [v5.11.13] - 2026-02-07

### Fixed

- Resolve an issue where Safari users would see a blank page due to cached state from the previous version

## [v5.11.12] - 2026-02-06

### Fixed

- On the Game Archives page, ensure PGNs for the currently open year automatically update whenever a filter is changed
- Fix a bug where members with provisional and non-provisional ratings (but the same base rating) would sometimes not be sorted correctly in the Members Table

## [v5.11.11] - 2026-02-03

### Fixed

- Prevent image file source text from briefly appearing sometimes while image loads

## [v5.11.10] - 2026-01-27

### Fixed

- Fix some issues with 'wide view' and keep the first two columns' widths constant for results tables, regardless of view setting

## [v5.11.9] - 2026-01-26

### Added

- Add 'Wide view' toggle option under User Settings to extend content area of pages beyond default limit

## [v5.11.8] - 2026-01-25

### Added

- Add 'Desktop view' toggle option under User Settings, which simulates a 1200px-wide screen as if on desktop

## [v5.11.7] - 2026-01-17

### Added

- Add PGNs for 2025 LCC Championship

### Changed

- Improve table layout in articles

## [v5.11.6] - 2026-01-03

### Fixed

- Fix some more issues with article images

## [v5.11.5] - 2026-01-01

### Fixed

- Fix a few more issues with embedded images in articles

## [v5.11.4] - 2026-01-01

### Changed

- Improve article layout and add support for more characters and images in article body

## [v5.11.3] - 2025-12-31

### Changed

- Improve handling of multiple embedded images in articles

## [v5.11.2] - 2025-12-31

### Fixed

- Fix an image upload bug

## [v5.11.1] - 2025-12-29

### Changed

- A few minor style and wording improvements

## [v5.11.0] - 2025-12-29

### Changed

- Update City Champion page and Members table with new 2025 London Chess Champion
- Revamp About and Regional Clubs pages

### Fixed

- Fix a bug causing article banner images to remain blurred after the image has loaded

## [v5.10.9] - 2025-12-07

### Added

- Add PGNs for 2025 LCC Championship

## [v5.10.8] - 2025-11-27

### Added

- Create a dedicated Regional Clubs page, accessible from About page and footer; add Stratford club and some contact emails
- Add support for fancy quotes and additional typographic characters in text fields (curly quotes: ' ' " ", guillemets: ‹ › « », bullet: •, ellipsis: …, section sign: §, copyright/trademark: © ® ™, degree symbol: °, prime symbols: ′ ″)

### Fixed

- Close any open dialogs on navigation

## [v5.10.7] - 2025-11-22

### Fixed

- Clear any orphaned loading call states upon rehydration

## [v5.10.4] - 2025-11-21

### Fixed

- Add backslash to list of accepted characters in form fields and add a proper validation error tooltip message for id validator

## [v5.10.3] - 2025-11-21

### Fixed

- Apply correct styling rules to disabled buttons in forms
- Add en-dash to list of accepted characters in form fields

## [v5.10.2] - 2025-11-19

### Fixed

- Force a reset of stale data for any local storage keys from v5.9.x or older

## [v5.10.1] - 2025-11-19

### Fixed

- Bust image cache with each new app version release and remove some potential race conditions when determining what image data to fetch and when
- Ensure new special embedded image syntax is hidden from article previews

## [v5.10.0] - 2025-11-18

### Added

- Allow for up to 3 images inside the article body, with support for custom sizing and caption text under each image
- Transform the next event banner at the top of the screen into a looping marquee banner if there isn't enough room to display all the text
- Add a button in the user settings menu to immediately fetch any new website data (by default fetched automatically every 30 mins). Also implement a basic pull-to-refresh mechanism on mobile to do the same thing.
- Add support for GIFs
- Add support for various international alphabets and unicode symbols for most string-based text fields such as member's first & last name, album title, and image caption

### Changed

- Spruce up photo grid, article grid and game archives with some fade-in animations
- If the presigned URL for the full-size version of an image is expired, temporarily fall back to the thumbnail if available and valid

### Fixed

- Ensure an image added to a brand new album automatically becomes that album's cover for the photo grid mosaic

## [v5.9.17] - 2025-11-17

### Fixed

- Ensure album form can simultaneously handle addition of new images and update of existing ones

## [v5.9.16] - 2025-11-15

### Changed

- Minor style tweaks and improvements in a few places

### Fixed

- Improve handling of expired presigned URLs to prevent certain thumbnail images from not rendering

## [v5.9.15] - 2025-11-11

### Added

- Add Baden Chess Club to list of regional/satellite clubs on homepage and improve layout of club cards

## [v5.9.14] - 2025-11-07

### Added

- Preserve users' app preferences (e.g. light/dark mode, filter & pagination settings) whenever a new version of the web app is released

## [v5.9.13] - 2025-11-04

### Added

- Improve how event information is displayed and handled in Event Calendar Grid with new Event Info Dialog component
- Preserve light/dark mode and other app preferences when a new version of the web app is deployed

## [v5.9.12] - 2025-11-03

### Added

- Add support for commas in uploaded CSVs wherever values are wrapped in double-quotes (RFC 4180 standard)

### Fixed

- Fix a few bugs related to new user activity / auto-logout flow, and extend admin user inactivity limit to 3 hours

## [v5.9.11] - 2025-11-02

### Added

- Add PGNs for 2025 LCC Championship

## [v5.9.10] - 2025-11-01

### Added

- Add Glencoe Chess Club to list of regional/satellite clubs on homepage
- Create a new reusable Session Expiry Dialog component and Duration pipe for converting raw millisecond values to MM:SS format

### Changed

- Several improvements to admin session management and auto-logout flow

## [v5.9.9] - 2025-10-17

### Added

- Add PGNs for 2025 LCC Championship

## [v5.9.8] - 2025-10-17

### Changed

- Initially display first moves of games in PGN Viewer widget

### Fixed

- Fix some bugs related to how the dialog behaves when switching between documents on the Documents page

## [v5.9.7] - 2025-10-11

### Added

- Add PGNs for 2025 LCC Championship

## [v5.9.6] - 2025-10-05

### Added

- Add PGNs for 2025 LCC Championship

## [v5.9.5] - 2025-09-26

### Added

- Add PGNs for 2025 LCC Championship

## [v5.9.4] - 2025-09-19

### Added

- Add PGNs for 2025 LCC Championship

### Changed

- Minor style adjustments to tooltip fade-in effect, nav bar icons on hover, event indicators in Schedule page calendars, and icons next to Lichess analysis board links

### Fixed

- Fix a few bugs related to the shape of the form data being sent to and expected from the backend
- Fix a few bugs related to form change detection and unsaved change checks resulting in validation icons sometimes not appearing or the form displaying the incorrect change status

## [v5.9.3] - 2025-09-18

### Fixed

- Ensure dialog and admin control overlays render above sticky app header

## [v5.9.2] - 2025-09-14

### Changed

- Update Junior Championship table to include 2025 winner

### Fixed

- A few minor adjustments to text on City Champion page and app footer
- Ensure form data is preserved during background data fetches

## [v5.9.1] - 2025-09-08

### Changed

- Widen tooltips in Calendar Events Grid and navigate to the associated article (if there is one) when clicked

### Fixed

- Prevent blank tooltips from sometimes appearing on Champion Page

## [v5.9.0] - 2025-09-07

### Added

- Add a new Photo Carousel component on the City Champion page that auto-cycles through championship photos, with the ability to cycle through manually by keyboard or by clicking on the dots
- Initially display only 10 rows in each past champions table on the City Champion page, with the ability to see the remainder of rows by clicking on the ellipses in the table footers
- Add some subtle animations and minor layout tweaks to the City Champion page
- Revamp Schedule page with pagination, filtering and search highlighting (as on News and Members pages)
- Redesign Events Table component with new circular date widgets (to take up far less space on mobile)
- Integrate a new Schedule Toolbar below pagination/filtering which offers the ability to 1) view events in either 'list view' or 'calendar view', 2) scroll down to the today if visible on the current page, 3) export events in iCalendar format, which can then be imported into Google Calendar, Apple Calendar or Microsoft Outlook
- Add the ability for admins to export all events in a .CSV file (as recently made available for Members)

### Fixed

- Fix issue preventing Album Editor from loading for certain albums

## [v5.8.5] - 2025-09-02

### Changed

- Configure 'on-push' change detection strategy on all page components to limit screen checks to only when inputs change, resulting in a slightly more performant web app

### Fixed

- Fix issue where all album covers would sometimes not fetch on initial load

## [v5.8.4] - 2025-08-31

### Changed

- Minor touch-ups to cards in Article Grid and Image Explorer
- Fetch image metadata, article banner thumbnails and album cover thumbnails in the background to keep app responsive and avoid displaying unnecessary loading spinner while they load

### Fixed

- Clean up fragment URL from browser address bar whenever Document Viewer dialog on Documents page is closed

## [v5.8.3] - 2025-08-29

### Changed

- Fix article preview banner image section to 3:2 aspect ratio on larger screen sizes
- Fetch only the missing article banner images to help reduce Home Page and News Page load times

### Fixed

- Pre-load club logo image in app header to prevent layout shift as page context loads
- Ensure article bookmark icons appear after initial page load
- Ensure articles' table of contents headings render as expected

## [v5.8.2] - 2025-08-25

### Changed

- Set the change detection strategy on all reusable components to `OnPush` for a notable performance boost across the entire app

## [v5.8.1] - 2025-08-25

### Changed

- Increase input text font size to prevent native zoom-on-focus behaviour on iPhones

### Fixed

- Ensure article banner images always load on initial page load

## [v5.8.0] - 2025-08-24

### Added

- Add support for bulk member rating updates through CSV import
- Add a button on the home page that links to our tournament registration Google Docs form
- A new page loader animation!
- Add image request tracking mechanism and failsafes to help prevent orphaned loading states/ missing banner images during network outages, etc.

### Changed

- Some minor improvements to chess openings lookup and responsiveness on Game Archives page

### Fixed

- List the full-size images' file size, width and height in Image Explorer and ensure Admin Controls automatically hide on scroll
- Prevent default scrolling behaviour on content behind Image Viewer overlay when using arrow keys, and a few other minor fixes to image navigation

## [v5.7.0] - 2025-08-21

### Added

- Add ability for admins to export entire members database to a CSV file to allow for easier integration with SwissSys software
- Integrate Data Toolbar with the News page for quicker navigation through articles, and the ability to search by article author, title or any text within its body
- Integrate Data Toolbar with the Image Explorer for quicker navigation through photo collections, and the ability to search by image filename, caption or album
- Highlight all occurrences of the search query
- Create a reusable Admin Toolbar component for the admin links and buttons displayed above various sections; add new admin icon or colour in admin-only access areas

### Changed

- Improve pagination summary text at bottom of the Data Toolbar component and include an 'ALL' page size option to view all items on a single page

### Fixed

- Fix a couple loading and layout issues with Photo Grid

## [v5.6.2] - 2025-08-13

### Fixed

- Ensure article headings are sized appropriately, and a few other minor typography adjustments

## [v5.6.1] - 2025-08-13

### Changed

- Reduce number of photo albums displayed on the homepage now that that section takes up less space

### Fixed

- Fix typo in filter counter section of new Data Toolbar component

## [v5.6.0] - 2025-08-13

### Added

- Create a reusable Data Toolbar component for pagination, filtering, and search controls on any given collection, and integrate with the Members Table

### Changed

- Minor style and layout tweaks to Article Grid, Photo Grid, and all tables

## [v5.5.5] - 2025-07-17

### Added

- Add players' ratings to past winners' table on City Champion page
- Add past winner tables for active, speed and junior championships
- Remove remaining links to the old website and Google Drive now that all data has been copied over

## [v5.5.4] - 2025-07-17

### Added

- Create a Cache Control HTTP request interceptor to have more granular control of how browsers cache stale image data

### Fixed

- Reduce cache window from 30 mins to 10 mins, and ensure expired presigned URLs are fetched when within the window

## [v5.5.3] - 2025-07-16

### Added

- Increase image file size limit to 2.5 MB and ensure only up to 20 images can be uploaded at a time
- Create new album ordinality property on images for a more explicit way of ordering images in an album

## [v5.5.2] - 2025-07-13

### Added

- Create new KeyState service, and a few new device utility functions; use them to display delete button in Admin Controls only when ctrl/cmd is pressed

### Fixed

- Fix broken link in footer

## [v5.5.0] - 2025-07-12

### Added

- Support uploading, editing, and deleting multiple images at a time
- Several improvements to resource fetching and caching for quicker page loads and fewer API requests
- Build out website footer to include the club logo, social media links, and a proper site map
- Display tooltip or admin controls menu on touch devices whenever a long-press touch event is detected
- Create Safe Mode Notice component to be displayed wherever users' personal information is hidden from view
- Make wording in dialogs/modals more consistent throughout the app
- Add a restore button in all forms that conveniently reverts form to its initial state without having to navigate away from the page

### Changed

- Some minor adjustments to the website colour palette and removal of repeating gradients for improved rendering of app header, table headers and article grid cards

### Fixed

- Various minor layout fixes in Navigation Bar and Form Error Icon components
- Ensure member/event/article form data is properly reset when unsaved changes are cancelled
- Prevent multiple of the same dialogs from stacking and ensure Document Viewer dialog automatically closes when the page is exited

## [v5.4.4] - 2025-06-27

### Changed

- Improve Navigation Bar icon styling

### Fixed

- Ensure article banner image is loaded when navigating through 'More details' link on Schedule page

## [v5.4.3] - 2025-06-22

### Added

- Add this year's Lifetime Achievement Award recipients and remove incomplete sections from Lifetime and Champion pages

### Fixed

- Ensure Markdown Renderer delays rendering of article until app-specific styles have been applied
- Ensure image is only fetched when needed while on Article Viewer page
- Fix a couple minor styling inconsistencies in the Article Form component

## [v5.4.2] - 2025-06-22

### Fixed

- Prevent unnecessary image fetches

## [v5.4.1] - 2025-06-21

### Changed

- When logged in as an admin, display headers in Members Table in the old order to allow for easier comparing & syncing

### Fixed

- Refresh expiring images in batches to reduce load time

## [v5.4.0] - 2025-06-19

### Added

- Migrate from Feather icons to Material icons across the entire application
- Implement dynamic sizing for admin control buttons based on `config.buttonSize` property
- Apply icon-size mixin for consistent icon scaling and vertical alignment
- Scale caption text in Image Viewer based on screen size

### Changed

- Combine first name and last name columns in Members Table

### Fixed

- Fix icon sizing and positioning in various UI components
- Automatically refresh presigned URLs for all images prior to their expiry to prevent broken image links

## [v5.3.3] - 2025-06-14

### Fixed

- Ensure correct images are fetched during prefetching stage in Image Viewer

## [v5.3.2] - 2025-06-14

### Added

- Implement a prefetching strategy in Image Viewer for quicker image loading, and prevent unnecessary fetches where possible

### Changed

- A few minor aesthetic touch-ups in Image Viewer

### Fixed

- Only update caption in the Image Viewer once the previous/next image has fully loaded
- Ensure Champion page uses correct icon

## [v5.3.1] - 2025-06-10

### Fixed

- Minor improvements to Navigation Bar and Members Table

## [v5.3.0] - 2025-06-05

### Added

- Display a shield icon next to the city champion in the Members Table
- Add ability to copy article text with all the stylings intact

### Changed

- Various minor improvements and optimizations to images and the Image Viewer component

## [v5.2.1 - v5.2.12] - 2025-05-31 - 2025-06-01

### Changed

- Sort album images in Image Viewer component based on caption text

### Fixed

- Various minor bug fixes

## [v5.2.0] - 2025-05-31

### Added

- Allow multiple articles, events, members, and images to be viewed & edited simultaneously in multiple tabs
- Add the ability for admins to edit image captions and album titles, as well as to delete photos directly from the Photo Viewer
- Create new Lifetime Achievement Awards page to list all past recipients of the award
- Support markdown blockquotes in articles
- Choose more appropriate icons for some pages
- Append `| LCC` to the end of browser tab page titles for all pages except the homepage

### Changed

- Improve handling of navigation to admin-only routes when not logged in

## [v5.1.3] - 2025-04-17

### Added

- Limit loading spinner to 5 seconds to keep application interactive in the event an API request hangs

## [v5.1.2] - 2025-03-25

### Changed

- Update link to FIDE handbook

## [v5.1.1] - 2025-03-25

### Changed

- Replace 'Active Tournament' and 'Rapid Tournament' event categories with 'Rapid Tournament (25 mins)' and 'Rapid Tournament (40 mins)'; add time control to 'Blitz Tournament' event category for consistency

### Fixed

- Fix disabled button colour

## [v5.1.0] - 2025-03-22

### Added

- Reorganize club information by incorporating a couple new sections on the About page, and adding raised cards with links on the Home page
- Redesign Photo Grid and add support for albums
- Add new [Code of Conduct](https://londonchess.ca/documents#lcc-code-of-conduct.pdf) document and redact personal information from board meeting documents
- Add support for linking to any particular document on Documents page with # URL fragment (e.g. [londonchess.ca/documents#lcc-bylaws.pdf](https://londonchess.ca/documents#lcc-bylaws.pdf))
- Add tooltip to document download icons and prevent default browser document reader from opening when clicked
- Add a couple new photos from 2025 Rook's Revenge tournament
- Increase allowable image upload file size to 4MB

### Changed

- Improve table layout in About screen leadership section; list new assistant tournament director position under Coordinators
- Increase size of link text and display underline animation when hovering over links
- Decrease load times by reducing the size of some excessively large static assets downloaded on initial load
- Replace full-width expansion panels on Games Archives page with buttons to make better use of the space

## [v5.0.2] - 2025-02-09

### Added

- Add support for ordered lists and width settings on article images in markdown editor

## [v5.0.1] - 2025-02-06

### Fixed

- Minor bug fixes related to Members table sorting, app layout on mobile, and some funny business with icons in this README file

## [v5.0.0] - 2025-02-05

### Added

- Implement a 'sticky' app header to keep app banners and navigation buttons visible when scrolling down a page
- Create a custom Date Picker component and implement in Event and Member Form component for date-related inputs
- Redesign admin controls and make them accessible via a custom context menu (right-click); add a new bookmark control for a simpler way of adding and removing article bookmarks
- Redesign article 'table of contents' section and have it auto-generate anchor links based on subheadings found in the article markdown data
- Create a new Image Explorer component to allow admin users to reuse existing articles images and to delete any unused ones from the database
- Create a new reusable Overlay service, with built-in mouse & key event listeners
- Create a new reusable Dialog component, with a built-in header and further mouse & key event listeners

### Changed

- Adjust layout and colour scheme in various places throughout app to remove any inconsistencies and generally improve the user experience (UX)
- Redesign tooltips and dialogs, and support layered dialogs for contexts where a confirmation dialog needs to be displayed over another dialog

### Fixed

- Prevent page reloads and smoothen scrolling behaviour when accessing anchor links (e.g. the `details` part of an article via `londonchess.ca/article123#details`)
- Prevent various bugs that occurred occasionally when working with article banner images
- Ensure clicking on admin controls and dialogs does not interact with any components below the overlay

## [v4.1.12] - 2025-01-24

### Changed

- Update About page with new membership fees for 2025–2028

### Added

- Add 'Incremental Plan to Break Even' PDF to Documents

## [v4.1.11] - 2025-01-04

### Changed

- Update About page with 2025 executive committee, directors and coordinators
- Update City Champion page with result from 2025 Championship

## [v4.1.10] - 2025-01-03

### Added

- Add PGNs for LCC Championship Playoffs

## [v4.1.9] - 2024-11-30

### Changed

- Re-sort 2024 PGNs

## [v4.1.8] - 2024-11-30

### Added

- Add PGNs for LCC Championship

## [v4.1.7] - 2024-11-19

### Added

- Generate favicons and icons for a wider range of devices and themes

### Changed

- Improve safe mode notice text styling
- Improve disabled button styling

### Fixed

- Reverse logic of safe mode toggle switch in Member Editor form
- Fix bug where a valid member ID in the URL was sometimes interpreted as invalid
- Fix bug where sometimes previous event or member would be loaded up when editing

## [v4.1.5] - 2024-11-17

### Added

- Add ability to show/hide sensitive information when logged in as admin wherever personal details may be displayed

### Changed

- Improve how image placeholders are handled and prevent layout shifts from occurring during article loading process
- Only display edit date on articles which were edited on a different date than the creation date

### Fixed

- Always attempt to fetch the latest article, member or club event whenever the page is refreshed
- Ensure single quotes appear as expected in article previews on Home and News pages

## [v4.1.4] - 2024-11-02

### Fixed

- Fix issue in Member Editor preventing new members from being added

## [v4.1.3] - 2024-10-31

### Changed

- Improve links at the bottom of article pages and a few more minor improvements to Article Editor

## [v4.1.2] - 2024-10-31

### Added

- Add support for multi-line event descriptions

### Changed

- Improve background/text contrast on disabled buttons
- Various minor improvements to the Article Editor

## [v4.1.1] - 2024-10-28

### Added

- Add PGNs for round 7 of LCC Championship

## [v4.1.0] - 2024-10-23

### Added

- Add a 'Analyze in Lichess' button for games in the Game Archives page which redirects you to Lichess' analysis board with the full PGN loaded
- Add 'Analyze this position' text to existing 'Analysis Board' button to help avoid confusion
- Display opening and result stats for filtered games
- Add support for null paths and tooltips to be passed in to Link component

### Fixed

- Prevent left-right arrow keys from controlling scrollbar in the expansion panel when a game is focused since they already control previous/next move in the Lichess PGN Viewer
- Add a newline character after the game termination marker, followed by an intentional blank line, to all PGNs in the Game Archives
- Ensure embedded images in articles are responsive and are always displayed at max-width

## [v4.0.19] - 2024-10-18

### Added

- Add PGNs for round 6 of LCC Championship

## [v4.0.18] - 2024-10-14

### Added

- Add PGNs for round 5 of LCC Championship

## [v4.0.17] - 2024-10-06

### Fixed

- Fix formatting of all PGNs in the Game Archives

## [v4.0.16] - 2024-10-05

### Added

- Add PGNs for round 4 of LCC Championship

## [v4.0.14] - 2024-09-28

### Fixed

- Add PGNs for round 3 of LCC Championship (Sections C, D and E)

## [v4.0.13] - 2024-09-27

### Fixed

- Add PGNs for round 3 of LCC Championship (Sections A and B)
- Reduce padding around Lichess PGN Viewer menu options

## [v4.0.12] - 2024-09-22

### Fixed

- Update some game PGNs and add remainder of games from second round of LCC Championship
- Sort 2024's PGNs by tournament round number

## [v4.0.11] - 2024-09-20

### Fixed

- Update game PGNs from first round and add some PGNs from second round of LCC Championship

## [v4.0.10] - 2024-09-13

### Fixed

- Add game PGNs from first round of LCC Championship

## [v4.0.9] - 2024-09-01

### Fixed

- Ensure article content persists on page reload when composing or editing an article

## [v4.0.8] - 2024-08-09

### Changed

- Update About page

## [v4.0.7] - 2024-08-05

### Changed

- Improve admin user authentication error handling and how toast notifications are displayed when the error message is long

### Fixed

- Fix bug where Article and Members pages would sometimes hang while loading

## [v4.0.6] - 2024-08-04

### Added

- Display scores next to players' names in the PGN viewer component
- Add the ability to filter games in the Game Archives page by first/last name, whether the player was White or Black, and the number of moves

## [v4.0.3] - 2024-06-29

### Added

- Remember user's show/hide past events preference in the Schedule component

### Fixed

- Ensure browser back button takes you back to the top of the article after navigating to a page anchor via the article's table of contents
- Fix Link List component's header colour theming

## [v4.0.2] - 2024-06-27

### Changed

- Improve colour contrast in warning toasts

### Fixed

- Send prefetch request with appropriate headers to article images API to prevent the need for CORS browser plug-ins when creating/editing articles

## [v4.0.1] - 2024-06-26

### Changed

- Some minor styling touch-ups
- Only display an article has been edited if it's at least 5 minutes after the creation time
- Remove all 'MB' and empty {Fritz} annotations from archived games' PGNs

## [v4.0.0] - 2024-06-25

### Added

- Introduce a dark mode, and add ability to toggle theme from the dropdown menu, defaulting to the user's browser preferences

### Changed

- Upgrade to Angular v18
- Overhaul redesign of colour theming throughout app
- Revamp the user settings dropdown menu (top-right of app header)
- Revamp the upcoming event banner (top of screen), and do not show again for at least 24 hours once it's been clicked
- Minor improvements to various UI components: buttons, tooltips, toasts, forms, screen headers, modification info boxes, event alert banners, and the page loading spinner

### Fixed

- Fix layout issue on Game Archives page
- Fix layout issue in app header when viewing app on a large screen

## [v3.3.2] - 2024-05-25

### Added

- Add more recent games (from 2017 to 2023) to club game archives

### Changed

- Various minor improvements to spruce up the Game Archives page

### Fixed

- Fix a bug which made only a handful of game PGNs accessible in each expansion panel

## [v3.3.1] - 2024-05-03

### Added

- Add support for linking scheduled club events to an article where more details can be found

## [v3.3.0] - 2024-05-02

### Added

- Highlight the London Chess Championship event in the new homepage welcome section

### Changed

- Improve styling of notification toasts

### Fixed

- Fix a bug which sometimes caused the page to redirect to a 404 error page
- Fix a bug which prevented the user from navigating to the same anchor (section) of an article multiple times consecutively

## [v3.2.0] - 2024-04-30

### Added

- Revamp home screen with a more user-friendly layout and links to club's Instagram page and noticeboard on WhatsApp
- Dynamically generate metadata and title for each individual screen so that screen-specific titles appear in the browser tab (e.g. tab now says 'Members' when viewing the members table)

### Changed

- Improve website SEO by 1) including more meaningful text within `<noscript>` tags for better description in SERPs, 2) using `<h1>` tags in Screen Header component, and 3) adding more meta tags to root index.html file

## [v3.1.3] - 2024-04-24

### Added

- Post PDFs of minutes from club's first three board meetings, as well as the club's bylaws
- Change article 'sticky' icon to be a bookmark

### Changed

- Change scrollbar colour to grey

### Fixed

- Ensure the next club event (in the app banner as well as the highlighted row on the Schedule screen) changes over at 9:00pm EST instead of midnight on Friday UTC time (which is currently equivalent to 7:00pm EST)

## [v3.1.2] - 2024-04-15

### Fixed

- Fix a bug where scheduled club events would get sorted by date in the reverse order

## [v3.1.1] - 2024-04-14

### Changed

- Display provisional peak ratings in Members Table in regular `XXXX/X` format instead of converting to `(provisional)` fallback text

### Fixed

- Several minor improvements and bug fixes related to article/member/event editing as well as image URL/file retrieval
- Fix a bug where the Members Table would unsort itself after a member was edited or deleted

## [v3.1.0] - 2024-04-14

### Added

- Implement article image placeholders and URL source fallbacks for better UX and to help prevent layout shift on page load when an image source is not loadable or unavailable
- Keep admin user on the Add Member and Add Event pages after a new item (member/event) has been successfully created, to prevent them from having to re-navigate to the page each time when adding multiple items
- Add ability to revert chosen article banner image when creating/editing an article
- Retain form state on page refresh, and store chosen image's URL in local storage

### Changed

- Style scrollbars more consistently across app

### Fixed

- Fix bug preventing admin user from setting an image on a new article

## [v3.0.12] - 2024-04-03

### Fixed

- Fix bug with article view & edit navigation

## [v3.0.11] - 2024-04-03

### Fixed

- Update packages

## [v3.0.10] - 2024-04-02

### Added

- Save working progress in forms so that refreshing the page does not return the form to the item's original state
- When linking directly to a 'create' or 'edit' screen for an item that could not be found in the store, make an API call to fetch that item before resorting to redirecting the user to another screen. This will allow the user to send links that take you directly to a specific article - the full collection of articles doesn't need to first be fetched from the database for this to work anymore

### Fixed

- Fix bug where non-admin users were able to access certain 'edit' screens (in readonly mode)

## [v3.0.9] - 2024-03-12

### Added

- Add a link in the app footer to the club's Instagram page
- Display a loading spinner whenever any database operation takes place, such as updating an article or deleting an event
- After an article has been published or edited, navigate the admin user to that article instead of the News screen
- After an article has been deleted, only navigate the user to the News screen if they're coming from the Article View screen

### Changed

- Change lecture event tag colour to blue to help differentiate from blitz tournament tags

### Fixed

- Ensure members table remains sorted after a create/edit/delete operation has completed

## [v3.0.8] - 2024-03-11

### Added

- Add support for linking to sections of article pages

### Changed

- Revert club map back to Google Maps' default red marker styling and improve marker's longitude and latitude co-ordinates

## [v3.0.7] - 2024-03-10

### Fixed

- Reinstate Angular Service Worker to prevent page from not being found when deep-linking into subroutes such as `/members` or `/news`

## [v3.0.6] - 2024-03-09

### Fixed

- Fix issue where Members table sometimes hangs when sorting

## [v3.0.5] - 2024-03-09

### Changed

- Replace 100-items per page option in paginator component with one that allows user to see _all_ table items at once

### Fixed

- Remove the option to install a bootable version of the website, and all ngsw (Angular Service Worker) related code

## [v3.0.4] - 2024-03-02

### Fixed

- Fix minor alignment issue in app footer

## [v3.0.2] - 2024-03-02

### Fixed

- No longer force user from refreshing the page when a new version of the website becomes available, and instead only display a notification in the app footer that a new version is available

## [v3.0.1] - 2024-02-05

### Added

- Migrate archived games (1974-2000) from old website
- Update City Champion screen with result from 2023 Championship match

## [v3.0.0] - 2024-01-24

### Added

- Show loading spinner over Photo Gallery photo while it loads
- Create a PGN viewer widget and use to display archived games in new Game Archives screen

### Changed

- Upgrade to Angular v17

### Fixed

- Remove spaces between link text and any punctuation that follows

## [v2.2.5] - 2024-01-18

### Changed

- Update main contact email to `welcome@londonchess.ca`

## [v2.2.4] - 2024-01-17

### Added

- Add next/previous image buttons on Photo Gallery screen

## [v2.2.3] - 2024-01-17

### Added

- Display each member's last update date in the members table

### Changed

- Carry over some markdown table features to the members table (i.e. horizontal scrollbar and larger font sizes)

### Fixed

- Fix issue preventing admin user from adding a new member without supplying certain optional properties
- Fix paginator tooltip text

## [v2.2.2] - 2024-01-12

### Fixed

- Fix various bugs which sometimes prevented an admin user from posting or editing an article

## [v2.2.1] - 2024-01-11

### Added

- Add fun chess pieces graphic to app header and update header font

### Changed

- Increase number of articles shown on the Home screen from 4 to 5

### Fixed

- Prevent tooltips from displaying out of screen's bounds

## [v2.2.0] - 2024-01-09

### Added

- Add ability to open any linkable item in a new tab by ctrl-clicking, and also display URL in browser on hover (previously was only possible on certain standard text links)
- Brief update on 2023 Championship Match (more details and photos to follow)

### Changed

- Various minor improvements to admin user dropdown component
- Scroll to top of screen after toggling past events in the Schedule screen

## [v2.1.0] - 2023-12-31

### Added

- Add support for 'sticky' articles, allowing admins to bump up selected articles to the top of the list
- Navigate to Home screen when clicking on either London Chess Club logo or text in main app header, and always in the current browser tab

### Changed

- Auto-expire warning toasts (red notifications in bottom-left of screen) just as with success toasts

### Fixed

- Fix bug causing unsaved changes dialog from appearing when editing an article, even when it was returned to its original state
- Fix some broken links on the About screen, and make sure they open up in a new tab when expected

## [v2.0.4] - 2023-12-23

### Fixed

- Fix some layout issues on Article Viewer screen
- Fix timezone of default 'created by' & 'last edited by' dates for member edits when value is not found in database

## [v2.0.3] - 2023-12-22

### Fixed

- Fix some typos on the About screen
- Ensure article banner images can be fetched through both HTTP and HTTPS and on all environments

## [v2.0.1] - 2023-12-20

### Fixed

- Use `upgrade-insecure-requests` directive to ensure article images endpoint can be reached via HTTP on both staging and prod environments

## [v2.0.0] - 2023-12-20

### Added

- Move About screen to after Home screen in the navigation tabs
- Display only future events in Schedule by default, with an option to show past events

### Changed

- Make adjustments to this README.md prior to v2.0.0 launch
- Improve About screen layout and content

### Fixed

- Fix issue which prevented article banner images from being fetched using secure connection (HTTPS protocol)
- Correct club event date-time timezone calculations which were causing Thursday club event dates to show up as Wednesday
- Fix Angular Service Worker issues when app is running on a production environment
- Fix bug which prevented form validation icon from appearing in Create/Edit Event screen

## [v1.6.8-beta] - 2023-12-19

### Changed

- Update content on About screen
- Update content on Champion screen

### Fixed

- Fix password change bug

## [v1.6.7-beta] - 2023-12-18

### Added

- Make member's year of birth field visible only to admins

### Fixed

- Correct peak rating calculation for when a member's rating is edited
- Ensure current date in new member empty form template correctly uses local timezone and not UTC time

## [v1.6.6-beta] - 2023-12-17

### Added

- Add a 'report a bug' link to the website footer
- Limit banner image height so that it doesn't expand too much on larger screens

### Fixed

- Fix bug preventing new banner images from being uploaded in some scenarios

## [v1.6.5-beta] - 2023-12-16

### Added

- Add support for hyperlinks and bullet points in article bodies

### Changed

- Minor revamping of home screen, about screen, and app header
- Update some static content on about screen

### Fixed

- Fix some minor layout bugs in Article Grid component
- Fix bug causing unsaved changes modal to appear after successfully updating a member
- Display correct 6:00 PM start time in banner alert message

## [v1.6.4-beta] - 2023-12-12

### Changed

- Sort articles based on creation date
- Hide more markdown characters from article body preview in Article Grid

### Fixed

- Only show article edit date if different from creation date
- Ensure new lines are at least preserved with HTML 'break' tags for now

## [v1.6.3-beta] - 2023-12-10

### Changed

- Update schedule event types; add icon beside championship type

### Fixed

- Fix various small bugs in Event Form component

## [v1.6.2-beta] - 2023-12-09

### Changed

- Improve styling on divider lines used throughout app

### Fixed

- Fix layout of Modification Info component, particularly for small devices
- Fix bug where the create/edit member form incorrectly detected changes in the member's details

## [v1.6.1-beta] - 2023-12-09

### Fixed

- Fix bug causing embedded tables in articles to mess up the screen layout

## [v1.6.0-beta] - 2023-12-07

### Added

- Revamp top-right dropdown user menu
- In the admin-only article/event/member edit forms, display author's name next to each article/event/member; display in the new user dropdown menu as well

### Changed

- Various minor layout improvements in form and toaster components

## [v1.5.3-beta] - 2023-12-02

### Changed

- Improve modal (pop-up) button colour scheme

### Fixed

- Fix bug where long links in the article body would break the layout on small devices

## [v1.5.1-beta] - 2023-12-01

### Added

- Add support for LCC-styled markdown tables in articles' content section
- Replace CDS with Angular Feather library for icons

### Changed

- Increase limit on article body length and align text left in markdown preview section of Article Editor

### Fixed

- Prevent user menu dropdown icon from displaying above the image previews when an image is selected in the Photo Gallery

## [v1.5.0-beta] - 2023-12-01

### Added

- Add support for markdown in articles!

### Fixed

- Fix various minor layout bugs on News and Photo Gallery screens
- Restrict article banner image size to 1MB to ensure image uploads do not fail
- Ensure dates used to determine upcoming events are compared correctly

## [v1.4.5-beta] - 2023-11-22

### Fixed

- Fix various minor bugs on Photo Gallery screen

## [v1.4.4-beta] - 2023-11-22

### Changed

- Improve typography and layout of Schedule and Nav components
- Add more photos and archive links to Photo Gallery screen
- Improve styling of 'secondary' buttons throughout app

### Fixed

- Fix various minor bugs on Article Editor and Article Viewer screens

## [v1.4.3-beta] - 2023-11-19

### Added

- Display next event as a banner with option to link to that particular event on the Schedule screen
- Add more event categories and only display upcoming events on the Home screen

### Changed

- Improve how images are displayed on small devices

### Fixed

- Ensure admin control buttons don't propagate and trigger click events on their parent components

## [v1.4.2-beta] - 2023-11-16

### Added

- Automatically log in after a successful password change, redirect user to Home screen, and hide sensitive information from Redux Devtools

### Fixed

- Fix bug preventing user from accessing add member, add article and add event screens
- Fix bug causing 'Last edited: Invalid Date' to be displayed after creating a new article

## [v1.4.1-beta] - 2023-11-15

### Added

- Add tables for executive committee and board of directors
- Fix table column widths for all breakpoints to prevent layout shifts when sorting and awkward gaps between columns

### Fixed

- Fix some small layout bugs on Champion screen
- Fix bug preventing user menu to open

## [v1.4.0-beta] - 2023-11-13

### Changed

- Overhaul layout upgrades on all screens

## [v1.3.3-beta] - 2023-11-05

### Changed

- Update production environment variable for article images endpoint to not include port number now that nginx reverse proxy is set up

## [v1.3.2-beta] - 2023-11-04

### Changed

- Update production environment variable for article images endpoint to use IP address of server running on the new EC2 instance

## [v1.3.0-beta] - 2023-10-30

### Added

- Support banner images for articles
- Create an Article Viewer screen to display the entire article whenever one is selected in the Article Grid
- Remove unnecessary 'subtitle' field
- Improve truncation logic and support truncation by line count

### Changed

- Improve screen layouts for XL-wide devices
- Modify all toast titles to make them more distinct from notification descriptions directly below

### Fixed

- Fix bug causing forms to submit twice when using the 'enter' key
- Fix bug preventing new password from being sent to the server

## [v1.2.0-beta] - 2023-10-04

### Added

- Support submitting via 'enter' key in all forms
- Add ability to return to the previous screen and request a new code after an email has already been entered

### Fixed

- Revert changes to algorithm of 'kebabize' helper function, ensuring that the correct CSS classes are added in the Members Table component
- Ensure all validator functions work as expected again, after major code refactor in the previous release

## [v1.1.0-beta] - 2023-08-31

### Added

- Embed Google Maps map of club location

## [v1.0.0-beta] - 2022-09-26

### Fixed

- Revert accidental removal of DevTools module property 'logOnly' to re-disable all but logs when in a production environment

## [v0.8.2-alpha] - 2022-09-22

### Added

- Add 'date created' and 'date edited' information to article cards
- Sanitize any actions in NgRx DevTools that include sensitive information

### Changed

- Improve date formatting in schedule component
- Centre admin control links displayed above the schedule, members, and article grid components

## [v0.8.1-alpha] - 2022-09-13

### Changed

- Implement custom trackBy function to improve performance of ngFor directive's tracking algorithm

### Fixed

- Correct faulty date format conversions used in schedule component

## [v0.8.0-alpha] - 2022-09-08

### Added

- Integrate an NgRx (redux-based) infrastructure for state management
- Integrate various backend solutions through AWS, including: DynamoDB for a NoSQL database, Cognito and IAM for user authentication and authorization, API Gateway and Lambda functions for HTTP request manipulation and routing, S3 for static hosting, CodeBuild for an automated CI/CD pipeline triggered directly by GitHub PR merges, and Route 53 and CloudFront for DNS record management, CDN services, and traffic management
- Implement an assortment of basic UI/UX features, such as toast notifications, modals (pop-ups) for action confirmation, an alert bar at the top of the screen, and a loading spinner for when data is being fetched from the database
- Implement a standard nav bar to route to the various screens available, including an icon-only view on smaller devices, and a user account section to house any account-specific information and actions
- Implement user sign up, login, and change password flows, granting LCC committee members admin access to perform Create, Read, Update and Delete (CRUD) actions on any data which is regularly updated: currently members, articles, and scheduled events
- Implement basic members table and paginator components, fully fitted with sorting and filtering algorithms
- _(Work in progress)_ Implement basic database CRUD functionality and a responsive grid layout for articles
- Implement basic CRUD functionality and a responsive table layout for all club events stored in the database
- Create a responsive grid layout to organize the most commonly sought information about the club
- Create a responsive grid layout to house photos from club meetings and club-organized events, including the functionality to enlarge photos in an image overlay 'preview' mode
- Create a responsive grid layout to showcase only the most pertinent information from other screens (such as only the next 4 events from the schedule, and a more limited amount of photos from the photo gallery)

[v6.1.1]: https://github.com/mwiraszka/london-chess/compare/v6.1.0...v6.1.1
[v6.1.0]: https://github.com/mwiraszka/london-chess/compare/v6.0.4...v6.1.0
[v6.0.4]: https://github.com/mwiraszka/london-chess/compare/v6.0.3...v6.0.4
[v6.0.3]: https://github.com/mwiraszka/london-chess/compare/v6.0.2...v6.0.3
[v6.0.2]: https://github.com/mwiraszka/london-chess/compare/v6.0.1...v6.0.2
[v6.0.1]: https://github.com/mwiraszka/london-chess/compare/v6.0.0...v6.0.1
[v6.0.0]: https://github.com/mwiraszka/london-chess/compare/v5.13.8...v6.0.0
[v5.13.8]: https://github.com/mwiraszka/london-chess/compare/v5.13.7...v5.13.8
[v5.13.7]: https://github.com/mwiraszka/london-chess/compare/v5.13.6...v5.13.7
[v5.13.6]: https://github.com/mwiraszka/london-chess/compare/v5.13.5...v5.13.6
[v5.13.5]: https://github.com/mwiraszka/london-chess/compare/v5.13.4...v5.13.5
[v5.13.4]: https://github.com/mwiraszka/london-chess/compare/v5.13.3...v5.13.4
[v5.13.3]: https://github.com/mwiraszka/london-chess/compare/v5.13.2...v5.13.3
[v5.13.2]: https://github.com/mwiraszka/london-chess/compare/v5.13.1...v5.13.2
[v5.13.1]: https://github.com/mwiraszka/london-chess/compare/v5.13.0...v5.13.1
[v5.13.0]: https://github.com/mwiraszka/london-chess/compare/v5.12.13...v5.13.0
[v5.12.13]: https://github.com/mwiraszka/london-chess/compare/v5.12.12...v5.12.13
[v5.12.12]: https://github.com/mwiraszka/london-chess/compare/v5.12.11...v5.12.12
[v5.12.11]: https://github.com/mwiraszka/london-chess/compare/v5.12.10...v5.12.11
[v5.12.10]: https://github.com/mwiraszka/london-chess/compare/v5.12.9...v5.12.10
[v5.12.9]: https://github.com/mwiraszka/london-chess/compare/v5.12.8...v5.12.9
[v5.12.8]: https://github.com/mwiraszka/london-chess/compare/v5.12.7...v5.12.8
[v5.12.7]: https://github.com/mwiraszka/london-chess/compare/v5.12.6...v5.12.7
[v5.12.6]: https://github.com/mwiraszka/london-chess/compare/v5.12.5...v5.12.6
[v5.12.5]: https://github.com/mwiraszka/london-chess/compare/v5.12.4...v5.12.5
[v5.12.4]: https://github.com/mwiraszka/london-chess/compare/v5.12.3...v5.12.4
[v5.12.3]: https://github.com/mwiraszka/london-chess/compare/v5.12.2...v5.12.3
[v5.12.2]: https://github.com/mwiraszka/london-chess/compare/v5.12.1...v5.12.2
[v5.12.1]: https://github.com/mwiraszka/london-chess/compare/v5.12.0...v5.12.1
[v5.12.0]: https://github.com/mwiraszka/london-chess/compare/v5.11.15...v5.12.0
[v5.11.14]: https://github.com/mwiraszka/london-chess/compare/v5.11.13...v5.11.14
[v5.11.13]: https://github.com/mwiraszka/london-chess/compare/v5.11.12...v5.11.13
[v5.11.12]: https://github.com/mwiraszka/london-chess/compare/v5.11.11...v5.11.12
[v5.11.11]: https://github.com/mwiraszka/london-chess/compare/v5.11.10...v5.11.11
[v5.11.10]: https://github.com/mwiraszka/london-chess/compare/v5.11.9...v5.11.10
[v5.11.9]: https://github.com/mwiraszka/london-chess/compare/v5.11.8...v5.11.9
[v5.11.8]: https://github.com/mwiraszka/london-chess/compare/v5.11.7...v5.11.8
[v5.11.7]: https://github.com/mwiraszka/london-chess/compare/v5.11.6...v5.11.7
[v5.11.6]: https://github.com/mwiraszka/london-chess/compare/v5.11.5...v5.11.6
[v5.11.5]: https://github.com/mwiraszka/london-chess/compare/v5.11.4...v5.11.5
[v5.11.4]: https://github.com/mwiraszka/london-chess/compare/v5.11.3...v5.11.4
[v5.11.3]: https://github.com/mwiraszka/london-chess/compare/v5.11.2...v5.11.3
[v5.11.2]: https://github.com/mwiraszka/london-chess/compare/v5.11.1...v5.11.2
[v5.11.1]: https://github.com/mwiraszka/london-chess/compare/v5.11.0...v5.11.1
[v5.11.0]: https://github.com/mwiraszka/london-chess/compare/v5.10.9...v5.11.0
[v5.10.9]: https://github.com/mwiraszka/london-chess/compare/v5.10.8...v5.10.9
[v5.10.8]: https://github.com/mwiraszka/london-chess/compare/v5.10.7...v5.10.8
[v5.10.7]: https://github.com/mwiraszka/london-chess/compare/v5.10.6...v5.10.7
[v5.10.4]: https://github.com/mwiraszka/london-chess/compare/v5.10.3...v5.10.4
[v5.10.3]: https://github.com/mwiraszka/london-chess/compare/v5.10.2...v5.10.3
[v5.10.2]: https://github.com/mwiraszka/london-chess/compare/v5.10.1...v5.10.2
[v5.10.1]: https://github.com/mwiraszka/london-chess/compare/v5.10.0...v5.10.1
[v5.10.0]: https://github.com/mwiraszka/london-chess/compare/v5.9.17...v5.10.0
[v5.9.17]: https://github.com/mwiraszka/london-chess/compare/v5.9.16...v5.9.17
[v5.9.16]: https://github.com/mwiraszka/london-chess/compare/v5.9.15...v5.9.16
[v5.9.15]: https://github.com/mwiraszka/london-chess/compare/v5.9.14...v5.9.15
[v5.9.14]: https://github.com/mwiraszka/london-chess/compare/v5.9.13...v5.9.14
[v5.9.13]: https://github.com/mwiraszka/london-chess/compare/v5.9.12...v5.9.13
[v5.9.12]: https://github.com/mwiraszka/london-chess/compare/v5.9.11...v5.9.12
[v5.9.11]: https://github.com/mwiraszka/london-chess/compare/v5.9.10...v5.9.11
[v5.9.10]: https://github.com/mwiraszka/london-chess/compare/v5.9.9...v5.9.10
[v5.9.9]: https://github.com/mwiraszka/london-chess/compare/v5.9.8...v5.9.9
[v5.9.8]: https://github.com/mwiraszka/london-chess/compare/v5.9.7...v5.9.8
[v5.9.7]: https://github.com/mwiraszka/london-chess/compare/v5.9.6...v5.9.7
[v5.9.6]: https://github.com/mwiraszka/london-chess/compare/v5.9.5...v5.9.6
[v5.9.5]: https://github.com/mwiraszka/london-chess/compare/v5.9.4...v5.9.5
[v5.9.4]: https://github.com/mwiraszka/london-chess/compare/v5.9.3...v5.9.4
[v5.9.3]: https://github.com/mwiraszka/london-chess/compare/v5.9.2...v5.9.3
[v5.9.2]: https://github.com/mwiraszka/london-chess/compare/v5.9.1...v5.9.2
[v5.9.1]: https://github.com/mwiraszka/london-chess/compare/v5.9.0...v5.9.1
[v5.9.0]: https://github.com/mwiraszka/london-chess/compare/v5.8.5...v5.9.0
[v5.8.5]: https://github.com/mwiraszka/london-chess/compare/v5.8.4...v5.8.5
[v5.8.4]: https://github.com/mwiraszka/london-chess/compare/v5.8.3...v5.8.4
[v5.8.3]: https://github.com/mwiraszka/london-chess/compare/v5.8.2...v5.8.3
[v5.8.2]: https://github.com/mwiraszka/london-chess/compare/v5.8.1...v5.8.2
[v5.8.1]: https://github.com/mwiraszka/london-chess/compare/v5.8.0...v5.8.1
[v5.8.0]: https://github.com/mwiraszka/london-chess/compare/v5.7.0...v5.8.0
[v5.7.0]: https://github.com/mwiraszka/london-chess/compare/v5.6.2...v5.7.0
[v5.6.2]: https://github.com/mwiraszka/london-chess/compare/v5.6.1...v5.6.2
[v5.6.1]: https://github.com/mwiraszka/london-chess/compare/v5.6.0...v5.6.1
[v5.6.0]: https://github.com/mwiraszka/london-chess/compare/v5.5.5...v5.6.0
[v5.5.5]: https://github.com/mwiraszka/london-chess/compare/v5.5.4...v5.5.5
[v5.5.4]: https://github.com/mwiraszka/london-chess/compare/v5.5.3...v5.5.4
[v5.5.3]: https://github.com/mwiraszka/london-chess/compare/v5.5.2...v5.5.3
[v5.5.2]: https://github.com/mwiraszka/london-chess/compare/v5.5.1...v5.5.2
[v5.5.0]: https://github.com/mwiraszka/london-chess/compare/v5.4.4...v5.5.0
[v5.4.4]: https://github.com/mwiraszka/london-chess/compare/v5.4.3...v5.4.4
[v5.4.3]: https://github.com/mwiraszka/london-chess/compare/v5.4.2...v5.4.3
[v5.4.2]: https://github.com/mwiraszka/london-chess/compare/v5.4.1...v5.4.2
[v5.4.1]: https://github.com/mwiraszka/london-chess/compare/v5.4.0...v5.4.1
[v5.4.0]: https://github.com/mwiraszka/london-chess/compare/v5.3.3...v5.4.0
[v5.3.3]: https://github.com/mwiraszka/london-chess/compare/v5.3.2...v5.3.3
[v5.3.2]: https://github.com/mwiraszka/london-chess/compare/v5.3.1...v5.3.2
[v5.3.1]: https://github.com/mwiraszka/london-chess/compare/v5.3.0...v5.3.1
[v5.3.0]: https://github.com/mwiraszka/london-chess/compare/v5.2.12...v5.3.0
[v5.2.1 - v5.2.12]: https://github.com/mwiraszka/london-chess/compare/v5.2.0...v5.2.12
[v5.2.0]: https://github.com/mwiraszka/london-chess/compare/v5.1.4...v5.2.0
[v5.1.3]: https://github.com/mwiraszka/london-chess/compare/v5.1.2...v5.1.3
[v5.1.2]: https://github.com/mwiraszka/london-chess/compare/v5.1.1...v5.1.2
[v5.1.1]: https://github.com/mwiraszka/london-chess/compare/v5.1.0...v5.1.1
[v5.1.0]: https://github.com/mwiraszka/london-chess/compare/v5.0.6...v5.1.0
[v5.0.2]: https://github.com/mwiraszka/london-chess/compare/v5.0.1...v5.0.2
[v5.0.1]: https://github.com/mwiraszka/london-chess/compare/v5.0.0...v5.0.1
[v5.0.0]: https://github.com/mwiraszka/london-chess/compare/v4.1.12...v5.0.0
[v4.1.12]: https://github.com/mwiraszka/london-chess/compare/v4.1.11...v4.1.12
[v4.1.11]: https://github.com/mwiraszka/london-chess/compare/v4.1.10...v4.1.11
[v4.1.10]: https://github.com/mwiraszka/london-chess/compare/v4.1.9...v4.1.10
[v4.1.9]: https://github.com/mwiraszka/london-chess/compare/v4.1.8...v4.1.9
[v4.1.8]: https://github.com/mwiraszka/london-chess/compare/v4.1.7...v4.1.8
[v4.1.7]: https://github.com/mwiraszka/london-chess/compare/v4.1.6...v4.1.7
[v4.1.5]: https://github.com/mwiraszka/london-chess/compare/v4.1.4...v4.1.5
[v4.1.4]: https://github.com/mwiraszka/london-chess/compare/v4.1.3...v4.1.4
[v4.1.3]: https://github.com/mwiraszka/london-chess/compare/v4.1.2...v4.1.3
[v4.1.2]: https://github.com/mwiraszka/london-chess/compare/v4.1.1...v4.1.2
[v4.1.1]: https://github.com/mwiraszka/london-chess/compare/v4.1.0...v4.1.1
[v4.1.0]: https://github.com/mwiraszka/london-chess/compare/v4.0.19...v4.1.0
[v4.0.19]: https://github.com/mwiraszka/london-chess/compare/v4.0.18...v4.0.19
[v4.0.18]: https://github.com/mwiraszka/london-chess/compare/v4.0.17...v4.0.18
[v4.0.17]: https://github.com/mwiraszka/london-chess/compare/v4.0.16...v4.0.17
[v4.0.16]: https://github.com/mwiraszka/london-chess/compare/v4.0.15...v4.0.16
[v4.0.14]: https://github.com/mwiraszka/london-chess/compare/v4.0.13...v4.0.14
[v4.0.13]: https://github.com/mwiraszka/london-chess/compare/v4.0.12...v4.0.13
[v4.0.12]: https://github.com/mwiraszka/london-chess/compare/v4.0.11...v4.0.12
[v4.0.11]: https://github.com/mwiraszka/london-chess/compare/v4.0.10...v4.0.11
[v4.0.10]: https://github.com/mwiraszka/london-chess/compare/v4.0.9...v4.0.10
[v4.0.9]: https://github.com/mwiraszka/london-chess/compare/v4.0.8...v4.0.9
[v4.0.8]: https://github.com/mwiraszka/london-chess/compare/v4.0.7...v4.0.8
[v4.0.7]: https://github.com/mwiraszka/london-chess/compare/v4.0.6...v4.0.7
[v4.0.6]: https://github.com/mwiraszka/london-chess/compare/v4.0.5...v4.0.6
[v4.0.3]: https://github.com/mwiraszka/london-chess/compare/v4.0.2...v4.0.3
[v4.0.2]: https://github.com/mwiraszka/london-chess/compare/v4.0.1...v4.0.2
[v4.0.1]: https://github.com/mwiraszka/london-chess/compare/v4.0.0...v4.0.1
[v4.0.0]: https://github.com/mwiraszka/london-chess/compare/v3.3.2...v4.0.0
[v3.3.2]: https://github.com/mwiraszka/london-chess/compare/v3.3.1...v3.3.2
[v3.3.1]: https://github.com/mwiraszka/london-chess/compare/v3.3.0...v3.3.1
[v3.3.0]: https://github.com/mwiraszka/london-chess/compare/v3.2.0...v3.3.0
[v3.2.0]: https://github.com/mwiraszka/london-chess/compare/v3.1.3...v3.2.0
[v3.1.3]: https://github.com/mwiraszka/london-chess/compare/v3.1.2...v3.1.3
[v3.1.2]: https://github.com/mwiraszka/london-chess/compare/v3.1.1...v3.1.2
[v3.1.1]: https://github.com/mwiraszka/london-chess/compare/v3.1.0...v3.1.1
[v3.1.0]: https://github.com/mwiraszka/london-chess/compare/v3.0.12...v3.1.0
[v3.0.12]: https://github.com/mwiraszka/london-chess/compare/v3.0.11...v3.0.12
[v3.0.11]: https://github.com/mwiraszka/london-chess/compare/v3.0.10...v3.0.11
[v3.0.10]: https://github.com/mwiraszka/london-chess/compare/v3.0.9...v3.0.10
[v3.0.9]: https://github.com/mwiraszka/london-chess/compare/v3.0.8...v3.0.9
[v3.0.8]: https://github.com/mwiraszka/london-chess/compare/v3.0.7...v3.0.8
[v3.0.7]: https://github.com/mwiraszka/london-chess/compare/v3.0.6...v3.0.7
[v3.0.6]: https://github.com/mwiraszka/london-chess/compare/v3.0.5...v3.0.6
[v3.0.5]: https://github.com/mwiraszka/london-chess/compare/v3.0.4...v3.0.5
[v3.0.4]: https://github.com/mwiraszka/london-chess/compare/v3.0.3...v3.0.4
[v3.0.2]: https://github.com/mwiraszka/london-chess/compare/v3.0.1...v3.0.2
[v3.0.1]: https://github.com/mwiraszka/london-chess/compare/v3.0.0...v3.0.1
[v3.0.0]: https://github.com/mwiraszka/london-chess/compare/v2.2.5...v3.0.0
[v2.2.5]: https://github.com/mwiraszka/london-chess/compare/v2.2.4...v2.2.5
[v2.2.4]: https://github.com/mwiraszka/london-chess/compare/v2.2.3...v2.2.4
[v2.2.3]: https://github.com/mwiraszka/london-chess/compare/v2.2.2...v2.2.3
[v2.2.2]: https://github.com/mwiraszka/london-chess/compare/v2.2.1...v2.2.2
[v2.2.1]: https://github.com/mwiraszka/london-chess/compare/v2.2.0...v2.2.1
[v2.2.0]: https://github.com/mwiraszka/london-chess/compare/v2.1.0...v2.2.0
[v2.1.0]: https://github.com/mwiraszka/london-chess/compare/v2.0.4...v2.1.0
[v2.0.4]: https://github.com/mwiraszka/london-chess/compare/v2.0.3...v2.0.4
[v2.0.3]: https://github.com/mwiraszka/london-chess/compare/v2.0.2...v2.0.3
[v2.0.1]: https://github.com/mwiraszka/london-chess/compare/v2.0.0...v2.0.1
[v2.0.0]: https://github.com/mwiraszka/london-chess/compare/v1.6.8-beta...v2.0.0
[v1.6.8-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.7-beta...v1.6.8-beta
[v1.6.7-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.6-beta...v1.6.7-beta
[v1.6.6-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.5-beta...v1.6.6-beta
[v1.6.5-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.4-beta...v1.6.5-beta
[v1.6.4-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.3-beta...v1.6.4-beta
[v1.6.3-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.2-beta...v1.6.3-beta
[v1.6.2-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.1-beta...v1.6.2-beta
[v1.6.1-beta]: https://github.com/mwiraszka/london-chess/compare/v1.6.0-beta...v1.6.1-beta
[v1.6.0-beta]: https://github.com/mwiraszka/london-chess/compare/v1.5.3-beta...v1.6.0-beta
[v1.5.3-beta]: https://github.com/mwiraszka/london-chess/compare/v1.5.2-beta...v1.5.3-beta
[v1.5.1-beta]: https://github.com/mwiraszka/london-chess/compare/v1.5.0-beta...v1.5.1-beta
[v1.5.0-beta]: https://github.com/mwiraszka/london-chess/compare/v1.4.5-beta...v1.5.0-beta
[v1.4.5-beta]: https://github.com/mwiraszka/london-chess/compare/v1.4.4-beta...v1.4.5-beta
[v1.4.4-beta]: https://github.com/mwiraszka/london-chess/compare/v1.4.3-beta...v1.4.4-beta
[v1.4.3-beta]: https://github.com/mwiraszka/london-chess/compare/v1.4.2-beta...v1.4.3-beta
[v1.4.2-beta]: https://github.com/mwiraszka/london-chess/compare/v1.4.1-beta...v1.4.2-beta
[v1.4.1-beta]: https://github.com/mwiraszka/london-chess/compare/v1.4.0-beta...v1.4.1-beta
[v1.4.0-beta]: https://github.com/mwiraszka/london-chess/compare/v1.3.3-beta...v1.4.0-beta
[v1.3.3-beta]: https://github.com/mwiraszka/london-chess/compare/v1.3.2-beta...v1.3.3-beta
[v1.3.2-beta]: https://github.com/mwiraszka/london-chess/compare/v1.3.1-beta...v1.3.2-beta
[v1.3.0-beta]: https://github.com/mwiraszka/london-chess/compare/v1.2.0-beta...v1.3.0-beta
[v1.2.0-beta]: https://github.com/mwiraszka/london-chess/compare/v1.1.0-beta...v1.2.0-beta
[v1.1.0-beta]: https://github.com/mwiraszka/london-chess/compare/v1.0.0-beta...v1.1.0-beta
[v1.0.0-beta]: https://github.com/mwiraszka/london-chess/compare/v0.8.2-alpha...v1.0.0-beta
[v0.8.2-alpha]: https://github.com/mwiraszka/london-chess/compare/v0.8.1-alpha...v0.8.2-alpha
[v0.8.1-alpha]: https://github.com/mwiraszka/london-chess/compare/v0.8.0-alpha...v0.8.1-alpha
[v0.8.0-alpha]: https://github.com/mwiraszka/london-chess/releases/tag/v0.8.0-alpha
