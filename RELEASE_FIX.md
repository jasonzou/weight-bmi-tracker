# Fixing the 1.0.1 release on GitHub

This is a one-time procedure to fix the broken 1.0.1 release that was created
without main.js / manifest.json assets and without a name or notes.
Going forward, the release workflow in .github/workflows/release.yml handles
this automatically on tag push.

## One-time setup

```sh
# Authenticate gh once (creates ~/.config/gh/hosts.yml):
gh auth login --hostname github.com --scopes repo
```

## Re-upload assets, set name + notes for the existing 1.0.1 release

From this repo, with on-disk main.js and manifest.json (version 1.0.1)
already built:

```sh
VERSION=1.0.1
TAG="${VERSION}"
gh release view "${TAG}" --repo jasonzou/weight-bmi-tracker

# 1) Upload main.js and manifest.json as release assets
gh release upload "${TAG}" main.js manifest.json \
  --repo jasonzou/weight-bmi-tracker \
  --clobber

# 2) Set the release name (the validator warns "release name does not include
#    the version" when name is empty)
gh release edit "${TAG}" \
  --repo jasonzou/weight-bmi-tracker \
  --title "${VERSION}"

# 3) Add release notes (the validator recommends a description)
gh release edit "${TAG}" \
  --repo jasonzou/weight-bmi-tracker \
  --notes "## Weight & BMI Tracker ${VERSION}

Track daily weight, visualize trends, automatically calculate + chart BMI,
and import or export your data.

See the README for installation and usage."

# Verify
gh release view "${TAG}" --repo jasonzou/weight-bmi-tracker
```

## Going forward: just push a tag

```sh
# 1) Bump version in manifest.json (and package.json):
npm version patch   # uses the 'version' script we added

# 2) Commit + push the version bump:
git add manifest.json package.json
git commit -m "Bump version to $(node -p "require('./manifest.json').version")"
git push

# 3) Tag + push the tag - the workflow will build, attach main.js +
#    manifest.json as assets, set the name, and write release notes:
git tag 1.0.2 && git push origin 1.0.2
```
