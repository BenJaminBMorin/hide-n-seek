# Versioning and Release Process

Hide-n-Seek follows [Semantic Versioning](https://semver.org/) for version numbers.

## Version Format

**Format**: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

**Examples**:
- `0.1.0` → `0.1.1`: Bug fix
- `0.1.1` → `0.2.0`: New feature added
- `0.2.0` → `1.0.0`: Breaking change or production-ready

## Release Workflow

### 1. Prepare the Release

**Update version in manifest.json**:
```json
{
  "version": "0.2.0"
}
```

**Update CHANGELOG.md**:
```markdown
## [0.2.0] - 2024-12-15

### Added
- New feature X
- New feature Y

### Fixed
- Bug Z
```

**Commit changes**:
```bash
git add custom_components/hide_n_seek/manifest.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push
```

### 2. Create Git Tag

```bash
# Create annotated tag
git tag -a v0.2.0 -m "Release v0.2.0

Brief description of the release.

See CHANGELOG.md for details."

# Push tag to GitHub
git push origin v0.2.0
```

### 3. Create GitHub Release

**Option A: Via GitHub Web UI** (Recommended)

1. Go to: https://github.com/BenJaminBMorin/hide-n-seek/releases
2. Click **"Draft a new release"**
3. Click **"Choose a tag"** → Select `v0.2.0`
4. Release title: `v0.2.0 - Brief Description`
5. Description: Copy from CHANGELOG.md
6. Click **"Publish release"**

**Option B: Via GitHub CLI**

```bash
gh release create v0.2.0 \
  --title "v0.2.0 - Brief Description" \
  --notes-file <(sed -n '/## \[0.2.0\]/,/## \[/p' CHANGELOG.md | sed '$d')
```

### 4. HACS Updates Users Automatically

- HACS detects the new tag
- Users see update notification
- They click "Update" → Get new version
- Done! ✅

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v0.1.0 | 2024-12-02 | Initial release |

See [CHANGELOG.md](../CHANGELOG.md) for detailed changes.

## HACS Version Display

**Before tagging**:
```
Version: fb08e29 (commit hash)
```

**After tagging**:
```
Version: v0.1.0
```

HACS automatically uses git tags when available!

## Pre-release Versions

For testing versions before official release:

```bash
# Create pre-release tag
git tag -a v0.2.0-beta.1 -m "Beta release for testing"
git push origin v0.2.0-beta.1

# Mark as pre-release on GitHub
# (Check "This is a pre-release" when creating release)
```

## Checking Current Version

**In Home Assistant**:
- Settings → Devices & Services → Hide-n-Seek → Shows version

**In HACS**:
- HACS → Integrations → Hide-n-Seek → Shows installed version

**Via CLI**:
```bash
# Check manifest version
cat custom_components/hide_n_seek/manifest.json | grep version

# Check git tags
git tag -l

# Check current version
git describe --tags
```

## Release Checklist

Before releasing a new version:

- [ ] All tests pass
- [ ] Frontend built and committed (`npm run build`)
- [ ] Version updated in `manifest.json`
- [ ] CHANGELOG.md updated with changes
- [ ] Commits pushed to main branch
- [ ] Git tag created and pushed
- [ ] GitHub release created
- [ ] Release notes published
- [ ] Verified HACS shows new version

## Hotfix Releases

For urgent bug fixes:

```bash
# From main branch
git checkout -b hotfix/0.1.1

# Fix the bug
vim custom_components/hide_n_seek/buggy_file.py

# Update version
vim custom_components/hide_n_seek/manifest.json  # Change to 0.1.1
vim CHANGELOG.md  # Add [0.1.1] section

# Commit and merge
git add .
git commit -m "fix: critical bug in triangulation"
git checkout main
git merge hotfix/0.1.1

# Tag and release
git tag -a v0.1.1 -m "Hotfix v0.1.1 - Critical bug fix"
git push origin main v0.1.1

# Create GitHub release
```

## Versioning Best Practices

1. **Always update CHANGELOG.md** - Users need to know what changed
2. **Use semantic versioning** - Makes changes predictable
3. **Test before releasing** - Avoid releasing broken versions
4. **Document breaking changes** - Warn users in advance
5. **Keep releases small** - Easier to troubleshoot issues

## Automatic Version Bumping (Future)

We could add a script to automate version bumping:

```bash
# Future: ./scripts/bump-version.sh minor
# Would automatically:
# - Update manifest.json
# - Update CHANGELOG.md
# - Commit changes
# - Create tag
```

For now, manual versioning ensures quality control.
