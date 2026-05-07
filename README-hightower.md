# Hightower Testing Guide

For a non-technical tester, the right way is not "send the branch." The right way is "send a one-click install link" for the built userscript.

## Best Option

Host your built plugin and give them one URL to click:

- `wasabee.user.js` for install
- optionally `wasabee.meta.js` for auto-update

The tester should never need Git, terminal, or source code.

## What the tester needs

This feature is not a standalone website. It only works inside IITC + Wasabee on the Intel map.

So the tester needs:

- IITC already working
- a userscript manager like Tampermonkey or Violentmonkey
- your custom Wasabee build installed
- access to an op they can open in Wasabee
- C.O.R.E. if they are testing the real import flow

## Hightower install link

Do not send the GitHub release tag page. That page is not an installable userscript URL.

Use this direct install link instead:

- `https://codesagepath.github.io/Wasabee-IITC/hightower/wasabee.user.js`

Auto-update metadata is served from:

- `https://codesagepath.github.io/Wasabee-IITC/hightower/wasabee.meta.js`

If that URL returns `404`, the Hightower files have not been published to GitHub Pages yet. In that case, use a manually uploaded `wasabee.user.js` file instead of the Pages URL.

## Release prep

Build the Hightower tester bundle with:

```text
npm run build-hightower
```

Generated files:

- [wasabee.user.js](./releases/hightower/wasabee.user.js)
- [wasabee.meta.js](./releases/hightower/wasabee.meta.js)

The Hightower build points its install and update metadata to the fork-hosted GitHub Pages URLs above, so testers stay on this fork instead of switching back to upstream dev.

## If GitHub Pages is not live yet

Use this temporary flow:

1. Run:

```text
npm run build-hightower
```

2. Upload:

- `releases/hightower/wasabee.user.js`
- optionally `releases/hightower/wasabee.meta.js`

3. Host the uploaded file somewhere the tester can open directly:

- GitHub release asset
- GitHub Pages after publish
- any static file host

4. Share the direct file URL for `wasabee.user.js`, not the release overview page.

## What the tester will actually do

If they already use IITC, send them this:

```text
1. Install Tampermonkey or Violentmonkey if you do not already have one.
2. Open this install link: https://codesagepath.github.io/Wasabee-IITC/hightower/wasabee.user.js
3. Click Install.
4. Open https://intel.ingress.com and reload IITC.
5. Open Wasabee and log in normally.
6. Open an operation you can view/edit.
7. Click the new “Sync CORE Keys” button on the left toolbar.
8. In the dialog, click “Sync from CORE”.
9. Check the summary shown after sync.
```

## What they should expect in the UI

- a new left-toolbar button: `Sync CORE Keys`
- clicking it opens a standalone dialog
- clicking `Sync from CORE`:
  - checks C.O.R.E. availability
  - reads Intel inventory
  - updates only current-op key portals
  - ignores non-op portals
  - shows `updated / cleared / skipped / failed`

## If the tester is truly very non-technical

Then do not send source, branch links, or GitHub code pages. Send only:

- one install URL
- one screenshot showing the new button
- one short instruction block

## Recommended tester package

Send them:

- install link
- screenshot of the new toolbar button
- screenshot of the dialog
- short note:

```text
This test requires IITC + Wasabee and works best if you already use them.
If you have C.O.R.E., please test the full import flow.
If you do not have C.O.R.E., please test that the dialog opens and fails safely.
```

## Tester-ready message

```text
Please help test a custom Wasabee build.

1. Install Tampermonkey or Violentmonkey if you do not already have one.
2. Open this install link:
   https://codesagepath.github.io/Wasabee-IITC/hightower/wasabee.user.js
3. Click Install in Tampermonkey or Violentmonkey.
4. Open https://intel.ingress.com and reload IITC.
5. Open Wasabee and log in normally.
6. Open an operation you can view or edit.
7. Click the new “Sync CORE Keys” button on the left toolbar.
8. In the dialog, click “Sync from CORE”.
9. Check the summary shown after sync.
10. Optional but recommended: please disable auto-update for now.

Please test and report:
- Did the new “Sync CORE Keys” button appear?
- Did the dialog open correctly?
- If you have C.O.R.E., did the sync complete and show a reasonable summary?
- If you do not have C.O.R.E., did it fail safely without changing anything?
- Did the normal Wasabee key list update correctly after sync?
- Did anything else in Wasabee break or behave strangely?

Please share back:
- whether you have C.O.R.E. or not
- screenshots of the dialog and result summary
- screenshot of the Wasabee key list after sync, if possible
- any error messages or unusual behavior
- your browser and whether you used Tampermonkey or Violentmonkey
```

## Tester-ready message before GitHub Pages is live

```text
Please help test a custom Wasabee build.

1. Install Tampermonkey or Violentmonkey if you do not already have one.
2. Open this install link:
   <direct wasabee.user.js file URL>
3. Click Install in Tampermonkey or Violentmonkey.
4. Open https://intel.ingress.com and reload IITC.
5. Open Wasabee and log in normally.
6. Open an operation you can view or edit.
7. Click the new “Sync CORE Keys” button on the left toolbar.
8. In the dialog, click “Sync from CORE”.
9. Check the summary shown after sync.
10. Optional but recommended: please disable auto-update for now.

Please test and report:
- Did the new “Sync CORE Keys” button appear?
- Did the dialog open correctly?
- If you have C.O.R.E., did the sync complete and show a reasonable summary?
- If you do not have C.O.R.E., did it fail safely without changing anything?
- Did the normal Wasabee key list update correctly after sync?
- Did anything else in Wasabee break or behave strangely?

Please share back:
- whether you have C.O.R.E. or not
- screenshots of the dialog and result summary
- screenshot of the Wasabee key list after sync, if possible
- any error messages or unusual behavior
- your browser and whether you used Tampermonkey or Violentmonkey
```

## Optional follow-up

If needed later:

- create a tester-ready message you can paste in WhatsApp/Telegram/Discord
- verify the GitHub Pages workflow has published the latest Hightower files
