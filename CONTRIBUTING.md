# Contributing to Hide-n-Seek

Thank you for your interest in contributing! This guide explains the development workflow.

## Development Workflow

### Backend Changes (Python)

1. **Make your changes** to any `.py` files in `custom_components/hide_n_seek/`
2. **Test locally** in your Home Assistant instance
3. **Commit and push**:
   ```bash
   git add custom_components/hide_n_seek/
   git commit -m "feat: your feature description"
   git push
   ```

### Frontend Changes (React/TypeScript)

When you modify frontend code, you need to rebuild:

1. **Make your changes** to files in `custom_components/hide_n_seek/frontend/src/`

2. **Rebuild the frontend**:
   ```bash
   cd custom_components/hide_n_seek/frontend
   npm install  # Only needed first time or when dependencies change
   npm run build
   ```

3. **Test locally** - The built files in `dist/` are what Home Assistant serves

4. **Commit BOTH source and built files**:
   ```bash
   git add custom_components/hide_n_seek/frontend/src/
   git add custom_components/hide_n_seek/frontend/dist/
   git commit -m "feat: your frontend feature"
   git push
   ```

**Important**: Always commit the `dist/` folder! HACS users get pre-built files.

## Why Pre-built Files?

- ✅ **Users don't need Node.js** - Just install via HACS
- ✅ **Instant updates** - No build step for users
- ✅ **Simpler deployment** - Works out of the box
- ✅ **Standard practice** - Many HACS integrations do this

## GitHub Actions

The workflow (`.github/workflows/build-frontend.yml`) now:
- ❌ Does NOT auto-build on every commit
- ✅ Verifies builds work on PRs
- ✅ Can be manually triggered

This prevents extra "build" commits and keeps history clean.

## Testing Changes

### Backend Testing

1. Copy to your Home Assistant:
   ```bash
   cp -r custom_components/hide_n_seek ~/.homeassistant/custom_components/
   ```

2. Restart Home Assistant

3. Check logs:
   ```bash
   tail -f ~/.homeassistant/home-assistant.log | grep hide_n_seek
   ```

### Frontend Testing

1. Build and copy:
   ```bash
   cd custom_components/hide_n_seek/frontend
   npm run build
   cd ../../..
   cp -r custom_components/hide_n_seek ~/.homeassistant/custom_components/
   ```

2. Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)

3. Check browser console (F12) for errors

## Release Process

When ready to release a new version:

1. **Update version** in `manifest.json`:
   ```json
   "version": "0.2.0"
   ```

2. **Update CHANGELOG.md** with changes

3. **Commit and push**:
   ```bash
   git add manifest.json CHANGELOG.md
   git commit -m "chore: bump version to 0.2.0"
   git push
   ```

4. **Create GitHub release**:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

5. Go to GitHub → Releases → Draft a new release
6. HACS will notify users of the update!

## Pull Request Guidelines

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** (backend and/or frontend)
4. **Build frontend** if you changed it: `npm run build`
5. **Commit changes**: Include both src and dist if frontend changed
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request** with description of changes

### PR Checklist

- [ ] Code follows existing style
- [ ] Frontend built and dist/ committed (if applicable)
- [ ] Tested in Home Assistant
- [ ] Documentation updated (if needed)
- [ ] No sensitive information in code

## Code Style

### Python
- Follow [PEP 8](https://pep8.org/)
- Use `black` for formatting: `black custom_components/hide_n_seek/`
- Use type hints where possible

### TypeScript
- Follow existing patterns
- Use functional components with hooks
- Add proper TypeScript types

## Questions?

- Open an [Issue](https://github.com/BenJaminBMorin/hide-n-seek/issues)
- Start a [Discussion](https://github.com/BenJaminBMorin/hide-n-seek/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
