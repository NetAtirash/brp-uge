# Testing v1.21.11 draft as a Foundry v14 prerelease

The open Draft PR is not an installable release by itself. Stable v1.21.10 /releases/latest/ must not be changed to point at untested code.

## Publish isolated preview from GitHub Desktop

1. Open repository NetAtirash/brp-uge, Fetch origin, and select branch feat/v1.21.11-specialty-management.
2. Repository > Open in Terminal. Run:

~~~sh
git fetch origin
git switch feat/v1.21.11-specialty-management
git pull origin feat/v1.21.11-specialty-management
git tag v1.21.11-rc.1
git push origin v1.21.11-rc.1
~~~

3. Confirm GitHub Actions Release BRP UGE for Foundry VTT succeeds; RC tags create GitHub Prereleases with --latest=false.
4. In Foundry Setup > Game Systems > Install System > Manifest URL, after release assets have been published, enter:

~~~text
https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.1/system.json
~~~

The URL is not live until the tag is pushed and the release workflow succeeds.

## Is normal Update sufficient?

No, not from a stable v1.21.10 installation: that release checks the stable latest manifest. Installing the RC uses Foundry's normal system installer, but its manifest is pinned to rc.1. To test later RC versions, install them from their own versioned manifest URLs. The project does not yet offer a moving preview-channel manifest URL.

BRP UGE is a Game System (not Add-on Module). Stable and RC use the same package id, so they cannot coexist under one Foundry User Data path. Prefer a separate User Data folder and a copy of your World for testing, or take a complete backup first.

Do not force-update already published tags. After another test fix, use a new rc.2 tag. Merge to main and tag stable v1.21.11 only after Foundry v14 live testing.
