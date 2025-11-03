# SiYuan GitHub Publish Plugin

[中文版](./README_zh_CN.md)

## 1. Project Introduction

A powerful SiYuan note plugin that allows you to publish your notes to GitHub repositories. Notes and images are stored in the same directory, making it perfect for GitHub Pages blogs or documentation sites.

### ✨ Features

- **One-click Publishing**: Publish notes to GitHub with a single click
- **Image Processing**: Automatically processes and uploads images to the same directory as notes
- **Same Directory Storage**: Notes and images are stored together for easy management
- **Front Matter Support**: Custom YAML front matter with placeholders
- **Custom Domain**: Support for GitHub Pages custom domains
- **Publish History**: Track and manage published notes
- **Connection Testing**: Built-in GitHub connection validation
- **Multi-language Support**: English and Chinese interfaces

## 2. Configuration

### GitHub Settings

Before publishing, configure your GitHub settings in the plugin settings panel:

1. **GitHub Username**: Your GitHub username
2. **Access Token**: GitHub Personal Access Token with `repo` scope
   - Create at: https://github.com/settings/tokens
3. **Repository**: Format: `username/repository-name`
4. **Branch**: Default: `main`
5. **Base Path**: Storage path (e.g., `content/posts`)
6. **Custom Domain**: Your GitHub Pages custom domain (optional)
7. **Front Matter**: YAML front matter template (optional)

### Front Matter Template

Use placeholders in your front matter template:
- `<TITLE>`: Replaced with note title
- `<DATE>`: Replaced with current date (YYYY-MM-DD)

Example:
```yaml
---
title: <TITLE>
date: <DATE>
author: Your Name
categories:
  - Notes
---
```

## 3. Usage

### Publishing a Note

1. Open the note you want to publish in SiYuan
2. Click the GitHub icon in the top toolbar
3. Select "Publish Current Note"
4. Enter the upload directory name
5. Review the front matter (if configured)
6. Click "Publish"

### Managing Published Notes

- **View Published Notes**: Click the GitHub icon to see publishing history
- **Open in GitHub**: Click on the markdown URL to open in browser
- **Delete Published Content**: Use the "Delete Publish" option to remove from GitHub

## 4. File Structure

When published, each note creates a directory structure like this:
```
content/posts/
└── note-title/
    ├── index.md          # Your note content
    ├── image1.png        # Embedded images
    ├── image2.jpg        # Embedded images
    └── ...               # Other assets
```

All files are stored in the same directory, making it easy to manage and perfect for static site generators like Jekyll, Hugo, or GitHub Pages.

## 5. Development Guide

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [pnpm](https://pnpm.io/) package manager
- SiYuan Note v3.2.1 or higher

### Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourname/siyuan-github-publish-plugin.git
   cd siyuan-github-publish-plugin
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Create symbolic link to SiYuan plugins directory**
   ```bash
   pnpm run make-link
   ```

4. **Start development mode**
   ```bash
   pnpm run dev
   ```

5. **Enable the plugin in SiYuan**
   - Open SiYuan Note
   - Go to Settings → Community Marketplace → Downloaded
   - Enable "GitHub Publish Plugin"

### Project Structure

```
src/
├── index.ts          # Main plugin class
├── libs/
│   ├── github-api.ts # GitHub API wrapper
│   ├── settings.ts   # Settings management
│   ├── content-processor.ts # Markdown content processing
│   └── dialog.ts     # Dialog utilities
├── types/
│   └── github.d.ts   # TypeScript definitions
└── index.scss        # Styles
```

### Build Commands

```bash
# Development mode with hot reload
pnpm run dev

# Production build
pnpm run build

# Create symbolic link
pnpm run make-link

# Create install package
pnpm run make-install

# Update version
pnpm run update-version
```

## 6. FAQ

### Common Issues

1. **Authentication Failed**
   - Ensure your GitHub Access Token has `repo` scope
   - Check if the token is expired

2. **Repository Not Found**
   - Verify repository format: `username/repo-name`
   - Ensure you have write access to the repository

3. **Branch Not Found**
   - Check if the branch exists in your repository
   - Default branch is usually `main` or `master`

4. **Image Upload Failed**
   - Check network connection
   - Verify repository permissions

**Note**: This plugin requires a GitHub Personal Access Token with repository write permissions. Never share your token publicly.
