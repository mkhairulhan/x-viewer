# Siftstrym

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](#)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](#)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](#)

A powerful, blazingly fast, and privacy-centric React dashboard designed to help you interactively visualize, filter, and search through your massive X (formerly Twitter) bookmarks metadata archive locally.

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Privacy & Data Security](#privacy--data-security)
- [Getting Started](#getting-started)
  - [Cloud Hosted (Vercel)](#cloud-hosted-vercel)
  - [Local Installation](#local-installation)
- [Support](#support)
- [Contributions](#contributions)
- [License](#license)

## Features
- **Local MapReduce Engine:** Parses massive JSON datasets efficiently using background Web Workers without locking the UI.
- **Virtualized High-Performance Feeds:** Pinterest-like staggered masonry galleries and structural grid models powered by `react-virtuoso` and `masonic`.
- **Advanced Metadata Extraction:** Extracts engagement ratio insights, creation latency, media availability health checks, and global geolocation telemetry entirely offline.
- **Deep Reactivity:** State management is fully decoupled via Zustand for hyper-fast view toggles.

## Screenshots

> *You can manually add or replace images of the tool here.*

![Dashboard Example](https://via.placeholder.com/800x450.png?text=Dashboard+Screenshot+Placeholder)
*Above: Replace this placeholder with an actual 16:9 screenshot of the Insights or Feed view.*

![Feed Layout](https://via.placeholder.com/800x450.png?text=Feed+Screenshot+Placeholder)
*Above: Replace this placeholder with an actual screenshot of the Masonry or Grid Feed.*

## Privacy & Data Security

🔒 **Zero Data Collection Policy**

Whether you clone this repository locally or use my official **Cloud Hosted (Vercel)** instance, **Siftstrym NEVER collects, tracks, monitors, or transmits your data**. 
Your exported bookmarks JSON file is parsed 100% locally within your own browser's memory using modern background Web Workers. Not a single byte of your data or personal information ever leaves your machine, preventing any potential privacy nightmares. 

Since Siftstrym is totally open-source, you are completely free to inspect and audit the source code yourself for 100% worry-free peace of mind!

## Getting Started

You have two versatile options to get started using Siftstrym depending on your technical knowledge.

### Cloud Hosted (Vercel)
If you don't want to deal with Node.js and simply want to drop your `bookmarks.json` file into the app right away, you can use the officially hosted Vercel instance fearlessly.

👉 **[Link to Vercel Application](https://siftstrym.vercel.app)** *(Note: Add the real hosted link here!)*

### Local Installation
Since this application deals with your private bookmarks, running it locally is deeply integrated and supported!

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mkhairulhan/siftstrym.git
   cd siftstrym
   ```

2. **Install Dependencies:**
   Make sure you have Node > 18.x installed on your operating system.
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   Once Vite begins running, open your web browser and navigate to `http://localhost:5173`. Drop your data files directly into the UI!

## Support

If this tool has saved you time tracking down your lost bookmarks or you just love the deep analytics dashboards, consider supporting its infrastructure and development! ☕

<a href="https://buymeacoffee.com/mkhairulhan" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

## Contributions

At the moment, **I am not open for project contributions or pull requests**. I am actively maintaining the architecture and dependencies solely myself right now. 

However, I will definitely keep the idea of making it open source to community improvements open in the future once the baseline reaches v1.0. Feel free to fork it for your personal setups in the meantime!

## License

This project is open-sourced and legally covered under the **[MIT License](LICENSE)**.
