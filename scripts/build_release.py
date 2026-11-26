#!/usr/bin/env python3
"""Build a Foundry VTT system package from the verified repository source.

The ZIP always contains a single brp-uge/ top-level directory. The generated
release manifest contains the exact download URL for this version.
"""
import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_URL = "https://github.com/NetAtirash/brp-uge"
PACKAGE_ID = "brp-uge"
RUNTIME_DIRS = ("assets", "lang", "module", "styles", "templates")
RUNTIME_FILES = ("brp-uge.mjs", "ORC-ATTRIBUTION.md", "README.md")


def build(output_dir: Path, release_tag: str | None) -> None:
    source_manifest = json.loads((ROOT / "system.json").read_text(encoding="utf-8"))
    version = source_manifest.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("system.json version must be stable X.Y.Z")
    expected_tag = f"v{version}"
    is_preview = bool(release_tag and re.fullmatch(re.escape(expected_tag) + r"-(?:rc|beta)\.\d+", release_tag))
    if release_tag and release_tag != expected_tag and not is_preview:
        raise ValueError(f"Tag {release_tag!r} does not match system.json {expected_tag!r} or a permitted RC/Beta tag")
    artifact_tag = release_tag or expected_tag
    if source_manifest.get("id") != PACKAGE_ID:
        raise ValueError("Manifest id must remain 'brp-uge'")

    for entry in source_manifest.get("esmodules", []) + source_manifest.get("styles", []):
        if not (ROOT / entry).is_file():
            raise FileNotFoundError(f"Missing manifest reference: {entry}")
    for language in source_manifest.get("languages", []):
        entry = language["path"]
        if not (ROOT / entry).is_file():
            raise FileNotFoundError(f"Missing language: {entry}")
    for dirname in RUNTIME_DIRS:
        if not (ROOT / dirname).is_dir():
            raise FileNotFoundError(f"Missing runtime directory: {dirname}")
    for filename in RUNTIME_FILES:
        if not (ROOT / filename).is_file():
            raise FileNotFoundError(f"Missing runtime file: {filename}")

    manifest = dict(source_manifest)
    if is_preview:
        # Keep preview outside stable /latest: the system in the test World
        # follows the versioned preview manifest it was installed from.
        manifest["version"] = artifact_tag[1:]
        manifest["manifest"] = f"{REPO_URL}/releases/download/{artifact_tag}/system.json"
    else:
        manifest["manifest"] = f"{REPO_URL}/releases/latest/download/system.json"
    manifest["download"] = f"{REPO_URL}/releases/download/{artifact_tag}/{PACKAGE_ID}.zip"
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "system.json").write_bytes(manifest_bytes)
    archive = output_dir / f"{PACKAGE_ID}.zip"

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr(f"{PACKAGE_ID}/system.json", manifest_bytes)
        for filename in RUNTIME_FILES:
            z.write(ROOT / filename, arcname=f"{PACKAGE_ID}/{filename}")
        active_styles=set(source_manifest.get("styles", []))
        for dirname in RUNTIME_DIRS:
            for file in sorted((ROOT / dirname).rglob("*")):
                if not file.is_file():
                    continue
                relative=file.relative_to(ROOT).as_posix()
                # Authored CSS sources stay in Git but are not runtime assets
                # when the manifest loads the optimized production bundle.
                # This preserves original ZIP behavior on stable branches
                # that still reference the individual source files.
                if dirname=="styles" and file.suffix.lower()==".css" and relative not in active_styles:
                    continue
                z.write(file, arcname=f"{PACKAGE_ID}/{relative}")

    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError("ZIP checksum verification failed")
        names = z.namelist()
        if len(names) != len(set(names)):
            raise ValueError("Duplicate ZIP paths")
        if not all(name.startswith(f"{PACKAGE_ID}/") for name in names):
            raise ValueError("ZIP has content outside the game system directory")
        packaged_manifest = json.loads(z.read(f"{PACKAGE_ID}/system.json"))
        if packaged_manifest != manifest:
            raise ValueError("Packaged and release manifests differ")
        if any(name.startswith((f"{PACKAGE_ID}/tests/", f"{PACKAGE_ID}/.github/")) for name in names):
            raise ValueError("Test or GitHub workflow files unexpectedly included")
    print(f"Built {archive} with {len(names)} runtime files for {artifact_tag}")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--output", type=Path, default=ROOT / "dist")
    cli.add_argument("--tag", help="GitHub release tag; must match system.json version")
    args = cli.parse_args()
    try:
        build(args.output, args.tag)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"Release build failed: {error}", file=sys.stderr)
        sys.exit(1)
