# How to Make This Repository Public

This guide explains how to make your Hide-n-Seek repository public on GitHub.

## Before You Go Public - Checklist

Before making your repository public, ensure you've completed these steps:

- [x] **No Secrets or Sensitive Data**: The repository has been reviewed and contains no API keys, passwords, or personal information
- [x] **License in Place**: MIT License is included (see `LICENSE` file)
- [x] **Documentation Complete**: README, setup guides, and examples are ready
- [x] **HACS Compatible**: The `hacs.json` file is properly configured
- [x] **Validation Workflows**: GitHub Actions for HACS and hassfest validation are set up
- [x] **.gitignore Configured**: Build artifacts and sensitive files are excluded

## Steps to Make the Repository Public

### Option 1: Via GitHub Web Interface

1. **Go to Repository Settings**
   - Navigate to your repository: `https://github.com/BenJaminBMorin/hide-n-seek`
   - Click the **Settings** tab (gear icon)

2. **Scroll to the Danger Zone**
   - Scroll down to the **Danger Zone** section at the bottom of the Settings page

3. **Change Repository Visibility**
   - Click **Change visibility**
   - Select **Make public**
   - GitHub will ask you to confirm by typing the repository name
   - Type `BenJaminBMorin/hide-n-seek` to confirm
   - Click **I understand, make this repository public**

### Option 2: Via GitHub CLI

If you have the GitHub CLI (`gh`) installed:

```bash
gh repo edit BenJaminBMorin/hide-n-seek --visibility public
```

## After Going Public

Once your repository is public:

### 1. Submit to HACS Default Repository (Optional)

To make your integration discoverable in HACS without adding it as a custom repository:

1. Fork [hacs/default](https://github.com/hacs/default)
2. Add your repository to the `integration` file
3. Submit a pull request
4. Wait for review and approval

Requirements for HACS default:
- Repository must be public
- Must pass HACS validation
- Must have a release with proper assets

### 2. Create Your First Release

```bash
# Tag the release
git tag v0.1.0
git push origin v0.1.0
```

Or use GitHub's web interface:
1. Go to **Releases** → **Create a new release**
2. Choose tag: `v0.1.0`
3. Release title: `v0.1.0 - Initial Release`
4. Add release notes
5. Click **Publish release**

### 3. Enable GitHub Features

Consider enabling these GitHub features for your public repository:

- **Discussions**: For community Q&A
- **Wiki**: For extended documentation
- **Projects**: For tracking features and bugs
- **Sponsorship**: If you want to accept donations

### 4. Add Topics/Tags

Add relevant topics to help users discover your repository:
- `home-assistant`
- `home-assistant-custom-component`
- `hacs`
- `indoor-positioning`
- `presence-detection`
- `esp32`
- `bluetooth`

## Community Guidelines

Consider adding:

- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Community code of conduct
- `SECURITY.md` - Security policy for vulnerability reports
- Issue and PR templates in `.github/`

## Verification

After making the repository public, verify:

1. **Repository is accessible**: Visit the URL in an incognito browser window
2. **HACS validation passes**: Check GitHub Actions workflow runs
3. **Installation works**: Try installing via HACS as a custom repository
4. **Documentation links work**: Click through all documentation links

## Need Help?

If you encounter issues:

- [GitHub Docs: Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [HACS Documentation](https://hacs.xyz/docs/publish/start)
- [Home Assistant Developer Docs](https://developers.home-assistant.io/)
