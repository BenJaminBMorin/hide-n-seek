# HACS Installation Guide

This guide shows you how to install Hide-n-Seek via HACS (Home Assistant Community Store).

## Prerequisites

1. **HACS must be installed** in your Home Assistant instance
   - If you don't have HACS, install it from https://hacs.xyz/docs/setup/download

2. **Home Assistant 2024.1.0 or newer**

## Installation Steps

### Step 1: Add Custom Repository to HACS

1. Open **Home Assistant**
2. Click on **HACS** in the sidebar
3. Click on **Integrations**
4. Click the **three dots (⋮)** in the top right corner
5. Select **Custom repositories**
6. In the dialog that appears:
   - **Repository**: `https://github.com/BenJaminBMorin/hide-n-seek`
   - **Category**: Select `Integration`
7. Click **Add**

### Step 2: Install Hide-n-Seek

1. In HACS → Integrations, search for **"Hide-n-Seek"**
2. Click on **Hide-n-Seek Presence Tracker**
3. Click **Download** (bottom right)
4. Select the latest version
5. Click **Download**
6. Wait for the download to complete

### Step 3: Restart Home Assistant

1. Go to **Settings** → **System**
2. Click **Restart** (top right corner)
3. Click **Restart Home Assistant**
4. Wait for Home Assistant to restart (usually 1-2 minutes)

### Step 4: Add the Integration

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration** (bottom right)
3. Search for **"Hide-n-Seek"**
4. Click on **Hide-n-Seek Presence Tracker**
5. Configure the settings:
   - **Update Interval**: 1 second (recommended)
   - **Smoothing Method**: Kalman (recommended)
   - **Confidence Threshold**: 0.7 (recommended)
6. Click **Submit**

### Step 5: Access the Panel

1. Look for **"Hide-n-Seek"** in your Home Assistant sidebar
2. Click it to open the tracking panel
3. You should see the interactive map interface

## Updating

HACS will automatically notify you when updates are available:

1. Go to **HACS** → **Integrations**
2. If an update is available, you'll see an **Update** button
3. Click **Update**
4. Restart Home Assistant after the update completes

## What Gets Installed

When you install via HACS, you get:

- ✅ Complete backend integration (Python)
- ✅ Pre-built frontend panel (React/TypeScript)
- ✅ All sensor and device tracker entities
- ✅ WebSocket API for real-time updates
- ✅ Zone management system
- ✅ Example automations and configurations

**No build steps required!** The frontend is pre-built and ready to use.

## Verification

After installation, verify everything is working:

1. **Check the integration is loaded:**
   - Settings → Devices & Services → Find "Hide-n-Seek"
   - Should show "Configured" status

2. **Check the panel appears:**
   - Look for "Hide-n-Seek" in the sidebar
   - Click it - you should see the map interface

3. **Check the logs (if needed):**
   ```
   Settings → System → Logs
   Search for: hide_n_seek
   ```

## Next Steps

Now that it's installed:

1. **Add Sensors**: Configure your ESP32, mmWave, or Bluetooth sensors
2. **Set Positions**: Measure and record sensor locations
3. **Create Zones**: Use the visual editor to draw zones
4. **Build Automations**: Create automations based on zone events

See the [Setup Guide](SETUP_GUIDE.md) for detailed configuration instructions.

## Troubleshooting

### Panel Not Appearing

If the panel doesn't appear in the sidebar:

1. Force refresh your browser (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Check Developer Tools console for errors
4. Restart Home Assistant again

### Integration Not Found

If you can't find Hide-n-Seek in the Add Integration dialog:

1. Make sure you restarted Home Assistant after installation
2. Check HACS downloaded the files: `/config/custom_components/hide_n_seek/`
3. Check Home Assistant logs for errors
4. Try reinstalling via HACS

### Frontend Not Loading

If the panel loads but shows errors:

1. Check that `/config/custom_components/hide_n_seek/frontend/dist/` exists
2. Check file permissions
3. Look for errors in browser console (F12)
4. Check Home Assistant logs for "hide_n_seek" errors

### Getting Help

- [GitHub Issues](https://github.com/BenJaminBMorin/hide-n-seek/issues)
- [Setup Guide](SETUP_GUIDE.md)
- [Development Guide](DEVELOPMENT.md)
- [Home Assistant Community](https://community.home-assistant.io/)

## Uninstalling

If you need to uninstall:

1. Go to **Settings** → **Devices & Services**
2. Find **Hide-n-Seek Presence Tracker**
3. Click the **three dots (⋮)** → **Delete**
4. Go to **HACS** → **Integrations**
5. Find **Hide-n-Seek** → Click **three dots (⋮)** → **Remove**
6. Restart Home Assistant

## Benefits of HACS Installation

- ✅ **Automatic Updates**: Get notified when new versions are available
- ✅ **Easy Installation**: No manual file copying
- ✅ **No Build Required**: Frontend is pre-built
- ✅ **Integrated Experience**: Everything runs inside Home Assistant
- ✅ **One-Click Updates**: Update with a single click
- ✅ **Rollback Support**: Can revert to previous versions if needed
